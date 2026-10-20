package com.example.telugubible.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.Topic
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class UserDatabaseHelperTest {

    private lateinit var context: Context
    private lateinit var userDbHelper: UserDatabaseHelper

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        // Clean any existing test databases
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase("bible.db")
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        val prefs = context.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()

        userDbHelper = UserDatabaseHelper(context)
    }

    @After
    fun tearDown() {
        userDbHelper.close()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase("bible.db")
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
    }

    @Test
    fun testAddAndRetrieveUserVerse() {
        val success = userDbHelper.addUserVerse(bookId = 1, chapter = 1, verse = 1)
        assertTrue("Adding verse should succeed", success)

        val verses = userDbHelper.getUserVerses()
        assertEquals(1, verses.size)
        val verse = verses[0]
        assertEquals(1, verse.bookId)
        assertEquals(1, verse.chapter)
        assertEquals(1, verse.verse)
        assertEquals("learning", verse.status)
        assertEquals(0, verse.repetition)
        assertEquals(0, verse.interval)
        assertEquals(2.5, verse.efactor, 0.001)
        assertEquals(0, verse.lapses)
    }

    @Test
    fun testDuplicateVerseIgnored() {
        val first = userDbHelper.addUserVerse(bookId = 43, chapter = 3, verse = 16)
        assertTrue(first)

        val second = userDbHelper.addUserVerse(bookId = 43, chapter = 3, verse = 16)
        assertFalse("Duplicate insertion should be rejected by CONFLICT_IGNORE", second)

        val list = userDbHelper.getUserVerses()
        assertEquals(1, list.size)
    }

    @Test
    fun testBatchAddVerses() {
        val batch = listOf(
            Triple(19, 23, 1),
            Triple(19, 23, 2),
            Triple(19, 23, 3)
        )
        val count = userDbHelper.addUserVerses(batch)
        assertEquals(3, count)

        val verses = userDbHelper.getUserVerses()
        assertEquals(3, verses.size)
    }

    @Test
    fun testRemoveUserVerse() {
        userDbHelper.addUserVerse(1, 1, 1)
        val list = userDbHelper.getUserVerses()
        assertEquals(1, list.size)

        userDbHelper.removeUserVerse(list[0].id)
        val after = userDbHelper.getUserVerses()
        assertTrue("List should be empty after removal", after.isEmpty())
    }

    @Test
    fun testSm2GradingWorkflow() {
        userDbHelper.addUserVerse(19, 119, 105)
        var verse = userDbHelper.getUserVerses().first()

        // 1st successful review (score = 4)
        userDbHelper.gradeUserVerse(verse.id, score = 4)
        verse = userDbHelper.getUserVerses().first()
        assertEquals(1, verse.repetition)
        assertEquals(1, verse.interval)
        assertEquals("learning", verse.status)

        // 2nd successful review (score = 4) -> verse profile secondInterval is 4
        userDbHelper.gradeUserVerse(verse.id, score = 4)
        verse = userDbHelper.getUserVerses().first()
        assertEquals(2, verse.repetition)
        assertEquals(4, verse.interval)

        // Lapse / failure review on immature verse (interval 4 <= matureInterval 30)
        userDbHelper.gradeUserVerse(verse.id, score = 1)
        verse = userDbHelper.getUserVerses().first()
        assertEquals("Repetition resets to 0 on lapse", 0, verse.repetition)
        assertEquals("Interval resets to 1 on lapse", 1, verse.interval)
        assertEquals("Immature verse has 0 mature lapses", 0, verse.lapses)
        assertEquals(0, verse.preLapseInterval)

        // Subsequent reviews leading to memorized status (rep >= 5)
        for (i in 1..5) {
            userDbHelper.gradeUserVerse(verse.id, score = 5)
        }
        verse = userDbHelper.getUserVerses().first()
        assertEquals(5, verse.repetition)
        assertEquals("memorized", verse.status)
        assertTrue("Interval should have grown", verse.interval >= 10)
    }

    @Test
    fun testStreakPersistence() {
        assertEquals(14, userDbHelper.getStreak())

        userDbHelper.setStreak(42)
        assertEquals(42, userDbHelper.getStreak())
    }

    @Test
    fun testSessionStatePersistence() {
        assertNull(userDbHelper.getSessionState("active_card_index"))

        userDbHelper.setSessionState("active_card_index", "8")
        assertEquals("8", userDbHelper.getSessionState("active_card_index"))

        userDbHelper.setSessionState("active_card_index", null)
        assertNull(userDbHelper.getSessionState("active_card_index"))
    }

    @Test
    fun testMigrationFromLegacyBibleDb() {
        userDbHelper.close()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        val prefs = context.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()

        // Create a mock legacy bible.db
        val legacyDbFile = context.getDatabasePath("bible.db")
        legacyDbFile.parentFile?.mkdirs()
        val legacyDb = SQLiteDatabase.openOrCreateDatabase(legacyDbFile, null)
        legacyDb.execSQL(
            """
            CREATE TABLE user_verses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                chapter INTEGER NOT NULL,
                verse INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'learning',
                repetition INTEGER NOT NULL DEFAULT 0,
                interval INTEGER NOT NULL DEFAULT 0,
                efactor REAL NOT NULL DEFAULT 2.5,
                next_due_date INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );
            """.trimIndent()
        )
        legacyDb.execSQL("CREATE TABLE user_stats (key TEXT PRIMARY KEY, val TEXT);")

        // Insert legacy user data
        val v = ContentValues().apply {
            put("book_id", 40)
            put("chapter", 6)
            put("verse", 33)
            put("status", "memorized")
            put("repetition", 6)
            put("interval", 25)
            put("efactor", 2.6)
            put("next_due_date", 1700000000000L)
            put("created_at", 1690000000000L)
        }
        legacyDb.insert("user_verses", null, v)

        val s = ContentValues().apply {
            put("key", "streak")
            put("val", "99")
        }
        legacyDb.insert("user_stats", null, s)
        legacyDb.close()

        // Now initialize UserDatabaseHelper, which should automatically detect and migrate legacy data
        val newHelper = UserDatabaseHelper(context)
        val migratedVerses = newHelper.getUserVerses()
        assertEquals(1, migratedVerses.size)
        val migrated = migratedVerses[0]
        assertEquals(40, migrated.bookId)
        assertEquals(6, migrated.chapter)
        assertEquals(33, migrated.verse)
        assertEquals("memorized", migrated.status)
        assertEquals(6, migrated.repetition)
        assertEquals(25, migrated.interval)

        assertEquals(99, newHelper.getStreak())
        newHelper.close()
    }

    @Test
    fun testReviewLogAndRetentionPersistence() {
        userDbHelper.addUserVerse(1, 1, 1)
        val verse = userDbHelper.getUserVerses().first()

        userDbHelper.gradeUserVerse(verse.id, score = 4, cueLevel = 0, mode = "typing", measuredAccuracy = 0.95)
        userDbHelper.gradeChapterAnchor(bookId = 1, chapter = 1, score = 5)

        val log = userDbHelper.getReviewLog()
        assertEquals(2, log.size)

        val verseEntry = log[0]
        assertEquals("verse", verseEntry.itemKind)
        assertEquals(verse.id.toString(), verseEntry.itemId)
        assertEquals(4, verseEntry.score)
        assertEquals(0, verseEntry.cueLevel)
        assertEquals("typing", verseEntry.mode)
        assertNotNull(verseEntry.measuredAccuracy)
        assertEquals(0.95, verseEntry.measuredAccuracy!!, 0.001)

        val anchorEntry = log[1]
        assertEquals("anchor", anchorEntry.itemKind)
        assertEquals("1:1", anchorEntry.itemId)
        assertEquals(5, anchorEntry.score)
    }

    @Test
    fun testColdChecksPersistence() {
        assertNull(userDbHelper.getLastColdCheck())

        userDbHelper.recordColdCheck(correct = 4, total = 5, medianColdFor = 42)
        val last = userDbHelper.getLastColdCheck()
        assertNotNull(last)
        assertEquals(4, last?.correct)
        assertEquals(5, last?.total)
        assertEquals(42, last?.medianColdFor)
    }

    @Test
    fun testIntervalScaleAffectsGrading() {
        userDbHelper.addUserVerse(19, 23, 1)
        val verse = userDbHelper.getUserVerses().first()

        // Set scale to 0.50 (50% shorter)
        userDbHelper.updateIntervalScale(0.50)
        assertEquals(0.50, userDbHelper.getAppSettings().intervalScale, 0.001)

        val beforeTime = System.currentTimeMillis()
        userDbHelper.gradeUserVerse(verse.id, score = 5) // rep 1 -> interval 1
        userDbHelper.gradeUserVerse(verse.id, score = 5) // rep 2 -> interval 4 (verse profile secondInterval)

        val updated = userDbHelper.getUserVerses().first()
        assertEquals(2, updated.repetition)
        assertEquals(4, updated.interval) // Uncompounded base interval

        // The nextDueDate should reflect 0.50 scale: (4 ± 1) * 0.50 -> <= 3 days
        val dueDiffDays = ((updated.nextDueDate - beforeTime) / (24L * 60L * 60L * 1000L)).toInt()
        assertTrue("Days until due should be scaled shorter (1..3 days)", dueDiffDays in 1..3)
    }

    @Test
    fun testPruneReviewLog() {
        val db = userDbHelper.writableDatabase
        db.beginTransaction()
        try {
            val now = System.currentTimeMillis()
            for (i in 1..4050) {
                val cv = ContentValues().apply {
                    put("verse_id", 1)
                    put("score", 4)
                    put("review_date", now + i)
                    put("prev_interval", 1)
                    put("new_interval", 4)
                    put("prev_efactor", 2.5)
                    put("new_efactor", 2.6)
                    put("item_kind", "verse")
                    put("item_id", "1")
                    put("cue_level", 0)
                    put("mode", "reveal")
                }
                db.insert("review_log", null, cv)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }

        // Trigger prune by grading an item
        userDbHelper.addUserVerse(1, 1, 1)
        val v = userDbHelper.getUserVerses().first()
        userDbHelper.gradeUserVerse(v.id, score = 4)

        val log = userDbHelper.getReviewLog()
        assertTrue("Log should be capped at 4000 items", log.size <= 4000)
    }

    @Test
    fun testUpgradedSM2MultiKindAndLapseRecovery() {
        // Test anchor grading
        val a1 = userDbHelper.gradeChapterAnchor(bookId = 1, chapter = 1, score = 4)
        assertEquals(1, a1.repetition)
        assertEquals(1, a1.interval)

        // Second success on anchor gets secondInterval = 8 (not flat 6)
        val a2 = userDbHelper.gradeChapterAnchor(bookId = 1, chapter = 1, score = 4)
        assertEquals(2, a2.repetition)
        assertEquals(8, a2.interval)

        // Test theme grading: secondInterval = 10
        val t1 = userDbHelper.gradeThemeProgress(bookId = 1, score = 4)
        assertEquals(1, t1.repetition)
        assertEquals(1, t1.interval)

        val t2 = userDbHelper.gradeThemeProgress(bookId = 1, score = 4)
        assertEquals(2, t2.repetition)
        assertEquals(10, t2.interval)
    }

    @Test
    fun testCreateAndRenameTopic() {
        val topic = userDbHelper.getOrCreateTopic("Anxiety")
        assertNotNull(topic.id)
        assertEquals("Anxiety", topic.name)

        // Calling getOrCreateTopic again with different casing returns existing
        val sameTopic = userDbHelper.getOrCreateTopic("anxiety")
        assertEquals(topic.id, sameTopic.id)

        // Rename
        val renamed = userDbHelper.renameTopic(topic.id, "Peace & Calm")
        assertTrue(renamed)

        val allTopics = userDbHelper.getAllTopics()
        assertEquals(1, allTopics.size)
        assertEquals("Peace & Calm", allTopics[0].name)
    }

    @Test
    fun testToggleVerseTopicAndExclusiveDeletion() {
        val topic1 = userDbHelper.getOrCreateTopic("Peace")
        val topic2 = userDbHelper.getOrCreateTopic("Faith")

        // Add verse 1 and verse 2
        userDbHelper.addUserVerse(1, 1, 1) // Genesis 1:1
        userDbHelper.addUserVerse(1, 1, 2) // Genesis 1:2
        val verses = userDbHelper.getUserVerses()
        val v1 = verses.first { it.verse == 1 }
        val v2 = verses.first { it.verse == 2 }

        // Tag v1 with topic1 only
        val v1Tagged = userDbHelper.toggleVerseTopic(v1.id, topic1.id)
        assertTrue("v1 should now be tagged with topic1", v1Tagged)

        // Tag v2 with topic1 AND topic2
        userDbHelper.toggleVerseTopic(v2.id, topic1.id)
        userDbHelper.toggleVerseTopic(v2.id, topic2.id)

        // Verify initial mappings
        val mappingBefore = userDbHelper.getAllVerseTopicMappings()
        assertEquals(listOf(topic1.id), mappingBefore[v1.id])
        assertTrue(mappingBefore[v2.id]?.contains(topic1.id) == true)
        assertTrue(mappingBefore[v2.id]?.contains(topic2.id) == true)

        // Delete topic1 ("Peace")
        // Rule: v1 belongs EXCLUSIVELY to topic1 -> v1 must be deleted from user_verses!
        // v2 has topic2 as well -> v2 is KEPT, but topic1 is removed from it.
        val deleted = userDbHelper.deleteTopic(topic1.id)
        assertTrue(deleted)

        val versesAfter = userDbHelper.getUserVerses()
        assertEquals("Only v2 should remain in library", 1, versesAfter.size)
        assertEquals(v2.id, versesAfter[0].id)

        val mappingAfter = userDbHelper.getAllVerseTopicMappings()
        assertEquals(listOf(topic2.id), mappingAfter[v2.id])
        assertNull(mappingAfter[v1.id])
    }

    @Test
    fun testTagVersesWithTopic() {
        val topic = userDbHelper.getOrCreateTopic("Top 100")
        val verses = listOf(
            Triple(1, 1, 1),
            Triple(1, 1, 2),
            Triple(1, 1, 3)
        )
        userDbHelper.addUserVerses(verses)
        userDbHelper.tagVersesWithTopic(verses, topic.id)

        val allVerses = userDbHelper.getUserVerses()
        assertEquals(3, allVerses.size)
        for (v in allVerses) {
            val tIds = userDbHelper.getTopicIdsForVerse(v.id)
            assertTrue("Verse ${v.verse} should have topic id", tIds.contains(topic.id))
        }
    }

    @Test
    fun testJsonExportAndRestoreIncludesTopics() {
        val topic = userDbHelper.getOrCreateTopic("Promises")
        userDbHelper.addUserVerse(1, 1, 1)
        val v = userDbHelper.getUserVerses().first()
        userDbHelper.tagVerse(v.id, topic.id)

        val json = userDbHelper.exportUserDataJson()
        assertTrue(json.contains("Promises"))
        assertTrue(json.contains("topics"))
        assertTrue(json.contains("verseTopics"))

        // Clear everything
        userDbHelper.clearAllUserData()
        assertTrue(userDbHelper.getAllTopics().isEmpty())
        assertTrue(userDbHelper.getUserVerses().isEmpty())

        // Restore
        val restored = userDbHelper.restoreUserDataJson(json)
        assertTrue(restored)

        val topicsRestored = userDbHelper.getAllTopics()
        assertEquals(1, topicsRestored.size)
        assertEquals("Promises", topicsRestored[0].name)

        val versesRestored = userDbHelper.getUserVerses()
        assertEquals(1, versesRestored.size)
        val mappings = userDbHelper.getAllVerseTopicMappings()
        assertEquals(listOf(topic.id), mappings[versesRestored[0].id])
    }

    @Test
    fun testBlockProgressAndChainPass() {
        val bookId = 1
        val blockIndex = 0
        val label = "Creation to Flood"
        val results = listOf(
            Pair(1, true),
            Pair(2, true),
            Pair(3, false),
            Pair(4, true)
        )

        // Grade block chain: 3/4 correct = 75% -> score 3
        val entity = userDbHelper.gradeBlockChain(bookId, blockIndex, label, results)
        assertEquals(bookId, entity.bookId)
        assertEquals(blockIndex, entity.blockIndex)
        assertEquals(label, entity.label)
        assertEquals(1, entity.attempts)
        assertEquals(3, entity.lastScore)
        assertEquals(0.75, entity.lastAccuracy, 0.001)

        val retrieved = userDbHelper.getBlockProgress(bookId)
        assertEquals(1, retrieved.size)
        val saved = retrieved[blockIndex]
        assertNotNull(saved)
        assertEquals(1, saved?.attempts)
        assertEquals(3, saved?.lastScore)

        // gradeBlockChain automatically records chain_hits and chain_misses
        val ch1Prog = userDbHelper.getChapterProgress(bookId)[1]
        assertNotNull(ch1Prog)
        assertEquals(1, ch1Prog?.chainHits)
        assertEquals(0, ch1Prog?.chainMisses)

        val ch3Prog = userDbHelper.getChapterProgress(bookId)[3]
        assertNotNull(ch3Prog)
        assertEquals(0, ch3Prog?.chainHits)
        assertEquals(1, ch3Prog?.chainMisses)

        // Additional chain pass increments hits/misses
        userDbHelper.recordChainPass(bookId, results)
        val ch1ProgSecond = userDbHelper.getChapterProgress(bookId)[1]
        assertEquals(2, ch1ProgSecond?.chainHits)
    }

    @Test
    fun testBlockProgressJsonExportAndRestore() {
        val bookId = 43
        val blockIndex = 1
        val label = "Signs & Glory"
        val results = listOf(Pair(1, true), Pair(2, true))
        userDbHelper.gradeBlockChain(bookId, blockIndex, label, results)

        val json = userDbHelper.exportUserDataJson()
        assertTrue(json.contains("blockProgress"))
        assertTrue(json.contains("Signs & Glory"))

        userDbHelper.clearAllUserData()
        assertTrue(userDbHelper.getAllBlockProgress().isEmpty())

        val restored = userDbHelper.restoreUserDataJson(json)
        assertTrue(restored)

        val restoredBlocks = userDbHelper.getBlockProgress(bookId)
        assertEquals(1, restoredBlocks.size)
        val block = restoredBlocks[blockIndex]
        assertNotNull(block)
        assertEquals("Signs & Glory", block?.label)
        assertEquals(5, block?.lastScore)
        assertEquals(1.0, block?.lastAccuracy ?: 0.0, 0.001)
    }
}

