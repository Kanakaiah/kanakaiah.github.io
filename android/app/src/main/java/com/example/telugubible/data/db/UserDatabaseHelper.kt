package com.example.telugubible.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.telugubible.data.model.AdherenceStats
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.ColdCheckResult
import com.example.telugubible.data.model.ReviewLogEntry
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
    val nextDueDate: Long,
    val lapses: Int = 0,
    val attempts: Int = 0
)

data class ThemeProgressEntity(
    val bookId: Int,
    val status: String = "learning",
    val repetition: Int = 0,
    val interval: Int = 0,
    val efactor: Double = 2.5,
    val nextDueDate: Long = 0L,
    val lapses: Int = 0,
    val attempts: Int = 0,
    val lastScore: Int = 0
)

class UserDatabaseHelper(private val context: Context) :
    SQLiteOpenHelper(context, USER_DB_NAME, null, USER_DB_VERSION) {

    companion object {
        const val USER_DB_NAME = "user_data.db"
        const val USER_DB_VERSION = 4
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
                verse_id INTEGER NOT NULL DEFAULT 0,
                score INTEGER NOT NULL,
                review_date INTEGER NOT NULL,
                prev_interval INTEGER NOT NULL,
                new_interval INTEGER NOT NULL,
                prev_efactor REAL NOT NULL,
                new_efactor REAL NOT NULL,
                item_kind TEXT NOT NULL DEFAULT 'verse',
                item_id TEXT NOT NULL DEFAULT '',
                cue_level INTEGER NOT NULL DEFAULT 0,
                mode TEXT NOT NULL DEFAULT 'reveal',
                measured_accuracy REAL DEFAULT NULL
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
                lapses INTEGER NOT NULL DEFAULT 0,
                attempts INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (book_id, chapter)
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS cold_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                correct INTEGER NOT NULL,
                total INTEGER NOT NULL,
                median_cold_for INTEGER NOT NULL
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS session_adherence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                completed INTEGER NOT NULL,
                duration_ms INTEGER NOT NULL,
                abandoned_at INTEGER DEFAULT NULL
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS theme_progress (
                book_id INTEGER PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'learning',
                repetition INTEGER NOT NULL DEFAULT 0,
                interval INTEGER NOT NULL DEFAULT 0,
                efactor REAL NOT NULL DEFAULT 2.5,
                next_due_date INTEGER NOT NULL,
                lapses INTEGER NOT NULL DEFAULT 0,
                attempts INTEGER NOT NULL DEFAULT 0,
                last_score INTEGER NOT NULL DEFAULT 0
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
        if (oldVersion < 3) {
            try {
                db.execSQL("ALTER TABLE review_log ADD COLUMN item_kind TEXT NOT NULL DEFAULT 'verse';")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE review_log ADD COLUMN item_id TEXT NOT NULL DEFAULT '';")
                db.execSQL("UPDATE review_log SET item_id = CAST(verse_id AS TEXT) WHERE item_id = '';")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE review_log ADD COLUMN cue_level INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE review_log ADD COLUMN mode TEXT NOT NULL DEFAULT 'reveal';")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE review_log ADD COLUMN measured_accuracy REAL DEFAULT NULL;")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE chapter_progress ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE chapter_progress ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS cold_checks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts INTEGER NOT NULL,
                    correct INTEGER NOT NULL,
                    total INTEGER NOT NULL,
                    median_cold_for INTEGER NOT NULL
                );
                """.trimIndent()
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS session_adherence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts INTEGER NOT NULL,
                    completed INTEGER NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    abandoned_at INTEGER DEFAULT NULL
                );
                """.trimIndent()
            )
        }
        if (oldVersion < 4) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS theme_progress (
                    book_id INTEGER PRIMARY KEY,
                    status TEXT NOT NULL DEFAULT 'learning',
                    repetition INTEGER NOT NULL DEFAULT 0,
                    interval INTEGER NOT NULL DEFAULT 0,
                    efactor REAL NOT NULL DEFAULT 2.5,
                    next_due_date INTEGER NOT NULL,
                    lapses INTEGER NOT NULL DEFAULT 0,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_score INTEGER NOT NULL DEFAULT 0
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

    fun gradeUserVerse(
        id: Long,
        score: Int,
        cueLevel: Int = 0,
        mode: String = "reveal",
        measuredAccuracy: Double? = null
    ) {
        val db = writableDatabase
        val cursor = db.rawQuery(
            "SELECT repetition, interval, efactor, lapses, attempts FROM user_verses WHERE id = ?",
            arrayOf(id.toString())
        )
        var rep = 0
        var interval = 0
        var efactor = 2.5
        var lapses = 0
        var attempts = 0

        cursor.use {
            if (it.moveToNext()) {
                rep = it.getInt(0)
                interval = it.getInt(1)
                efactor = it.getDouble(2)
                lapses = if (it.columnCount > 3) it.getInt(3) else 0
                attempts = if (it.columnCount > 4) it.getInt(4) else 0
            } else {
                return
            }
        }

        val preLapseInterval = interval
        val scale = getAppSettings().intervalScale
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
                else -> max(1, (interval * efactor * scale).roundToInt())
            }
        }

        val prevEfactor = efactor
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
            put("attempts", attempts + 1)
        }
        db.update("user_verses", values, "id = ?", arrayOf(id.toString()))

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", id)
            put("score", score)
            put("review_date", now)
            put("prev_interval", preLapseInterval)
            put("new_interval", interval)
            put("prev_efactor", prevEfactor)
            put("new_efactor", efactor)
            put("item_kind", "verse")
            put("item_id", id.toString())
            put("cue_level", cueLevel)
            put("mode", mode)
            if (measuredAccuracy != null) put("measured_accuracy", measuredAccuracy)
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
            "SELECT chapter, status, repetition, interval, efactor, next_due_date, lapses, attempts FROM chapter_progress WHERE book_id = ?",
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
                    nextDueDate = it.getLong(5),
                    lapses = if (it.columnCount > 6) it.getInt(6) else 0,
                    attempts = if (it.columnCount > 7) it.getInt(7) else 0
                )
            }
        }
        return map
    }

    fun getAllChapterProgress(): List<ChapterProgressEntity> {
        val list = mutableListOf<ChapterProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, chapter, status, repetition, interval, efactor, next_due_date, lapses, attempts FROM chapter_progress",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    ChapterProgressEntity(
                        bookId = it.getInt(0),
                        chapter = it.getInt(1),
                        status = it.getString(2),
                        repetition = it.getInt(3),
                        interval = it.getInt(4),
                        efactor = it.getDouble(5),
                        nextDueDate = it.getLong(6),
                        lapses = if (it.columnCount > 7) it.getInt(7) else 0,
                        attempts = if (it.columnCount > 8) it.getInt(8) else 0
                    )
                )
            }
        }
        return list
    }

    fun gradeChapterAnchor(bookId: Int, chapter: Int, score: Int): ChapterProgressEntity {
        val existing = getChapterProgress(bookId)[chapter]
        val rep = existing?.repetition ?: 0
        val interval = existing?.interval ?: 0
        val efactor = existing?.efactor ?: 2.5
        val lapses = existing?.lapses ?: 0
        val attempts = (existing?.attempts ?: 0) + 1

        val scale = getAppSettings().intervalScale
        var newRep = 0
        var newInterval = 1
        var newEfactor = efactor
        var newLapses = lapses

        if (score >= 3) {
            newRep = rep + 1
            newInterval = when (rep) {
                0 -> 1
                1 -> 6
                else -> max(1, (interval * efactor * scale).roundToInt())
            }
            val efactorAdjustment = 0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)
            newEfactor = max(1.3, efactor + efactorAdjustment)
        } else {
            newRep = 0
            newInterval = 1
            newEfactor = max(1.3, efactor - 0.2)
            newLapses = lapses + 1
        }

        val status = if (newRep >= 6) "mastered" else if (newRep > 0) "review" else "learning"
        val now = System.currentTimeMillis()
        val nextDueDate = now + (newInterval.toLong() * 24L * 60L * 60L * 1000L)

        val entity = ChapterProgressEntity(
            bookId = bookId,
            chapter = chapter,
            status = status,
            repetition = newRep,
            interval = newInterval,
            efactor = newEfactor,
            nextDueDate = nextDueDate,
            lapses = newLapses,
            attempts = attempts
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
            put("lapses", newLapses)
            put("attempts", attempts)
        }
        db.insertWithOnConflict("chapter_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE)

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", 0)
            put("score", score)
            put("review_date", now)
            put("prev_interval", interval)
            put("new_interval", newInterval)
            put("prev_efactor", efactor)
            put("new_efactor", newEfactor)
            put("item_kind", "anchor")
            put("item_id", "$bookId:$chapter")
            put("cue_level", 0)
            put("mode", "reveal")
        }
        db.insert("review_log", null, logValues)

        return entity
    }

    fun getThemeProgress(bookId: Int): ThemeProgressEntity? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, status, repetition, interval, efactor, next_due_date, lapses, attempts, last_score FROM theme_progress WHERE book_id = ?",
            arrayOf(bookId.toString())
        )
        cursor.use {
            if (it.moveToNext()) {
                return ThemeProgressEntity(
                    bookId = it.getInt(0),
                    status = it.getString(1),
                    repetition = it.getInt(2),
                    interval = it.getInt(3),
                    efactor = it.getDouble(4),
                    nextDueDate = it.getLong(5),
                    lapses = it.getInt(6),
                    attempts = it.getInt(7),
                    lastScore = it.getInt(8)
                )
            }
        }
        return null
    }

    fun getAllThemeProgress(): Map<Int, ThemeProgressEntity> {
        val map = mutableMapOf<Int, ThemeProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, status, repetition, interval, efactor, next_due_date, lapses, attempts, last_score FROM theme_progress",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                val bId = it.getInt(0)
                map[bId] = ThemeProgressEntity(
                    bookId = bId,
                    status = it.getString(1),
                    repetition = it.getInt(2),
                    interval = it.getInt(3),
                    efactor = it.getDouble(4),
                    nextDueDate = it.getLong(5),
                    lapses = it.getInt(6),
                    attempts = it.getInt(7),
                    lastScore = it.getInt(8)
                )
            }
        }
        return map
    }

    fun gradeThemeProgress(bookId: Int, score: Int): ThemeProgressEntity {
        val existing = getThemeProgress(bookId)
        val rep = existing?.repetition ?: 0
        val interval = existing?.interval ?: 0
        val efactor = existing?.efactor ?: 2.5
        val lapses = existing?.lapses ?: 0
        val attempts = (existing?.attempts ?: 0) + 1

        val scale = getAppSettings().intervalScale
        var newRep = 0
        var newInterval = 1
        var newEfactor = efactor
        var newLapses = lapses

        if (score >= 3) {
            newRep = rep + 1
            newInterval = when (rep) {
                0 -> 1
                1 -> 6
                else -> max(1, (interval * efactor * scale).roundToInt())
            }
            val efactorAdjustment = 0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)
            newEfactor = max(1.3, efactor + efactorAdjustment)
        } else {
            newRep = 0
            newInterval = 1
            newEfactor = max(1.3, efactor - 0.2)
            newLapses = lapses + 1
        }

        val status = if (newRep >= 6) "mastered" else if (newRep > 0) "review" else "learning"
        val now = System.currentTimeMillis()
        val nextDueDate = now + (newInterval.toLong() * 24L * 60L * 60L * 1000L)

        val entity = ThemeProgressEntity(
            bookId = bookId,
            status = status,
            repetition = newRep,
            interval = newInterval,
            efactor = newEfactor,
            nextDueDate = nextDueDate,
            lapses = newLapses,
            attempts = attempts,
            lastScore = score
        )

        val db = writableDatabase
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("status", status)
            put("repetition", newRep)
            put("interval", newInterval)
            put("efactor", newEfactor)
            put("next_due_date", nextDueDate)
            put("lapses", newLapses)
            put("attempts", attempts)
            put("last_score", score)
        }
        db.insertWithOnConflict("theme_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE)

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", 0)
            put("score", score)
            put("review_date", now)
            put("prev_interval", interval)
            put("new_interval", newInterval)
            put("prev_efactor", efactor)
            put("new_efactor", newEfactor)
            put("item_kind", "theme")
            put("item_id", bookId.toString())
            put("cue_level", 0)
            put("mode", "reveal")
        }
        db.insert("review_log", null, logValues)

        return entity
    }

    fun getReviewLog(): List<ReviewLogEntry> {
        val list = mutableListOf<ReviewLogEntry>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, item_kind, item_id, score, review_date, prev_interval, new_interval, prev_efactor, new_efactor, cue_level, mode, measured_accuracy FROM review_log ORDER BY review_date ASC",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    ReviewLogEntry(
                        id = it.getLong(0),
                        itemKind = it.getString(1) ?: "verse",
                        itemId = it.getString(2) ?: "",
                        score = it.getInt(3),
                        reviewDate = it.getLong(4),
                        prevInterval = it.getInt(5),
                        newInterval = it.getInt(6),
                        prevEfactor = it.getDouble(7),
                        newEfactor = it.getDouble(8),
                        cueLevel = it.getInt(9),
                        mode = it.getString(10) ?: "reveal",
                        measuredAccuracy = if (it.isNull(11)) null else it.getDouble(11)
                    )
                )
            }
        }
        return list
    }

    fun recordColdCheck(correct: Int, total: Int, medianColdFor: Int): Long {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("ts", System.currentTimeMillis())
            put("correct", correct)
            put("total", total)
            put("median_cold_for", medianColdFor)
        }
        return db.insert("cold_checks", null, values)
    }

    fun getLastColdCheck(): ColdCheckResult? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT ts, correct, total, median_cold_for FROM cold_checks ORDER BY id DESC LIMIT 1", null)
        cursor.use {
            if (it.moveToNext()) {
                return ColdCheckResult(
                    ts = it.getLong(0),
                    correct = it.getInt(1),
                    total = it.getInt(2),
                    medianColdFor = it.getInt(3)
                )
            }
        }
        return null
    }

    fun recordSessionAdherence(completed: Boolean, durationMs: Long, abandonedAt: Int? = null) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("ts", System.currentTimeMillis())
            put("completed", if (completed) 1 else 0)
            put("duration_ms", durationMs)
            if (abandonedAt != null) put("abandoned_at", abandonedAt)
        }
        db.insert("session_adherence", null, values)
    }

    fun getAdherenceStats(): AdherenceStats {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT completed, duration_ms, abandoned_at FROM session_adherence", null)
        var started = 0
        var completed = 0
        var completedMsTotal = 0L
        var abandonedCount = 0
        var abandonedAtSum = 0

        cursor.use {
            while (it.moveToNext()) {
                started++
                val isComp = it.getInt(0) == 1
                val duration = it.getLong(1)
                if (isComp) {
                    completed++
                    completedMsTotal += duration
                } else {
                    abandonedCount++
                    if (!it.isNull(2)) abandonedAtSum += it.getInt(2)
                }
            }
        }

        val rate = if (started > 0) completed.toDouble() / started else null
        val meanMinutes = if (completed > 0) (completedMsTotal / completed / 60000L).toInt() else null
        val meanAbandonAt = if (abandonedCount > 0) abandonedAtSum / abandonedCount else null
        return AdherenceStats(started, completed, rate, meanMinutes, meanAbandonAt)
    }

    fun updateIntervalScale(scale: Double) {
        setSetting("setting_intervalScale", scale.toString())
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
            showCrossRefMarkers = getSetting("setting_showCrossRefMarkers", "true").toBoolean(),
            intervalScale = getSetting("setting_intervalScale", "1.0").toDoubleOrNull() ?: 1.0
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
        setSetting("setting_intervalScale", settings.intervalScale.toString())
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
        val cursor = db.rawQuery("SELECT book_id, chapter, status, repetition, interval, efactor, next_due_date, lapses, attempts FROM chapter_progress", null)
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
                    put("lapses", if (it.columnCount > 7) it.getInt(7) else 0)
                    put("attempts", if (it.columnCount > 8) it.getInt(8) else 0)
                }
                progressObj.put(key, item)
            }
        }
        root.put("chapterProgress", progressObj)

        // Review log
        val logArray = JSONArray()
        val logCursor = db.rawQuery(
            "SELECT id, verse_id, score, review_date, prev_interval, new_interval, prev_efactor, new_efactor, item_kind, item_id, cue_level, mode, measured_accuracy FROM review_log",
            null
        )
        logCursor.use {
            while (it.moveToNext()) {
                val item = JSONObject().apply {
                    put("id", it.getLong(0))
                    put("verse_id", it.getLong(1))
                    put("score", it.getInt(2))
                    put("review_date", it.getLong(3))
                    put("prev_interval", it.getInt(4))
                    put("new_interval", it.getInt(5))
                    put("prev_efactor", it.getDouble(6))
                    put("new_efactor", it.getDouble(7))
                    put("item_kind", it.getString(8))
                    put("item_id", it.getString(9))
                    put("cue_level", it.getInt(10))
                    put("mode", it.getString(11))
                    if (!it.isNull(12)) put("measured_accuracy", it.getDouble(12))
                }
                logArray.put(item)
            }
        }
        root.put("reviewLog", logArray)

        // Cold checks
        val coldArray = JSONArray()
        val coldCursor = db.rawQuery("SELECT ts, correct, total, median_cold_for FROM cold_checks", null)
        coldCursor.use {
            while (it.moveToNext()) {
                val item = JSONObject().apply {
                    put("ts", it.getLong(0))
                    put("correct", it.getInt(1))
                    put("total", it.getInt(2))
                    put("median_cold_for", it.getInt(3))
                }
                coldArray.put(item)
            }
        }
        root.put("coldChecks", coldArray)

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
                            put("lapses", item.optInt("lapses", 0))
                            put("attempts", item.optInt("attempts", 0))
                        }
                        db.insertWithOnConflict("chapter_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                    }
                }

                if (root.has("reviewLog")) {
                    val arr = root.getJSONArray("reviewLog")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val values = ContentValues().apply {
                            put("verse_id", item.optLong("verse_id", 0L))
                            put("score", item.optInt("score", 3))
                            put("review_date", item.optLong("review_date", System.currentTimeMillis()))
                            put("prev_interval", item.optInt("prev_interval", 0))
                            put("new_interval", item.optInt("new_interval", 1))
                            put("prev_efactor", item.optDouble("prev_efactor", 2.5))
                            put("new_efactor", item.optDouble("new_efactor", 2.5))
                            put("item_kind", item.optString("item_kind", "verse"))
                            put("item_id", item.optString("item_id", ""))
                            put("cue_level", item.optInt("cue_level", 0))
                            put("mode", item.optString("mode", "reveal"))
                            if (item.has("measured_accuracy")) {
                                put("measured_accuracy", item.optDouble("measured_accuracy"))
                            }
                        }
                        db.insertWithOnConflict("review_log", null, values, SQLiteDatabase.CONFLICT_IGNORE)
                    }
                }

                if (root.has("coldChecks")) {
                    val arr = root.getJSONArray("coldChecks")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val values = ContentValues().apply {
                            put("ts", item.optLong("ts", System.currentTimeMillis()))
                            put("correct", item.optInt("correct", 0))
                            put("total", item.optInt("total", 0))
                            put("median_cold_for", item.optInt("median_cold_for", 30))
                        }
                        db.insert("cold_checks", null, values)
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
            db.delete("cold_checks", null, null)
            db.delete("session_adherence", null, null)
            db.delete("user_stats", null, null)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }
}


