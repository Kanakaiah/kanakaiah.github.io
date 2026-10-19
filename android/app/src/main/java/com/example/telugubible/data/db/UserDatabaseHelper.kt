package com.example.telugubible.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.telugubible.data.model.AppSettings
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.roundToInt

data class UserVerseEntity(
    val id: Long,
    val bookId: Int,
    val chapter: Int,
    val verse: Int,
    val status: String,
    val repetition: Int,
    val interval: Int,
    val efactor: Double,
    val nextDueDate: Long,
    val createdAt: Long,
    val lapses: Int = 0,
    val preLapseInterval: Int = 0,
    val attempts: Int = 0
)

data class ChapterProgressEntity(
    val bookId: Int,
    val chapter: Int,
    val status: String,
    val repetition: Int,
    val interval: Int,
    val efactor: Double,
    val nextDueDate: Long
)

class UserDatabaseHelper(private val context: Context) :
    SQLiteOpenHelper(context, USER_DB_NAME, null, USER_DB_VERSION) {

    companion object {
        const val USER_DB_NAME = "user_data.db"
        const val USER_DB_VERSION = 2
        private const val PREFS_NAME = "user_db_prefs"
        private const val KEY_LEGACY_MIGRATED = "legacy_migrated_v1"

        @Volatile
        private var instance: UserDatabaseHelper? = null

        fun getInstance(context: Context): UserDatabaseHelper =
            instance ?: synchronized(this) {
                instance ?: UserDatabaseHelper(context.applicationContext).also { instance = it }
            }
    }

    init {
        migrateFromLegacyDbIfNeeded()
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS user_verses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                chapter INTEGER NOT NULL,
                verse INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'learning',
                repetition INTEGER NOT NULL DEFAULT 0,
                interval INTEGER NOT NULL DEFAULT 0,
                efactor REAL NOT NULL DEFAULT 2.5,
                next_due_date INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                lapses INTEGER NOT NULL DEFAULT 0,
                pre_lapse_interval INTEGER NOT NULL DEFAULT 0,
                attempts INTEGER NOT NULL DEFAULT 0,
                UNIQUE(book_id, chapter, verse)
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS user_stats (
                key TEXT PRIMARY KEY,
                val TEXT
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS session_state (
                key TEXT PRIMARY KEY,
                val TEXT
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS review_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                verse_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                review_date INTEGER NOT NULL,
                prev_interval INTEGER NOT NULL,
                new_interval INTEGER NOT NULL,
                prev_efactor REAL NOT NULL,
                new_efactor REAL NOT NULL
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS chapter_progress (
                book_id INTEGER NOT NULL,
                chapter INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'learning',
                repetition INTEGER NOT NULL DEFAULT 0,
                interval INTEGER NOT NULL DEFAULT 0,
                efactor REAL NOT NULL DEFAULT 2.5,
                next_due_date INTEGER NOT NULL,
                PRIMARY KEY (book_id, chapter)
            );
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS chapter_progress (
                    book_id INTEGER NOT NULL,
                    chapter INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'learning',
                    repetition INTEGER NOT NULL DEFAULT 0,
                    interval INTEGER NOT NULL DEFAULT 0,
                    efactor REAL NOT NULL DEFAULT 2.5,
                    next_due_date INTEGER NOT NULL,
                    PRIMARY KEY (book_id, chapter)
                );
                """.trimIndent()
            )
        }
    }

    private fun migrateFromLegacyDbIfNeeded() {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_LEGACY_MIGRATED, false)) return

        val legacyDbFile = context.getDatabasePath("bible.db")
        if (legacyDbFile.exists() && legacyDbFile.length() > 0) {
            try {
                SQLiteDatabase.openDatabase(legacyDbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY).use { legacyDb ->
                    val tableCursor = legacyDb.rawQuery(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_verses'",
                        null
                    )
                    val hasUserVerses = tableCursor.use { it.moveToNext() }
                    if (hasUserVerses) {
                        val db = writableDatabase
                        db.beginTransaction()
                        try {
                            val cursor = legacyDb.rawQuery(
                                "SELECT book_id, chapter, verse, status, repetition, interval, efactor, next_due_date, created_at FROM user_verses",
                                null
                            )
                            cursor.use {
                                while (it.moveToNext()) {
                                    val values = ContentValues().apply {
                                        put("book_id", it.getInt(0))
                                        put("chapter", it.getInt(1))
                                        put("verse", it.getInt(2))
                                        put("status", it.getString(3))
                                        put("repetition", it.getInt(4))
                                        put("interval", it.getInt(5))
                                        put("efactor", it.getDouble(6))
                                        put("next_due_date", it.getLong(7))
                                        put("created_at", it.getLong(8))
                                    }
                                    db.insertWithOnConflict("user_verses", null, values, SQLiteDatabase.CONFLICT_IGNORE)
                                }
                            }

                            val statsTableCursor = legacyDb.rawQuery(
                                "SELECT name FROM sqlite_master WHERE type='table' AND name='user_stats'",
                                null
                            )
                            val hasStats = statsTableCursor.use { it.moveToNext() }
                            if (hasStats) {
                                val sCursor = legacyDb.rawQuery("SELECT key, val FROM user_stats", null)
                                sCursor.use {
                                    while (it.moveToNext()) {
                                        val values = ContentValues().apply {
                                            put("key", it.getString(0))
                                            put("val", it.getString(1))
                                        }
                                        db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                                    }
                                }
                            }
                            db.setTransactionSuccessful()
                        } finally {
                            db.endTransaction()
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        prefs.edit().putBoolean(KEY_LEGACY_MIGRATED, true).apply()
    }

    fun getUserVerses(): List<UserVerseEntity> {
        val list = mutableListOf<UserVerseEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT id, book_id, chapter, verse, status, repetition, interval, efactor, 
                   next_due_date, created_at, lapses, pre_lapse_interval, attempts
            FROM user_verses
            ORDER BY next_due_date ASC
            """.trimIndent(),
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    UserVerseEntity(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        chapter = it.getInt(2),
                        verse = it.getInt(3),
                        status = it.getString(4),
                        repetition = it.getInt(5),
                        interval = it.getInt(6),
                        efactor = it.getDouble(7),
                        nextDueDate = it.getLong(8),
                        createdAt = it.getLong(9),
                        lapses = if (it.columnCount > 10) it.getInt(10) else 0,
                        preLapseInterval = if (it.columnCount > 11) it.getInt(11) else 0,
                        attempts = if (it.columnCount > 12) it.getInt(12) else 0
                    )
                )
            }
        }
        return list
    }

    fun addUserVerse(bookId: Int, chapter: Int, verse: Int): Boolean {
        val db = writableDatabase
        val now = System.currentTimeMillis()
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("chapter", chapter)
            put("verse", verse)
            put("status", "learning")
            put("repetition", 0)
            put("interval", 0)
            put("efactor", 2.5)
            put("next_due_date", now)
            put("created_at", now)
            put("lapses", 0)
            put("pre_lapse_interval", 0)
            put("attempts", 0)
        }
        val rowId = db.insertWithOnConflict("user_verses", null, values, SQLiteDatabase.CONFLICT_IGNORE)
        return rowId != -1L
    }

    fun addUserVerses(verses: List<Triple<Int, Int, Int>>): Int {
        val db = writableDatabase
        val now = System.currentTimeMillis()
        var insertedCount = 0
        db.beginTransaction()
        try {
            for ((bId, ch, vs) in verses) {
                val values = ContentValues().apply {
                    put("book_id", bId)
                    put("chapter", ch)
                    put("verse", vs)
                    put("status", "learning")
                    put("repetition", 0)
                    put("interval", 0)
                    put("efactor", 2.5)
                    put("next_due_date", now)
                    put("created_at", now)
                    put("lapses", 0)
                    put("pre_lapse_interval", 0)
                    put("attempts", 0)
                }
                val rowId = db.insertWithOnConflict("user_verses", null, values, SQLiteDatabase.CONFLICT_IGNORE)
                if (rowId != -1L) insertedCount++
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return insertedCount
    }

    fun removeUserVerse(id: Long) {
        val db = writableDatabase
        db.delete("user_verses", "id = ?", arrayOf(id.toString()))
    }

    fun gradeUserVerse(id: Long, score: Int) {
        val db = writableDatabase
        val cursor = db.rawQuery(
            "SELECT repetition, interval, efactor, lapses FROM user_verses WHERE id = ?",
            arrayOf(id.toString())
        )
        var rep = 0
        var interval = 0
        var efactor = 2.5
        var lapses = 0

        cursor.use {
            if (it.moveToNext()) {
                rep = it.getInt(0)
                interval = it.getInt(1)
                efactor = it.getDouble(2)
                lapses = if (it.columnCount > 3) it.getInt(3) else 0
            } else {
                return
            }
        }

        val preLapseInterval = interval
        // Remora SuperMemo-2 (SM-2) algorithm
        // score: 1 = Blank, 3 = Hard, 4 = Good, 5 = Easy
        if (score < 3) {
            rep = 0
            interval = 1
            lapses += 1
        } else {
            rep += 1
            interval = when (rep) {
                1 -> 1
                2 -> 6
                else -> max(1, (interval * efactor).roundToInt())
            }
        }

        efactor = max(1.3, efactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)))
        val now = System.currentTimeMillis()
        val nextDueDate = now + (interval.toLong() * 24 * 60 * 60 * 1000L)
        val status = if (rep >= 5) "memorized" else "learning"

        val values = ContentValues().apply {
            put("repetition", rep)
            put("interval", interval)
            put("efactor", efactor)
            put("next_due_date", nextDueDate)
            put("status", status)
            put("lapses", lapses)
            put("pre_lapse_interval", preLapseInterval)
        }
        db.update("user_verses", values, "id = ?", arrayOf(id.toString()))

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", id)
            put("score", score)
            put("review_date", now)
            put("prev_interval", preLapseInterval)
            put("new_interval", interval)
            put("prev_efactor", efactor)
            put("new_efactor", efactor)
        }
        db.insert("review_log", null, logValues)
    }

    fun getStreak(): Int {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT val FROM user_stats WHERE key = 'streak'", null)
        cursor.use {
            if (it.moveToNext()) {
                return it.getString(0)?.toIntOrNull() ?: 14
            }
        }
        return 14
    }

    fun setStreak(streak: Int) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("key", "streak")
            put("val", streak.toString())
        }
        db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // Session State persistence (Survives process death)
    fun getSessionState(key: String): String? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT val FROM session_state WHERE key = ?", arrayOf(key))
        cursor.use {
            if (it.moveToNext()) {
                return it.getString(0)
            }
        }
        return null
    }

    fun setSessionState(key: String, value: String?) {
        val db = writableDatabase
        if (value == null) {
            db.delete("session_state", "key = ?", arrayOf(key))
        } else {
            val values = ContentValues().apply {
                put("key", key)
                put("val", value)
            }
            db.insertWithOnConflict("session_state", null, values, SQLiteDatabase.CONFLICT_REPLACE)
        }
    }

    fun getChapterProgress(bookId: Int): Map<Int, ChapterProgressEntity> {
        val map = mutableMapOf<Int, ChapterProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT chapter, status, repetition, interval, efactor, next_due_date FROM chapter_progress WHERE book_id = ?",
            arrayOf(bookId.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                val ch = it.getInt(0)
                map[ch] = ChapterProgressEntity(
                    bookId = bookId,
                    chapter = ch,
                    status = it.getString(1),
                    repetition = it.getInt(2),
                    interval = it.getInt(3),
                    efactor = it.getDouble(4),
                    nextDueDate = it.getLong(5)
                )
            }
        }
        return map
    }

    fun gradeChapterAnchor(bookId: Int, chapter: Int, score: Int): ChapterProgressEntity {
        val existing = getChapterProgress(bookId)[chapter]
        val rep = existing?.repetition ?: 0
        val interval = existing?.interval ?: 0
        val efactor = existing?.efactor ?: 2.5

        val (newRep, newInterval, newEfactor) = if (score >= 3) {
            val nextRep = rep + 1
            val nextInterval = when (rep) {
                0 -> 1
                1 -> 6
                else -> max(1, (interval * efactor).roundToInt())
            }
            val efactorAdjustment = 0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)
            val nextEfactor = max(1.3, efactor + efactorAdjustment)
            Triple(nextRep, nextInterval, nextEfactor)
        } else {
            Triple(0, 1, max(1.3, efactor - 0.2))
        }

        val status = if (newRep >= 6) "mastered" else if (newRep > 0) "review" else "learning"
        val nextDueDate = System.currentTimeMillis() + (newInterval.toLong() * 24L * 60L * 60L * 1000L)

        val entity = ChapterProgressEntity(
            bookId = bookId,
            chapter = chapter,
            status = status,
            repetition = newRep,
            interval = newInterval,
            efactor = newEfactor,
            nextDueDate = nextDueDate
        )

        val db = writableDatabase
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("chapter", chapter)
            put("status", status)
            put("repetition", newRep)
            put("interval", newInterval)
            put("efactor", newEfactor)
            put("next_due_date", nextDueDate)
        }
        db.insertWithOnConflict("chapter_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE)

        return entity
    }

    // App Settings & Preferences
    fun getAppSettings(): AppSettings {
        return AppSettings(
            theme = getSetting("setting_theme", "black"),
            fontSize = getSetting("setting_fontSize", "1.0").toFloatOrNull() ?: 1.0f,
            ttsEnabled = getSetting("setting_ttsEnabled", "true").toBoolean(),
            recallMasking = getSetting("setting_recallMasking", "false").toBoolean(),
            bionicReading = getSetting("setting_bionicReading", "false").toBoolean(),
            bibleVersion = getSetting("setting_bibleVersion", "BSB"),
            anchorReveal = getSetting("setting_anchorReveal", "tap"),
            dailyChapterTarget = getSetting("setting_dailyChapterTarget", "3").toIntOrNull() ?: 3,
            streakIncludesChapters = getSetting("setting_streakIncludesChapters", "true").toBoolean(),
            showSectionHeadings = getSetting("setting_showSectionHeadings", "true").toBoolean(),
            showVerseNumbers = getSetting("setting_showVerseNumbers", "true").toBoolean(),
            showParagraphMarks = getSetting("setting_showParagraphMarks", "true").toBoolean(),
            showCrossRefMarkers = getSetting("setting_showCrossRefMarkers", "true").toBoolean()
        )
    }

    fun saveAppSettings(settings: AppSettings) {
        setSetting("setting_theme", settings.theme)
        setSetting("setting_fontSize", settings.fontSize.toString())
        setSetting("setting_ttsEnabled", settings.ttsEnabled.toString())
        setSetting("setting_recallMasking", settings.recallMasking.toString())
        setSetting("setting_bionicReading", settings.bionicReading.toString())
        setSetting("setting_bibleVersion", settings.bibleVersion)
        setSetting("setting_anchorReveal", settings.anchorReveal)
        setSetting("setting_dailyChapterTarget", settings.dailyChapterTarget.toString())
        setSetting("setting_streakIncludesChapters", settings.streakIncludesChapters.toString())
        setSetting("setting_showSectionHeadings", settings.showSectionHeadings.toString())
        setSetting("setting_showVerseNumbers", settings.showVerseNumbers.toString())
        setSetting("setting_showParagraphMarks", settings.showParagraphMarks.toString())
        setSetting("setting_showCrossRefMarkers", settings.showCrossRefMarkers.toString())
    }

    fun getSetting(key: String, defaultValue: String): String {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT val FROM user_stats WHERE key = ?", arrayOf(key))
        cursor.use {
            if (it.moveToNext()) {
                return it.getString(0) ?: defaultValue
            }
        }
        return defaultValue
    }

    fun setSetting(key: String, value: String) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("key", key)
            put("val", value)
        }
        db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // Backup & Restore
    fun exportUserDataJson(): String {
        val root = JSONObject()
        val versesArray = JSONArray()
        val userVerses = getUserVerses()
        for (v in userVerses) {
            val obj = JSONObject().apply {
                put("id", v.id)
                put("book_id", v.bookId)
                put("chapter", v.chapter)
                put("verse", v.verse)
                put("status", v.status)
                put("repetition", v.repetition)
                put("interval", v.interval)
                put("efactor", v.efactor)
                put("next_due_date", v.nextDueDate)
                put("created_at", v.createdAt)
                put("lapses", v.lapses)
                put("pre_lapse_interval", v.preLapseInterval)
                put("attempts", v.attempts)
            }
            versesArray.put(obj)
        }
        root.put("verses", versesArray)

        // Chapter progress
        val progressObj = JSONObject()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT book_id, chapter, status, repetition, interval, efactor, next_due_date FROM chapter_progress", null)
        cursor.use {
            while (it.moveToNext()) {
                val key = "${it.getInt(0)}:${it.getInt(1)}"
                val item = JSONObject().apply {
                    put("book_id", it.getInt(0))
                    put("chapter", it.getInt(1))
                    put("status", it.getString(2))
                    put("repetition", it.getInt(3))
                    put("interval", it.getInt(4))
                    put("efactor", it.getDouble(5))
                    put("next_due_date", it.getLong(6))
                }
                progressObj.put(key, item)
            }
        }
        root.put("chapterProgress", progressObj)

        // Stats & Settings
        val statsObj = JSONObject()
        val statsCursor = db.rawQuery("SELECT key, val FROM user_stats", null)
        statsCursor.use {
            while (it.moveToNext()) {
                statsObj.put(it.getString(0), it.getString(1))
            }
        }
        root.put("stats", statsObj)

        return root.toString(2)
    }

    fun restoreUserDataJson(jsonString: String): Boolean {
        return try {
            val root = JSONObject(jsonString)
            val db = writableDatabase
            db.beginTransaction()
            try {
                if (root.has("verses")) {
                    val arr = root.getJSONArray("verses")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val values = ContentValues().apply {
                            put("book_id", item.optInt("book_id", item.optInt("bookId", 1)))
                            put("chapter", item.optInt("chapter", 1))
                            put("verse", item.optInt("verse", 1))
                            put("status", item.optString("status", "learning"))
                            put("repetition", item.optInt("repetition", 0))
                            put("interval", item.optInt("interval", 0))
                            put("efactor", item.optDouble("efactor", 2.5))
                            put("next_due_date", item.optLong("next_due_date", item.optLong("nextDueDate", System.currentTimeMillis())))
                            put("created_at", item.optLong("created_at", item.optLong("createdAt", System.currentTimeMillis())))
                            put("lapses", item.optInt("lapses", 0))
                            put("pre_lapse_interval", item.optInt("pre_lapse_interval", 0))
                            put("attempts", item.optInt("attempts", 0))
                        }
                        db.insertWithOnConflict("user_verses", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                    }
                }

                if (root.has("chapterProgress")) {
                    val prog = root.getJSONObject("chapterProgress")
                    val keys = prog.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        val item = prog.getJSONObject(k)
                        val values = ContentValues().apply {
                            put("book_id", item.optInt("book_id", 1))
                            put("chapter", item.optInt("chapter", 1))
                            put("status", item.optString("status", "learning"))
                            put("repetition", item.optInt("repetition", 0))
                            put("interval", item.optInt("interval", 0))
                            put("efactor", item.optDouble("efactor", 2.5))
                            put("next_due_date", item.optLong("next_due_date", System.currentTimeMillis()))
                        }
                        db.insertWithOnConflict("chapter_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                    }
                }

                if (root.has("stats")) {
                    val stats = root.getJSONObject("stats")
                    val keys = stats.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        val v = stats.getString(k)
                        val values = ContentValues().apply {
                            put("key", k)
                            put("val", v)
                        }
                        db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                    }
                }
                db.setTransactionSuccessful()
                true
            } finally {
                db.endTransaction()
            }
        } catch (e: Exception) {
            false
        }
    }

    fun clearAllUserData() {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("user_verses", null, null)
            db.delete("chapter_progress", null, null)
            db.delete("session_state", null, null)
            db.delete("review_log", null, null)
            db.delete("user_stats", null, null)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }
}


