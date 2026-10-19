package com.example.telugubible.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
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

        // 2nd successful review (score = 4)
        userDbHelper.gradeUserVerse(verse.id, score = 4)
        verse = userDbHelper.getUserVerses().first()
        assertEquals(2, verse.repetition)
        assertEquals(6, verse.interval)

        // Lapse / failure review (score = 1)
        userDbHelper.gradeUserVerse(verse.id, score = 1)
        verse = userDbHelper.getUserVerses().first()
        assertEquals("Repetition resets to 0 on lapse", 0, verse.repetition)
        assertEquals("Interval resets to 1 on lapse", 1, verse.interval)
        assertEquals("Lapses incremented", 1, verse.lapses)
        assertEquals(6, verse.preLapseInterval)

        // Subsequent reviews leading to memorized status (rep >= 5)
        for (i in 1..5) {
            userDbHelper.gradeUserVerse(verse.id, score = 5)
        }
        verse = userDbHelper.getUserVerses().first()
        assertEquals(5, verse.repetition)
        assertEquals("memorized", verse.status)
        assertTrue("Interval should have grown exponentially", verse.interval >= 10)
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

        // Set scale to 0.70 (30% shorter)
        userDbHelper.updateIntervalScale(0.70)
        assertEquals(0.70, userDbHelper.getAppSettings().intervalScale, 0.001)

        // Rep 1 -> interval 1
        userDbHelper.gradeUserVerse(verse.id, score = 5)
        // Rep 2 -> interval 6
        userDbHelper.gradeUserVerse(verse.id, score = 5)
        // Rep 3 -> interval = 6 * efactor * 0.70 < 6 * 2.6
        userDbHelper.gradeUserVerse(verse.id, score = 5)

        val updated = userDbHelper.getUserVerses().first()
        assertTrue("Interval should be scaled shorter", updated.interval < 16)
    }
}
