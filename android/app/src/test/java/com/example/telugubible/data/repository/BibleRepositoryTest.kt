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
        bibleDbHelper.close()
        userDbHelper.close()
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
        assertEquals("GEN", v.bookKey)
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
}
