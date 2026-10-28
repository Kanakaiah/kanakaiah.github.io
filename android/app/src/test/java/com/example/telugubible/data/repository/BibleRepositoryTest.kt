package com.example.telugubible.data.repository

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class BibleRepositoryTest {

    private lateinit var context: Context
    private lateinit var repository: BibleRepository
    private lateinit var bibleDbHelper: BibleDatabaseHelper
    private lateinit var userDbHelper: UserDatabaseHelper

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        val prefs = context.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()

        bibleDbHelper = BibleDatabaseHelper(context)
        userDbHelper = UserDatabaseHelper(context)
        repository = BibleRepository(bibleDbHelper, userDbHelper)
    }

    @After
    fun tearDown() {
        if (::bibleDbHelper.isInitialized) bibleDbHelper.close()
        if (::userDbHelper.isInitialized) userDbHelper.close()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
    }

    @Test
    fun testRepositoryUserVerseLifecycle() = runTest {
        // Initially empty
        val initialVerses = repository.getUserMemoryVerses()
        assertTrue(initialVerses.isEmpty())

        // Add Genesis 1:1 (book_id = 1, chapter = 1, verse = 1)
        val added = repository.addUserVerse(1, 1, 1)
        assertTrue(added)

        val memoryVerses = repository.getUserMemoryVerses()
        assertEquals(1, memoryVerses.size)
        val v = memoryVerses[0]
        assertEquals(1, v.bookId)
        assertEquals("genesis", v.bookKey)
        assertEquals("Genesis", v.bookNameEn)
        assertEquals("ఆదికాండము", v.bookNameTe)
        assertEquals(1, v.chapter)
        assertEquals(1, v.verse)
        assertEquals("learning", v.status)
        assertNotNull("English text should be loaded from static db", v.textEn)
        assertNotNull("Telugu text should be loaded from static db", v.textTe)

        // Grade verse (score = 4)
        repository.gradeUserVerse(v.id, 4)
        val updated = repository.getUserMemoryVerses().first()
        assertEquals(1, updated.repetition)
        assertEquals(1, updated.interval)

        // Streak
        assertEquals(14, repository.getStreak())
        repository.setStreak(25)
        assertEquals(25, repository.getStreak())

        // Session state
        assertNull(repository.getSessionState("active_index"))
        repository.setSessionState("active_index", "3")
        assertEquals("3", repository.getSessionState("active_index"))

        // Remove verse
        repository.removeUserVerse(v.id)
        assertTrue(repository.getUserMemoryVerses().isEmpty())
    }

    @Test
    fun testAddPresetCollection() = runTest {
        val collections = repository.getPresetCollections()
        assertTrue("Preset collections should not be empty", collections.isNotEmpty())

        val top100 = collections.find { it.id == "top100" } ?: collections.first()
        val inserted = repository.addPresetCollection(top100.id)
        assertTrue("Should have inserted preset verses", inserted > 0)

        val memoryVerses = repository.getUserMemoryVerses()
        assertEquals(inserted, memoryVerses.size)
        // Ensure book and verse texts are resolved
        val first = memoryVerses.first()
        assertTrue(first.bookNameEn.isNotEmpty())
    }

    @Test
    fun testLoadBookGuideAndAnchors() = runTest {
        // Test Genesis (bookId = 1)
        val genesisGuide = repository.getBookGuide(1)
        assertNotNull("Genesis guide should exist in SQLite", genesisGuide)
        assertEquals("genesis", genesisGuide?.bookKey)
        assertEquals("Where Everything Began and Everything Broke", genesisGuide?.subtitle)
        assertEquals("11 → 14 → 11 → 14", genesisGuide?.structureFormula)
        assertNotNull(genesisGuide?.memorySentence)
        assertTrue(genesisGuide!!.memorySentence!!.contains("LIGHT"))

        // Blocks
        assertEquals(4, genesisGuide.blocks.size)
        assertEquals("PRIMEVAL", genesisGuide.blocks[0].label)

        // Key Verses
        assertTrue(genesisGuide.keyVerses.isNotEmpty())
        assertEquals("Genesis 1:1", genesisGuide.keyVerses[0].ref)

        // Anchors
        assertEquals(50, genesisGuide.anchors.size)
        val ch1Anchor = genesisGuide.anchors[0]
        assertEquals(1, ch1Anchor.chapter)
        assertEquals("LIGHT", ch1Anchor.word)
        assertNull("First anchor has no previous word", ch1Anchor.prevWord)
        assertEquals("GARDEN", ch1Anchor.nextWord)

        // Test Matthew (bookId = 40)
        val matthewGuide = repository.getBookGuide(40)
        assertNotNull("Matthew guide should exist", matthewGuide)
        assertEquals("matthew", matthewGuide?.bookKey)
        assertEquals(28, matthewGuide?.anchors?.size)
    }

    @Test
    fun testChapterAnchorProgressAndGrading() = runTest {
        val initialProgress = repository.getChapterProgress(1)
        assertTrue("Initially no chapter progress", initialProgress.isEmpty())

        // Grade chapter 1 with score 4 (Good)
        val graded = repository.gradeChapterAnchor(1, 1, 4)
        assertEquals(1, graded.bookId)
        assertEquals(1, graded.chapter)
        assertEquals(1, graded.repetition)
        assertEquals(1, graded.interval)
        assertTrue(graded.nextDueDate > System.currentTimeMillis())

        val fetchedProgress = repository.getChapterProgress(1)
        assertEquals(1, fetchedProgress.size)
        assertEquals(1, fetchedProgress[1]?.interval)

        // Grade chapter 1 again with score 5 (Easy) -> repetition becomes 2, interval becomes 8 (anchor profile)
        val secondGrade = repository.gradeChapterAnchor(1, 1, 5)
        assertEquals(2, secondGrade.repetition)
        assertEquals(8, secondGrade.interval)
    }

    @Test
    fun testCrossReferencesQuerying() = runTest {
        // Query OpenBible cross-references for Genesis 1:1 (bookId = 1, chapter = 1, verse = 1, minVotes = 4)
        val crossRefs = repository.getCrossReferences(1, 1, 1)
        assertTrue("Genesis 1:1 should have cross-references", crossRefs.isNotEmpty())
        assertEquals(61, crossRefs.size)

        val first = crossRefs[0]
        assertEquals(1, first.fromBookId)
        assertEquals(1, first.fromChapter)
        assertEquals(1, first.fromVerse)
        assertEquals("Exodus 20:11", first.toRef)
        assertEquals(2, first.toBookId) // Exodus is book 2
        assertEquals(20, first.toChapter)
        assertEquals(11, first.toVerse)
        assertNotNull("Target verse text in English should be populated", first.targetTextEn)

        val count = repository.getCrossReferenceCount(1, 1, 1)
        assertEquals(crossRefs.size, count)

        val chapterCounts = repository.getCrossReferenceCountsForChapter(1, 1)
        assertTrue("Chapter counts should have entry for verse 1", chapterCounts.containsKey(1))
        assertEquals(61, chapterCounts[1])

        // Verify Exodus 35:30 bidirectional connections + STEPBible original words
        val exod35_30 = repository.getVerseConnections(2, 35, 30, minVotes = 4)
        assertEquals(1, exod35_30.outgoing.size)
        assertEquals(4, exod35_30.incoming.size)
        assertEquals(4, exod35_30.originalWords.size)
        assertEquals("אוּרִי", exod35_30.originalWords[0].lemma)
        assertEquals("H1212G", exod35_30.originalWords[1].strongs)
        assertEquals("Bezalel", exod35_30.originalWords[1].gloss)

        val exod35_30AllVotes = repository.getVerseConnections(2, 35, 30, minVotes = 0)
        assertEquals(7, exod35_30AllVotes.outgoing.size)
        assertEquals(9, exod35_30AllVotes.incoming.size)
        assertTrue(exod35_30AllVotes.incoming.any { it.landingNote == "to Exodus 35:30–35" })
    }

    @Test
    fun testOtQuotes() = runTest {
        // Matthew 1:23 quotes Isaiah 7:14
        assertTrue("Matthew 1:23 should be an OT quote", repository.isOtQuote(40, 1, 23))
        org.junit.Assert.assertFalse("Matthew 1:1 is not an OT quote", repository.isOtQuote(40, 1, 1))

        // Matthew 2 quotes in verses 6, 15, 18, 23
        val ch2Quotes = repository.getOtQuotesForChapter(40, 2)
        assertEquals(4, ch2Quotes.size)
        assertTrue(ch2Quotes.contains(6))
        assertTrue(ch2Quotes.contains(15))
        assertTrue(ch2Quotes.contains(18))
        assertTrue(ch2Quotes.contains(23))
    }

    @Test
    fun testBookMastery() = runTest {
        // Initially Genesis has 50 chapters, all untouched
        val initialMastery = repository.getBookMastery(1)
        assertEquals(1, initialMastery.bookId)
        assertEquals(50, initialMastery.total)
        assertEquals(50, initialMastery.untouched)
        assertEquals(0, initialMastery.seen)
        assertEquals(0, initialMastery.learning)
        assertEquals(0, initialMastery.secure)
        assertEquals(0.0, initialMastery.securePct, 0.001)

        // Grade chapter 1 with score 4 -> learning
        repository.gradeChapterAnchor(1, 1, 4)
        val afterGrade1 = repository.getBookMastery(1)
        assertEquals(49, afterGrade1.untouched)
        assertEquals(1, afterGrade1.learning)

        // All book mastery map contains 66 books
        val allMastery = repository.getAllBookMastery()
        assertEquals(66, allMastery.size)
        assertTrue(allMastery.containsKey(1))
        assertTrue(allMastery.containsKey(66))
    }
}



