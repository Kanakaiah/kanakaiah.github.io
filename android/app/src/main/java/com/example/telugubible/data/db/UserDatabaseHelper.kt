package com.example.telugubible.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.telugubible.data.model.AdherenceStats
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.BackupInspector
import com.example.telugubible.data.model.ColdCheckResult
import com.example.telugubible.data.model.ReviewLogEntry
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.Verse
import com.example.telugubible.util.SM2Engine
import com.example.telugubible.util.ScheduleKind
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.math.max
import kotlin.math.roundToInt

data class UserVerseEntity(
    val id: Long,
    val bookId: Int,
    val chapter: Int,
    val verse: Int,
    val endVerse: Int? = null,
    val status: String,
    val repetition: Int,
    val interval: Int,
    val efactor: Double,
    val nextDueDate: Long,
    val createdAt: Long,
    val lapses: Int = 0,
    val preLapseInterval: Int = 0,
    val attempts: Int = 0,
    val keyword: String? = null
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
    val attempts: Int = 0,
    val preLapseInterval: Int = 0,
    val chainHits: Int = 0,
    val chainMisses: Int = 0,
    val lastChainDate: Long = 0L
)

data class BlockProgressEntity(
    val bookId: Int,
    val blockIndex: Int,
    val label: String,
    val status: String = "learning",
    val repetition: Int = 0,
    val interval: Int = 0,
    val efactor: Double = 2.5,
    val nextDueDate: Long = 0L,
    val lapses: Int = 0,
    val attempts: Int = 0,
    val lastScore: Int = 0,
    val lastAccuracy: Double = 0.0,
    val lastAttemptDate: Long = 0L,
    val preLapseInterval: Int = 0
) {
    val isDue: Boolean
        get() = nextDueDate <= System.currentTimeMillis()
}

data class ThemeProgressEntity(
    val bookId: Int,
    val status: String = "learning",
    val repetition: Int = 0,
    val interval: Int = 0,
    val efactor: Double = 2.5,
    val nextDueDate: Long = 0L,
    val lapses: Int = 0,
    val attempts: Int = 0,
    val lastScore: Int = 0,
    val preLapseInterval: Int = 0
)

class UserDatabaseHelper(private val context: Context) :
    SQLiteOpenHelper(context, USER_DB_NAME, null, USER_DB_VERSION) {

    companion object {
        const val USER_DB_NAME = "user_data.db"
        const val USER_DB_VERSION = 11
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
        try {
            mergeWellKnownTopics(writableDatabase)
        } catch (_: Exception) {}
        try {
            writableDatabase.execSQL("ALTER TABLE user_verses ADD COLUMN keyword TEXT;")
        } catch (_: Exception) {}
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS user_verses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                chapter INTEGER NOT NULL,
                verse INTEGER NOT NULL,
                end_verse INTEGER,
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
                pre_lapse_interval INTEGER NOT NULL DEFAULT 0,
                chain_hits INTEGER NOT NULL DEFAULT 0,
                chain_misses INTEGER NOT NULL DEFAULT 0,
                last_chain_date INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (book_id, chapter)
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS block_progress (
                book_id INTEGER NOT NULL,
                block_index INTEGER NOT NULL,
                label TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'learning',
                repetition INTEGER NOT NULL DEFAULT 0,
                interval INTEGER NOT NULL DEFAULT 0,
                efactor REAL NOT NULL DEFAULT 2.5,
                next_due_date INTEGER NOT NULL,
                lapses INTEGER NOT NULL DEFAULT 0,
                attempts INTEGER NOT NULL DEFAULT 0,
                last_score INTEGER NOT NULL DEFAULT 0,
                last_accuracy REAL NOT NULL DEFAULT 0.0,
                last_attempt_date INTEGER NOT NULL DEFAULT 0,
                pre_lapse_interval INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (book_id, block_index)
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
                last_score INTEGER NOT NULL DEFAULT 0,
                pre_lapse_interval INTEGER NOT NULL DEFAULT 0
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS verse_topics (
                verse_id INTEGER NOT NULL,
                topic_id TEXT NOT NULL,
                PRIMARY KEY (verse_id, topic_id)
            );
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS remote_verse_cache (
                version TEXT NOT NULL,
                book_id INTEGER NOT NULL,
                chapter INTEGER NOT NULL,
                verse INTEGER NOT NULL,
                text TEXT NOT NULL,
                PRIMARY KEY (version, book_id, chapter, verse)
            );
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_remote_verse_cache ON remote_verse_cache (version, book_id, chapter);")
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
        if (oldVersion < 5) {
            try {
                db.execSQL("ALTER TABLE chapter_progress ADD COLUMN pre_lapse_interval INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE theme_progress ADD COLUMN pre_lapse_interval INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
        }
        if (oldVersion < 6) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS topics (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                """.trimIndent()
            )
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS verse_topics (
                    verse_id INTEGER NOT NULL,
                    topic_id TEXT NOT NULL,
                    PRIMARY KEY (verse_id, topic_id)
                );
                """.trimIndent()
            )
        }
        if (oldVersion < 7) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS block_progress (
                    book_id INTEGER NOT NULL,
                    block_index INTEGER NOT NULL,
                    label TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'learning',
                    repetition INTEGER NOT NULL DEFAULT 0,
                    interval INTEGER NOT NULL DEFAULT 0,
                    efactor REAL NOT NULL DEFAULT 2.5,
                    next_due_date INTEGER NOT NULL,
                    lapses INTEGER NOT NULL DEFAULT 0,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_score INTEGER NOT NULL DEFAULT 0,
                    last_accuracy REAL NOT NULL DEFAULT 0.0,
                    last_attempt_date INTEGER NOT NULL DEFAULT 0,
                    pre_lapse_interval INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (book_id, block_index)
                );
                """.trimIndent()
            )
            try {
                db.execSQL("ALTER TABLE chapter_progress ADD COLUMN chain_hits INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE chapter_progress ADD COLUMN chain_misses INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
            try {
                db.execSQL("ALTER TABLE chapter_progress ADD COLUMN last_chain_date INTEGER NOT NULL DEFAULT 0;")
            } catch (e: Exception) {}
        }
        if (oldVersion < 8) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS remote_verse_cache (
                    version TEXT NOT NULL,
                    book_id INTEGER NOT NULL,
                    chapter INTEGER NOT NULL,
                    verse INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    PRIMARY KEY (version, book_id, chapter, verse)
                );
                """.trimIndent()
            )
            try {
                db.execSQL("CREATE INDEX IF NOT EXISTS idx_remote_verse_cache ON remote_verse_cache (version, book_id, chapter);")
            } catch (e: Exception) {}
        }
        if (oldVersion < 9) {
            try {
                db.execSQL("ALTER TABLE user_verses ADD COLUMN end_verse INTEGER;")
            } catch (e: Exception) {}
        }
        if (oldVersion < 10) {
            // Clear stale remote_verse_cache entries that were cached before <b> section headings were preserved,
            // and ensure showSectionHeadings is enabled by default.
            try {
                db.execSQL("DELETE FROM remote_verse_cache;")
            } catch (e: Exception) {}
            try {
                db.execSQL("INSERT OR REPLACE INTO user_stats (key, val) VALUES ('setting_showSectionHeadings', 'true');")
            } catch (e: Exception) {}
        }
        if (oldVersion < 11) {
            mergeWellKnownTopics(db)
        }
    }

    fun mergeWellKnownTopics(db: SQLiteDatabase) {
        try {
            var canonicalId: String? = null
            val cursor = db.rawQuery("SELECT id FROM topics WHERE LOWER(name) = 'well-known' LIMIT 1", null)
            cursor.use {
                if (it.moveToNext()) {
                    canonicalId = it.getString(0)
                }
            }
            val dupCursor = db.rawQuery("SELECT id FROM topics WHERE LOWER(name) IN ('75 well-known', '75 well-known verses')", null)
            val dupIds = mutableListOf<String>()
            dupCursor.use {
                while (it.moveToNext()) {
                    val id = it.getString(0)
                    if (id != canonicalId) {
                        dupIds.add(id)
                    }
                }
            }

            if (canonicalId == null && dupIds.isNotEmpty()) {
                val primaryId = dupIds.removeAt(0)
                db.execSQL("UPDATE topics SET name = 'Well-Known' WHERE id = ?", arrayOf(primaryId))
                canonicalId = primaryId
            }

            if (canonicalId != null && dupIds.isNotEmpty()) {
                for (dupId in dupIds) {
                    db.execSQL(
                        "INSERT OR IGNORE INTO verse_topics (verse_id, topic_id) SELECT verse_id, ? FROM verse_topics WHERE topic_id = ?",
                        arrayOf(canonicalId, dupId)
                    )
                    db.execSQL("DELETE FROM verse_topics WHERE topic_id = ?", arrayOf(dupId))
                    db.execSQL("DELETE FROM topics WHERE id = ?", arrayOf(dupId))
                }
            }
        } catch (_: Exception) {}
    }

    private fun pruneReviewLog(db: SQLiteDatabase) {
        try {
            db.execSQL(
                """
                DELETE FROM review_log WHERE id NOT IN (
                    SELECT id FROM review_log ORDER BY id DESC LIMIT 4000
                )
                """.trimIndent()
            )
        } catch (e: Exception) {
            // Safe fallback
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
                   next_due_date, created_at, lapses, pre_lapse_interval, attempts, end_verse, keyword
            FROM user_verses
            ORDER BY next_due_date ASC
            """.trimIndent(),
            null
        )
        cursor.use {
            val kwIdx = it.getColumnIndex("keyword")
            while (it.moveToNext()) {
                list.add(
                    UserVerseEntity(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        chapter = it.getInt(2),
                        verse = it.getInt(3),
                        endVerse = if (it.columnCount > 13 && !it.isNull(13)) {
                            val ev = it.getInt(13)
                            if (ev > 0) ev else null
                        } else null,
                        status = it.getString(4),
                        repetition = it.getInt(5),
                        interval = it.getInt(6),
                        efactor = it.getDouble(7),
                        nextDueDate = it.getLong(8),
                        createdAt = it.getLong(9),
                        lapses = if (it.columnCount > 10) it.getInt(10) else 0,
                        preLapseInterval = if (it.columnCount > 11) it.getInt(11) else 0,
                        attempts = if (it.columnCount > 12) it.getInt(12) else 0,
                        keyword = if (kwIdx != -1 && !it.isNull(kwIdx)) it.getString(kwIdx) else null
                    )
                )
            }
        }
        return list
    }

    fun addUserVerse(
        bookId: Int,
        chapter: Int,
        verse: Int,
        endVerse: Int? = null,
        nextDueDate: Long? = null,
        keyword: String? = null
    ): Boolean {
        val db = writableDatabase
        val now = System.currentTimeMillis()
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("chapter", chapter)
            put("verse", verse)
            if (endVerse != null && endVerse > verse) {
                put("end_verse", endVerse)
            }
            put("status", "learning")
            put("repetition", 0)
            put("interval", 0)
            put("efactor", 2.5)
            put("next_due_date", nextDueDate ?: now)
            put("created_at", now)
            put("lapses", 0)
            put("pre_lapse_interval", 0)
            put("attempts", 0)
            if (!keyword.isNullOrBlank()) {
                put("keyword", keyword.trim())
            }
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
        db.beginTransaction()
        try {
            db.delete("verse_topics", "verse_id = ?", arrayOf(id.toString()))
            db.delete("user_verses", "id = ?", arrayOf(id.toString()))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getCachedVerseTexts(version: String, keys: List<Triple<Int, Int, Int>>): Map<Triple<Int, Int, Int>, String> {
        if (keys.isEmpty()) return emptyMap()
        val result = mutableMapOf<Triple<Int, Int, Int>, String>()
        val db = readableDatabase
        val ver = version.uppercase().trim()
        keys.chunked(100).forEach { batch ->
            val placeholders = batch.joinToString(" OR ") { "(book_id = ? AND chapter = ? AND verse = ?)" }
            val args = (listOf(ver) + batch.flatMap { listOf(it.first.toString(), it.second.toString(), it.third.toString()) }).toTypedArray()
            val cursor = db.rawQuery(
                "SELECT book_id, chapter, verse, text FROM remote_verse_cache WHERE version = ? AND ($placeholders)",
                args
            )
            cursor.use {
                while (it.moveToNext()) {
                    val bId = it.getInt(0)
                    val ch = it.getInt(1)
                    val vs = it.getInt(2)
                    val txt = it.getString(3)
                    result[Triple(bId, ch, vs)] = txt
                }
            }
        }
        return result
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
            "SELECT repetition, interval, efactor, lapses, attempts, pre_lapse_interval FROM user_verses WHERE id = ?",
            arrayOf(id.toString())
        )
        var rep = 0
        var interval = 0
        var efactor = 2.5
        var lapses = 0
        var attempts = 0
        var preLapseInterval = 0

        cursor.use {
            if (it.moveToNext()) {
                rep = it.getInt(0)
                interval = it.getInt(1)
                efactor = it.getDouble(2)
                lapses = if (it.columnCount > 3) it.getInt(3) else 0
                attempts = if (it.columnCount > 4) it.getInt(4) else 0
                preLapseInterval = if (it.columnCount > 5) it.getInt(5) else 0
            } else {
                return
            }
        }

        val scale = getAppSettings().intervalScale
        val now = System.currentTimeMillis()
        val prevEfactor = efactor
        val eval = SM2Engine.evaluate(
            repetition = rep,
            interval = interval,
            efactor = efactor,
            lapses = lapses,
            preLapseInterval = preLapseInterval,
            score = score,
            kind = ScheduleKind.VERSE,
            intervalScale = scale,
            now = now
        )

        val values = ContentValues().apply {
            put("repetition", eval.repetition)
            put("interval", eval.interval)
            put("efactor", eval.efactor)
            put("next_due_date", eval.nextDueDate)
            put("status", eval.status)
            put("lapses", eval.lapses)
            put("pre_lapse_interval", eval.preLapseInterval)
            put("attempts", attempts + 1)
        }
        check(db.update("user_verses", values, "id = ?", arrayOf(id.toString())) == 1) { "Verse was not updated" }

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", id)
            put("score", score)
            put("review_date", now)
            put("prev_interval", interval)
            put("new_interval", eval.interval)
            put("prev_efactor", prevEfactor)
            put("new_efactor", eval.efactor)
            put("item_kind", "verse")
            put("item_id", id.toString())
            put("cue_level", cueLevel)
            put("mode", mode)
            if (measuredAccuracy != null) put("measured_accuracy", measuredAccuracy)
        }
        db.insertOrThrow("review_log", null, logValues)
        pruneReviewLog(db)
    }

    fun gradeUserVerseAndUpdateSession(
        id: Long,
        score: Int,
        cueLevel: Int,
        mode: String,
        measuredAccuracy: Double?,
        sessionUpdates: Map<String, String?>
    ) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val exists = db.rawQuery("SELECT 1 FROM user_verses WHERE id = ?", arrayOf(id.toString())).use { it.moveToFirst() }
            check(exists) { "Verse no longer exists" }
            gradeUserVerse(id, score, cueLevel, mode, measuredAccuracy)
            sessionUpdates.forEach { (key, value) ->
                if (value == null) {
                    db.delete("session_state", "key = ?", arrayOf(key))
                } else {
                    val values = ContentValues().apply { put("key", key); put("val", value) }
                    check(db.insertWithOnConflict("session_state", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L) { "Practice session was not updated" }
                }
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getStreak(): Int {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT val FROM user_stats WHERE key = 'streak'", null)
        cursor.use {
            if (it.moveToNext()) {
                return it.getString(0)?.toIntOrNull() ?: 0
            }
        }
        return 0
    }

    fun setStreak(streak: Int) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("key", "streak")
            put("val", streak.toString())
        }
        db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // ==========================================
    // TOPICS & GROUPS MANAGEMENT
    // ==========================================

    fun getAllTopics(): List<Topic> {
        val db = readableDatabase
        val list = mutableListOf<Topic>()
        val cursor = db.rawQuery("SELECT id, name, created_at FROM topics ORDER BY created_at ASC", null)
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    Topic(
                        id = it.getString(0),
                        name = it.getString(1),
                        createdAt = it.getLong(2)
                    )
                )
            }
        }
        return list
    }

    fun getOrCreateTopic(name: String): Topic {
        val trimmedName = name.trim()
        val db = writableDatabase
        val cursor = db.rawQuery("SELECT id, name, created_at FROM topics WHERE LOWER(name) = LOWER(?) LIMIT 1", arrayOf(trimmedName))
        cursor.use {
            if (it.moveToNext()) {
                return Topic(
                    id = it.getString(0),
                    name = it.getString(1),
                    createdAt = it.getLong(2)
                )
            }
        }
        val newId = "topic-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"
        val now = System.currentTimeMillis()
        val values = ContentValues().apply {
            put("id", newId)
            put("name", trimmedName)
            put("created_at", now)
        }
        db.insertWithOnConflict("topics", null, values, SQLiteDatabase.CONFLICT_REPLACE)
        return Topic(newId, trimmedName, now)
    }

    fun insertTopic(topic: Topic): Boolean {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("id", topic.id)
            put("name", topic.name.trim())
            put("created_at", topic.createdAt)
        }
        val res = db.insertWithOnConflict("topics", null, values, SQLiteDatabase.CONFLICT_REPLACE)
        return res != -1L
    }

    fun renameTopic(id: String, newName: String): Boolean {
        val trimmed = newName.trim()
        if (trimmed.isEmpty()) return false
        val db = writableDatabase
        val values = ContentValues().apply {
            put("name", trimmed)
        }
        val updated = db.update("topics", values, "id = ?", arrayOf(id))
        return updated > 0
    }

    fun deleteTopic(id: String): Boolean {
        val db = writableDatabase
        db.beginTransaction()
        try {
            // Find all verses assigned to this topic
            val verseIds = mutableListOf<Long>()
            val c = db.rawQuery("SELECT verse_id FROM verse_topics WHERE topic_id = ?", arrayOf(id))
            c.use {
                while (it.moveToNext()) {
                    verseIds.add(it.getLong(0))
                }
            }

            // For each verse assigned to this topic:
            // If it belongs exclusively to this topic (i.e. total topics <= 1), delete the verse!
            for (vId in verseIds) {
                val countCursor = db.rawQuery("SELECT COUNT(*) FROM verse_topics WHERE verse_id = ?", arrayOf(vId.toString()))
                var topicCount = 0
                countCursor.use {
                    if (it.moveToNext()) topicCount = it.getInt(0)
                }
                if (topicCount <= 1) {
                    db.delete("user_verses", "id = ?", arrayOf(vId.toString()))
                }
            }

            // Remove mapping entries for this topic
            db.delete("verse_topics", "topic_id = ?", arrayOf(id))
            // Remove topic itself
            val rows = db.delete("topics", "id = ?", arrayOf(id))
            db.setTransactionSuccessful()
            return rows > 0
        } finally {
            db.endTransaction()
        }
    }

    fun toggleVerseTopic(verseId: Long, topicId: String): Boolean {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val cursor = db.rawQuery(
                "SELECT 1 FROM verse_topics WHERE verse_id = ? AND topic_id = ?",
                arrayOf(verseId.toString(), topicId)
            )
            val exists = cursor.use { it.moveToNext() }
            val nowActive: Boolean
            if (exists) {
                db.delete("verse_topics", "verse_id = ? AND topic_id = ?", arrayOf(verseId.toString(), topicId))
                nowActive = false
            } else {
                val values = ContentValues().apply {
                    put("verse_id", verseId)
                    put("topic_id", topicId)
                }
                db.insertWithOnConflict("verse_topics", null, values, SQLiteDatabase.CONFLICT_REPLACE)
                nowActive = true
            }
            db.setTransactionSuccessful()
            return nowActive
        } finally {
            db.endTransaction()
        }
    }

    fun tagVerse(verseId: Long, topicId: String) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put("verse_id", verseId)
            put("topic_id", topicId)
        }
        db.insertWithOnConflict("verse_topics", null, values, SQLiteDatabase.CONFLICT_IGNORE)
    }

    fun untagVerse(verseId: Long, topicId: String) {
        val db = writableDatabase
        db.delete("verse_topics", "verse_id = ? AND topic_id = ?", arrayOf(verseId.toString(), topicId))
    }

    fun tagVersesWithTopic(verses: List<Triple<Int, Int, Int>>, topicId: String) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            for ((bId, ch, vs) in verses) {
                val cursor = db.rawQuery(
                    "SELECT id FROM user_verses WHERE book_id = ? AND chapter = ? AND verse = ?",
                    arrayOf(bId.toString(), ch.toString(), vs.toString())
                )
                var verseId: Long? = null
                cursor.use {
                    if (it.moveToNext()) {
                        verseId = it.getLong(0)
                    }
                }
                if (verseId != null) {
                    val values = ContentValues().apply {
                        put("verse_id", verseId)
                        put("topic_id", topicId)
                    }
                    db.insertWithOnConflict("verse_topics", null, values, SQLiteDatabase.CONFLICT_IGNORE)
                }
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getTopicIdsForVerse(verseId: Long): List<String> {
        val db = readableDatabase
        val result = mutableListOf<String>()
        val cursor = db.rawQuery("SELECT topic_id FROM verse_topics WHERE verse_id = ?", arrayOf(verseId.toString()))
        cursor.use {
            while (it.moveToNext()) {
                result.add(it.getString(0))
            }
        }
        return result
    }

    fun getAllVerseTopicMappings(): Map<Long, List<String>> {
        val db = readableDatabase
        val map = mutableMapOf<Long, MutableList<String>>()
        val cursor = db.rawQuery("SELECT verse_id, topic_id FROM verse_topics", null)
        cursor.use {
            while (it.moveToNext()) {
                val vId = it.getLong(0)
                val tId = it.getString(1)
                map.getOrPut(vId) { mutableListOf() }.add(tId)
            }
        }
        return map
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
            "SELECT chapter, status, repetition, interval, efactor, next_due_date, lapses, attempts, pre_lapse_interval, chain_hits, chain_misses, last_chain_date FROM chapter_progress WHERE book_id = ?",
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
                    attempts = if (it.columnCount > 7) it.getInt(7) else 0,
                    preLapseInterval = if (it.columnCount > 8) it.getInt(8) else 0,
                    chainHits = if (it.columnCount > 9) it.getInt(9) else 0,
                    chainMisses = if (it.columnCount > 10) it.getInt(10) else 0,
                    lastChainDate = if (it.columnCount > 11) it.getLong(11) else 0L
                )
            }
        }
        return map
    }

    fun getAllChapterProgress(): List<ChapterProgressEntity> {
        val list = mutableListOf<ChapterProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, chapter, status, repetition, interval, efactor, next_due_date, lapses, attempts, pre_lapse_interval, chain_hits, chain_misses, last_chain_date FROM chapter_progress",
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
                        attempts = if (it.columnCount > 8) it.getInt(8) else 0,
                        preLapseInterval = if (it.columnCount > 9) it.getInt(9) else 0,
                        chainHits = if (it.columnCount > 10) it.getInt(10) else 0,
                        chainMisses = if (it.columnCount > 11) it.getInt(11) else 0,
                        lastChainDate = if (it.columnCount > 12) it.getLong(12) else 0L
                    )
                )
            }
        }
        return list
    }

    fun gradeChapterAnchor(bookId: Int, chapter: Int, score: Int): ChapterProgressEntity {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val result = gradeChapterAnchorInTransaction(bookId, chapter, score)
            db.setTransactionSuccessful()
            return result
        } finally {
            db.endTransaction()
        }
    }

    private fun gradeChapterAnchorInTransaction(bookId: Int, chapter: Int, score: Int): ChapterProgressEntity {
        val existing = getChapterProgress(bookId)[chapter]
        val rep = existing?.repetition ?: 0
        val interval = existing?.interval ?: 0
        val efactor = existing?.efactor ?: 2.5
        val lapses = existing?.lapses ?: 0
        val preLapseInterval = existing?.preLapseInterval ?: 0
        val attempts = (existing?.attempts ?: 0) + 1

        val scale = getAppSettings().intervalScale
        val now = System.currentTimeMillis()
        val prevEfactor = efactor
        val eval = SM2Engine.evaluate(
            repetition = rep,
            interval = interval,
            efactor = efactor,
            lapses = lapses,
            preLapseInterval = preLapseInterval,
            score = score,
            kind = ScheduleKind.ANCHOR,
            intervalScale = scale,
            now = now
        )

        val entity = ChapterProgressEntity(
            bookId = bookId,
            chapter = chapter,
            status = eval.status,
            repetition = eval.repetition,
            interval = eval.interval,
            efactor = eval.efactor,
            nextDueDate = eval.nextDueDate,
            lapses = eval.lapses,
            attempts = attempts,
            preLapseInterval = eval.preLapseInterval
        )

        val db = writableDatabase
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("chapter", chapter)
            put("status", eval.status)
            put("repetition", eval.repetition)
            put("interval", eval.interval)
            put("efactor", eval.efactor)
            put("next_due_date", eval.nextDueDate)
            put("lapses", eval.lapses)
            put("attempts", attempts)
            put("pre_lapse_interval", eval.preLapseInterval)
        }
        check(db.insertWithOnConflict("chapter_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L) { "Chapter progress was not updated" }

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", 0)
            put("score", score)
            put("review_date", now)
            put("prev_interval", interval)
            put("new_interval", eval.interval)
            put("prev_efactor", prevEfactor)
            put("new_efactor", eval.efactor)
            put("item_kind", "anchor")
            put("item_id", "$bookId:$chapter")
            put("cue_level", 0)
            put("mode", "reveal")
        }
        db.insertOrThrow("review_log", null, logValues)
        pruneReviewLog(db)

        return entity
    }

    fun getThemeProgress(bookId: Int): ThemeProgressEntity? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, status, repetition, interval, efactor, next_due_date, lapses, attempts, last_score, pre_lapse_interval FROM theme_progress WHERE book_id = ?",
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
                    lapses = if (it.columnCount > 6) it.getInt(6) else 0,
                    attempts = if (it.columnCount > 7) it.getInt(7) else 0,
                    lastScore = if (it.columnCount > 8) it.getInt(8) else 0,
                    preLapseInterval = if (it.columnCount > 9) it.getInt(9) else 0
                )
            }
        }
        return null
    }

    fun getAllThemeProgress(): Map<Int, ThemeProgressEntity> {
        val map = mutableMapOf<Int, ThemeProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, status, repetition, interval, efactor, next_due_date, lapses, attempts, last_score, pre_lapse_interval FROM theme_progress",
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
                    lapses = if (it.columnCount > 6) it.getInt(6) else 0,
                    attempts = if (it.columnCount > 7) it.getInt(7) else 0,
                    lastScore = if (it.columnCount > 8) it.getInt(8) else 0,
                    preLapseInterval = if (it.columnCount > 9) it.getInt(9) else 0
                )
            }
        }
        return map
    }

    fun gradeThemeProgress(bookId: Int, score: Int): ThemeProgressEntity {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val result = gradeThemeProgressInTransaction(bookId, score)
            db.setTransactionSuccessful()
            return result
        } finally {
            db.endTransaction()
        }
    }

    private fun gradeThemeProgressInTransaction(bookId: Int, score: Int): ThemeProgressEntity {
        val existing = getThemeProgress(bookId)
        val rep = existing?.repetition ?: 0
        val interval = existing?.interval ?: 0
        val efactor = existing?.efactor ?: 2.5
        val lapses = existing?.lapses ?: 0
        val preLapseInterval = existing?.preLapseInterval ?: 0
        val attempts = (existing?.attempts ?: 0) + 1

        val scale = getAppSettings().intervalScale
        val now = System.currentTimeMillis()
        val prevEfactor = efactor
        val eval = SM2Engine.evaluate(
            repetition = rep,
            interval = interval,
            efactor = efactor,
            lapses = lapses,
            preLapseInterval = preLapseInterval,
            score = score,
            kind = ScheduleKind.THEME,
            intervalScale = scale,
            now = now
        )

        val entity = ThemeProgressEntity(
            bookId = bookId,
            status = eval.status,
            repetition = eval.repetition,
            interval = eval.interval,
            efactor = eval.efactor,
            nextDueDate = eval.nextDueDate,
            lapses = eval.lapses,
            attempts = attempts,
            lastScore = score,
            preLapseInterval = eval.preLapseInterval
        )

        val db = writableDatabase
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("status", eval.status)
            put("repetition", eval.repetition)
            put("interval", eval.interval)
            put("efactor", eval.efactor)
            put("next_due_date", eval.nextDueDate)
            put("lapses", eval.lapses)
            put("attempts", attempts)
            put("last_score", score)
            put("pre_lapse_interval", eval.preLapseInterval)
        }
        check(db.insertWithOnConflict("theme_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L) { "Theme progress was not updated" }

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", 0)
            put("score", score)
            put("review_date", now)
            put("prev_interval", interval)
            put("new_interval", eval.interval)
            put("prev_efactor", prevEfactor)
            put("new_efactor", eval.efactor)
            put("item_kind", "theme")
            put("item_id", bookId.toString())
            put("cue_level", 0)
            put("mode", "reveal")
        }
        db.insertOrThrow("review_log", null, logValues)
        pruneReviewLog(db)

        return entity
    }

    fun getBlockProgress(bookId: Int): Map<Int, BlockProgressEntity> {
        val map = mutableMapOf<Int, BlockProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT block_index, label, status, repetition, interval, efactor,
                   next_due_date, lapses, attempts, last_score, last_accuracy,
                   last_attempt_date, pre_lapse_interval
            FROM block_progress WHERE book_id = ?
            """.trimIndent(),
            arrayOf(bookId.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                val bi = it.getInt(0)
                map[bi] = BlockProgressEntity(
                    bookId = bookId,
                    blockIndex = bi,
                    label = it.getString(1),
                    status = it.getString(2),
                    repetition = it.getInt(3),
                    interval = it.getInt(4),
                    efactor = it.getDouble(5),
                    nextDueDate = it.getLong(6),
                    lapses = if (it.columnCount > 7) it.getInt(7) else 0,
                    attempts = if (it.columnCount > 8) it.getInt(8) else 0,
                    lastScore = if (it.columnCount > 9) it.getInt(9) else 0,
                    lastAccuracy = if (it.columnCount > 10) it.getDouble(10) else 0.0,
                    lastAttemptDate = if (it.columnCount > 11) it.getLong(11) else 0L,
                    preLapseInterval = if (it.columnCount > 12) it.getInt(12) else 0
                )
            }
        }
        return map
    }

    fun getAllBlockProgress(): List<BlockProgressEntity> {
        val list = mutableListOf<BlockProgressEntity>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT book_id, block_index, label, status, repetition, interval, efactor,
                   next_due_date, lapses, attempts, last_score, last_accuracy,
                   last_attempt_date, pre_lapse_interval
            FROM block_progress
            """.trimIndent(),
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    BlockProgressEntity(
                        bookId = it.getInt(0),
                        blockIndex = it.getInt(1),
                        label = it.getString(2),
                        status = it.getString(3),
                        repetition = it.getInt(4),
                        interval = it.getInt(5),
                        efactor = it.getDouble(6),
                        nextDueDate = it.getLong(7),
                        lapses = if (it.columnCount > 8) it.getInt(8) else 0,
                        attempts = if (it.columnCount > 9) it.getInt(9) else 0,
                        lastScore = if (it.columnCount > 10) it.getInt(10) else 0,
                        lastAccuracy = if (it.columnCount > 11) it.getDouble(11) else 0.0,
                        lastAttemptDate = if (it.columnCount > 12) it.getLong(12) else 0L,
                        preLapseInterval = if (it.columnCount > 13) it.getInt(13) else 0
                    )
                )
            }
        }
        return list
    }

    fun gradeBlockChain(
        bookId: Int,
        blockIndex: Int,
        label: String,
        results: List<Pair<Int, Boolean>> // List of (chapter, isCorrect)
    ): BlockProgressEntity {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val result = gradeBlockChainInTransaction(bookId, blockIndex, label, results)
            db.setTransactionSuccessful()
            return result
        } finally {
            db.endTransaction()
        }
    }

    private fun gradeBlockChainInTransaction(bookId: Int, blockIndex: Int, label: String, results: List<Pair<Int, Boolean>>): BlockProgressEntity {
        val existing = getBlockProgress(bookId)[blockIndex]
        val rep = existing?.repetition ?: 0
        val interval = existing?.interval ?: 0
        val efactor = existing?.efactor ?: 2.5
        val lapses = existing?.lapses ?: 0
        val preLapseInterval = existing?.preLapseInterval ?: 0
        val attempts = (existing?.attempts ?: 0) + 1

        val correctCount = results.count { it.second }
        val accuracy = if (results.isNotEmpty()) correctCount.toDouble() / results.size else 0.0
        val score = when {
            accuracy >= 1.0 -> 5
            accuracy >= 0.85 -> 4
            accuracy >= 0.60 -> 3
            else -> 1
        }

        val scale = getAppSettings().intervalScale
        val now = System.currentTimeMillis()
        val prevEfactor = efactor
        val eval = SM2Engine.evaluate(
            repetition = rep,
            interval = interval,
            efactor = efactor,
            lapses = lapses,
            preLapseInterval = preLapseInterval,
            score = score,
            kind = ScheduleKind.CHAIN,
            intervalScale = scale,
            now = now
        )

        val entity = BlockProgressEntity(
            bookId = bookId,
            blockIndex = blockIndex,
            label = label,
            status = eval.status,
            repetition = eval.repetition,
            interval = eval.interval,
            efactor = eval.efactor,
            nextDueDate = eval.nextDueDate,
            lapses = eval.lapses,
            attempts = attempts,
            lastScore = score,
            lastAccuracy = accuracy,
            lastAttemptDate = now,
            preLapseInterval = eval.preLapseInterval
        )

        val db = writableDatabase
        val values = ContentValues().apply {
            put("book_id", bookId)
            put("block_index", blockIndex)
            put("label", label)
            put("status", eval.status)
            put("repetition", eval.repetition)
            put("interval", eval.interval)
            put("efactor", eval.efactor)
            put("next_due_date", eval.nextDueDate)
            put("lapses", eval.lapses)
            put("attempts", attempts)
            put("last_score", score)
            put("last_accuracy", accuracy)
            put("last_attempt_date", now)
            put("pre_lapse_interval", eval.preLapseInterval)
        }
        check(db.insertWithOnConflict("block_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L) { "Chain progress was not updated" }

        // Record in review log
        val logValues = ContentValues().apply {
            put("verse_id", 0)
            put("score", score)
            put("review_date", now)
            put("prev_interval", interval)
            put("new_interval", eval.interval)
            put("prev_efactor", prevEfactor)
            put("new_efactor", eval.efactor)
            put("item_kind", "chain")
            put("item_id", "$bookId:$blockIndex")
            put("cue_level", 0)
            put("mode", "chain")
        }
        db.insertOrThrow("review_log", null, logValues)
        pruneReviewLog(db)

        // Record chain pass for chapters (chain hits/misses)
        recordChainPass(bookId, results)

        return entity
    }

    fun recordChainPass(bookId: Int, results: List<Pair<Int, Boolean>>) {
        val db = writableDatabase
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            for ((chapter, isCorrect) in results) {
                val hitDelta = if (isCorrect) 1 else 0
                val missDelta = if (isCorrect) 0 else 1

                // First attempt update of existing chapter progress
                val cursor = db.rawQuery(
                    "SELECT chain_hits, chain_misses FROM chapter_progress WHERE book_id = ? AND chapter = ?",
                    arrayOf(bookId.toString(), chapter.toString())
                )
                val exists = cursor.use { it.moveToFirst() }

                if (exists) {
                    db.execSQL(
                        """
                        UPDATE chapter_progress
                        SET chain_hits = chain_hits + ?,
                            chain_misses = chain_misses + ?,
                            last_chain_date = ?
                        WHERE book_id = ? AND chapter = ?
                        """.trimIndent(),
                        arrayOf<Any>(hitDelta, missDelta, now, bookId, chapter)
                    )
                } else {
                    val cv = ContentValues().apply {
                        put("book_id", bookId)
                        put("chapter", chapter)
                        put("status", "learning")
                        put("repetition", 0)
                        put("interval", 0)
                        put("efactor", 2.5)
                        put("next_due_date", now)
                        put("lapses", 0)
                        put("attempts", 0)
                        put("pre_lapse_interval", 0)
                        put("chain_hits", hitDelta)
                        put("chain_misses", missDelta)
                        put("last_chain_date", now)
                    }
                    db.insertOrThrow("chapter_progress", null, cv)
                }
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getCachedVerses(version: String, bookId: Int, chapter: Int): List<Verse> {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT verse, text FROM remote_verse_cache WHERE version = ? AND book_id = ? AND chapter = ? ORDER BY verse ASC",
            arrayOf(version.uppercase(), bookId.toString(), chapter.toString())
        )
        val list = mutableListOf<Verse>()
        cursor.use {
            while (it.moveToNext()) {
                val vNum = it.getInt(0)
                val text = it.getString(1)
                list.add(
                    Verse(
                        id = (bookId * 1_000_000L) + (chapter * 1_000L) + vNum,
                        bookId = bookId,
                        chapter = chapter,
                        verse = vNum,
                        textTe = null,
                        textEn = text,
                        textTa = null
                    )
                )
            }
        }
        return list
    }

    fun saveCachedVerses(version: String, bookId: Int, chapter: Int, verses: List<Verse>) {
        if (verses.isEmpty()) return
        val db = writableDatabase
        db.beginTransaction()
        try {
            for (v in verses) {
                val cv = ContentValues().apply {
                    put("version", version.uppercase())
                    put("book_id", bookId)
                    put("chapter", chapter)
                    put("verse", v.verse)
                    put("text", v.textEn ?: v.textTe ?: "")
                }
                db.insertWithOnConflict("remote_verse_cache", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
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
        return db.insertOrThrow("cold_checks", null, values)
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
        db.insertOrThrow("session_adherence", null, values)
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
            fontFamily = getSetting("setting_fontFamily", "serif"),
            ttsEnabled = getSetting("setting_ttsEnabled", "true").toBoolean(),
            recallMasking = getSetting("setting_recallMasking", "false").toBoolean(),
            bionicReading = getSetting("setting_bionicReading", "false").toBoolean(),
            bibleVersion = getSetting("setting_bibleVersion", "LSB"),
            anchorReveal = getSetting("setting_anchorReveal", "tap"),
            dailyChapterTarget = getSetting("setting_dailyChapterTarget", "3").toIntOrNull() ?: 3,
            streakIncludesChapters = getSetting("setting_streakIncludesChapters", "true").toBoolean(),
            showSectionHeadings = getSetting("setting_showSectionHeadings", "true").toBoolean(),
            showVerseNumbers = getSetting("setting_showVerseNumbers", "true").toBoolean(),
            showParagraphMarks = getSetting("setting_showParagraphMarks", "true").toBoolean(),
            showCrossRefMarkers = getSetting("setting_showCrossRefMarkers", "true").toBoolean(),
            intervalScale = getSetting("setting_intervalScale", "1.0").toDoubleOrNull() ?: 1.0,
            lineSpacing = getSetting("setting_lineSpacing", "normal"),
            bionicIntensity = getSetting("setting_bionicIntensity", "medium")
        )
    }

    fun saveAppSettings(settings: AppSettings) {
        val db = writableDatabase
        db.beginTransaction()
        try {
        setSetting("setting_theme", settings.theme)
        setSetting("setting_fontSize", settings.fontSize.toString())
        setSetting("setting_fontFamily", settings.fontFamily)
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
        setSetting("setting_lineSpacing", settings.lineSpacing)
        setSetting("setting_bionicIntensity", settings.bionicIntensity)
        db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
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
        check(db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L) { "Setting was not saved" }
    }

    // Backup & Restore
    fun exportUserDataJson(): String {
        val db = writableDatabase
        db.beginTransactionNonExclusive()
        try {
        val root = JSONObject()
        root.put("formatVersion", 2)
        val versesArray = JSONArray()
        val userVerses = getUserVerses()
        for (v in userVerses) {
            val obj = JSONObject().apply {
                put("id", v.id)
                put("book_id", v.bookId)
                put("chapter", v.chapter)
                put("verse", v.verse)
                put("end_verse", v.endVerse ?: JSONObject.NULL)
                put("keyword", v.keyword ?: JSONObject.NULL)
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
        val cursor = db.rawQuery("SELECT book_id, chapter, status, repetition, interval, efactor, next_due_date, lapses, attempts, pre_lapse_interval, chain_hits, chain_misses, last_chain_date FROM chapter_progress", null)
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
                    put("pre_lapse_interval", it.getInt(9))
                    put("chain_hits", it.getInt(10))
                    put("chain_misses", it.getInt(11))
                    put("last_chain_date", it.getLong(12))
                }
                progressObj.put(key, item)
            }
        }
        root.put("chapterProgress", progressObj)

        // Block progress
        val blockObj = JSONObject()
        val blockCursor = db.rawQuery(
            "SELECT book_id, block_index, label, status, repetition, interval, efactor, next_due_date, lapses, attempts, last_score, last_accuracy, last_attempt_date, pre_lapse_interval FROM block_progress",
            null
        )
        blockCursor.use {
            while (it.moveToNext()) {
                val key = "${it.getInt(0)}:${it.getInt(1)}"
                val item = JSONObject().apply {
                    put("book_id", it.getInt(0))
                    put("block_index", it.getInt(1))
                    put("label", it.getString(2))
                    put("status", it.getString(3))
                    put("repetition", it.getInt(4))
                    put("interval", it.getInt(5))
                    put("efactor", it.getDouble(6))
                    put("next_due_date", it.getLong(7))
                    put("lapses", if (it.columnCount > 8) it.getInt(8) else 0)
                    put("attempts", if (it.columnCount > 9) it.getInt(9) else 0)
                    put("last_score", if (it.columnCount > 10) it.getInt(10) else 0)
                    put("last_accuracy", if (it.columnCount > 11) it.getDouble(11) else 0.0)
                    put("last_attempt_date", if (it.columnCount > 12) it.getLong(12) else 0L)
                    put("pre_lapse_interval", if (it.columnCount > 13) it.getInt(13) else 0)
                }
                blockObj.put(key, item)
            }
        }
        root.put("blockProgress", blockObj)

        val themeObj = JSONObject()
        db.rawQuery("SELECT book_id, status, repetition, interval, efactor, next_due_date, lapses, attempts, last_score, pre_lapse_interval FROM theme_progress", null).use {
            while (it.moveToNext()) {
                val item = JSONObject().apply {
                    put("book_id", it.getInt(0)); put("status", it.getString(1)); put("repetition", it.getInt(2))
                    put("interval", it.getInt(3)); put("efactor", it.getDouble(4)); put("next_due_date", it.getLong(5))
                    put("lapses", it.getInt(6)); put("attempts", it.getInt(7)); put("last_score", it.getInt(8)); put("pre_lapse_interval", it.getInt(9))
                }
                themeObj.put(it.getInt(0).toString(), item)
            }
        }
        root.put("themeProgress", themeObj)

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

        val adherenceArray = JSONArray()
        db.rawQuery("SELECT ts, completed, duration_ms, abandoned_at FROM session_adherence", null).use {
            while (it.moveToNext()) {
                val item = JSONObject().apply {
                    put("ts", it.getLong(0)); put("completed", it.getInt(1)); put("duration_ms", it.getLong(2))
                    if (!it.isNull(3)) put("abandoned_at", it.getInt(3))
                }
                adherenceArray.put(item)
            }
        }
        root.put("sessionAdherence", adherenceArray)

        // Stats & Settings
        val statsObj = JSONObject()
        val statsCursor = db.rawQuery("SELECT key, val FROM user_stats", null)
        statsCursor.use {
            while (it.moveToNext()) {
                statsObj.put(it.getString(0), it.getString(1))
            }
        }
        root.put("stats", statsObj)

        // Topics
        val topicsArray = JSONArray()
        val topicsCursor = db.rawQuery("SELECT id, name, created_at FROM topics", null)
        topicsCursor.use {
            while (it.moveToNext()) {
                val item = JSONObject().apply {
                    put("id", it.getString(0))
                    put("name", it.getString(1))
                    put("createdAt", it.getLong(2))
                }
                topicsArray.put(item)
            }
        }
        root.put("topics", topicsArray)

        // Verse topics
        val verseTopicsArray = JSONArray()
        val vtCursor = db.rawQuery("SELECT verse_id, topic_id FROM verse_topics", null)
        vtCursor.use {
            while (it.moveToNext()) {
                val item = JSONObject().apply {
                    put("verseId", it.getLong(0))
                    put("topicId", it.getString(1))
                }
                verseTopicsArray.put(item)
            }
        }
        root.put("verseTopics", verseTopicsArray)

        val result = root.toString(2)
        db.setTransactionSuccessful()
        return result
        } finally {
            db.endTransaction()
        }
    }

    fun restoreUserDataJson(jsonString: String): Boolean {
        return try {
            BackupInspector.inspect(jsonString)
            val root = JSONObject(jsonString)
            val db = writableDatabase
            db.beginTransaction()
            try {
                val verseIds = mutableMapOf<Long, Long>()
                val topicIds = mutableMapOf<String, String>()
                if (root.has("verses")) {
                    val arr = root.getJSONArray("verses")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val values = ContentValues().apply {
                            put("book_id", item.optInt("book_id", item.optInt("bookId", 1)))
                            put("chapter", item.optInt("chapter", 1))
                            put("verse", item.optInt("verse", 1))
                            if (item.has("status")) put("status", item.getString("status"))
                            if (item.has("repetition")) put("repetition", item.getInt("repetition"))
                            if (item.has("interval")) put("interval", item.getInt("interval"))
                            if (item.has("efactor")) put("efactor", item.getDouble("efactor"))
                            if (item.has("next_due_date") || item.has("nextDueDate")) put("next_due_date", if (item.has("next_due_date")) item.getLong("next_due_date") else item.getLong("nextDueDate"))
                            if (item.has("created_at") || item.has("createdAt")) put("created_at", if (item.has("created_at")) item.getLong("created_at") else item.getLong("createdAt"))
                            if (item.has("lapses")) put("lapses", item.getInt("lapses"))
                            if (item.has("pre_lapse_interval")) put("pre_lapse_interval", item.getInt("pre_lapse_interval"))
                            if (item.has("attempts")) put("attempts", item.getInt("attempts"))
                            if (item.has("end_verse") || item.has("endVerse")) {
                                val name = if (item.has("end_verse")) "end_verse" else "endVerse"
                                if (item.isNull(name)) putNull("end_verse") else put("end_verse", item.getInt(name))
                            }
                            if (item.has("keyword")) {
                                if (item.isNull("keyword")) putNull("keyword") else put("keyword", item.getString("keyword"))
                            }
                        }
                        val book = values.getAsInteger("book_id")
                        val chapter = values.getAsInteger("chapter")
                        val verse = values.getAsInteger("verse")
                        val localId = db.rawQuery("SELECT id FROM user_verses WHERE book_id = ? AND chapter = ? AND verse = ?",
                            arrayOf(book.toString(), chapter.toString(), verse.toString())).use { if (it.moveToFirst()) it.getLong(0) else null }
                        val resultId = if (localId != null) {
                            check(db.update("user_verses", values, "id = ?", arrayOf(localId.toString())) == 1)
                            localId
                        } else {
                            if (!values.containsKey("next_due_date")) values.put("next_due_date", System.currentTimeMillis())
                            if (!values.containsKey("created_at")) values.put("created_at", System.currentTimeMillis())
                            db.insertOrThrow("user_verses", null, values)
                        }
                        if (item.has("id")) verseIds[item.getLong("id")] = resultId
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
                            if (item.has("status")) put("status", item.getString("status"))
                            if (item.has("repetition")) put("repetition", item.getInt("repetition"))
                            if (item.has("interval")) put("interval", item.getInt("interval"))
                            if (item.has("efactor")) put("efactor", item.getDouble("efactor"))
                            if (item.has("next_due_date")) put("next_due_date", item.getLong("next_due_date"))
                            if (item.has("lapses")) put("lapses", item.getInt("lapses"))
                            if (item.has("attempts")) put("attempts", item.getInt("attempts"))
                            if (item.has("pre_lapse_interval")) put("pre_lapse_interval", item.getInt("pre_lapse_interval"))
                            if (item.has("chain_hits")) put("chain_hits", item.getInt("chain_hits"))
                            if (item.has("chain_misses")) put("chain_misses", item.getInt("chain_misses"))
                            if (item.has("last_chain_date")) put("last_chain_date", item.getLong("last_chain_date"))
                        }
                        val changed = db.update("chapter_progress", values, "book_id = ? AND chapter = ?",
                            arrayOf(values.getAsInteger("book_id").toString(), values.getAsInteger("chapter").toString()))
                        if (changed == 0) {
                            if (!values.containsKey("next_due_date")) values.put("next_due_date", System.currentTimeMillis())
                            db.insertOrThrow("chapter_progress", null, values)
                        }
                    }
                }

                if (root.has("blockProgress")) {
                    val prog = root.getJSONObject("blockProgress")
                    val keys = prog.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        val item = prog.getJSONObject(k)
                        val values = ContentValues().apply {
                            put("book_id", item.optInt("book_id", 1))
                            put("block_index", item.optInt("block_index", 0))
                            if (item.has("label")) put("label", item.getString("label"))
                            if (item.has("status")) put("status", item.getString("status"))
                            if (item.has("repetition")) put("repetition", item.getInt("repetition"))
                            if (item.has("interval")) put("interval", item.getInt("interval"))
                            if (item.has("efactor")) put("efactor", item.getDouble("efactor"))
                            if (item.has("next_due_date")) put("next_due_date", item.getLong("next_due_date"))
                            if (item.has("lapses")) put("lapses", item.getInt("lapses"))
                            if (item.has("attempts")) put("attempts", item.getInt("attempts"))
                            if (item.has("last_score")) put("last_score", item.getInt("last_score"))
                            if (item.has("last_accuracy")) put("last_accuracy", item.getDouble("last_accuracy"))
                            if (item.has("last_attempt_date")) put("last_attempt_date", item.getLong("last_attempt_date"))
                            if (item.has("pre_lapse_interval")) put("pre_lapse_interval", item.getInt("pre_lapse_interval"))
                        }
                        val changed = db.update("block_progress", values, "book_id = ? AND block_index = ?",
                            arrayOf(values.getAsInteger("book_id").toString(), values.getAsInteger("block_index").toString()))
                        if (changed == 0) {
                            if (!values.containsKey("label")) values.put("label", "")
                            if (!values.containsKey("next_due_date")) values.put("next_due_date", System.currentTimeMillis())
                            db.insertOrThrow("block_progress", null, values)
                        }
                    }
                }

                if (root.has("themeProgress")) {
                    val prog = root.getJSONObject("themeProgress")
                    for (key in prog.keys()) {
                        val item = prog.getJSONObject(key)
                        val values = ContentValues().apply {
                            put("book_id", item.getInt("book_id")); put("status", item.optString("status", "learning"))
                            put("repetition", item.optInt("repetition", 0)); put("interval", item.optInt("interval", 0))
                            put("efactor", item.optDouble("efactor", 2.5)); put("next_due_date", item.optLong("next_due_date", System.currentTimeMillis()))
                            put("lapses", item.optInt("lapses", 0)); put("attempts", item.optInt("attempts", 0))
                            put("last_score", item.optInt("last_score", 0)); put("pre_lapse_interval", item.optInt("pre_lapse_interval", 0))
                        }
                        check(db.insertWithOnConflict("theme_progress", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L)
                    }
                }

                if (root.has("reviewLog")) {
                    val arr = root.getJSONArray("reviewLog")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val kind = item.optString("item_kind", "verse")
                        val oldVerseId = item.optLong("verse_id", 0L)
                        val localVerseId = verseIds[oldVerseId] ?: 0L
                        val originalItemId = item.optString("item_id", "")
                        val mappedItemId = if (kind == "verse" && oldVerseId > 0L) {
                            if (localVerseId > 0L) localVerseId.toString() else "unlinked-backup:$oldVerseId"
                        } else originalItemId
                        val values = ContentValues().apply {
                            put("verse_id", localVerseId)
                            put("score", item.optInt("score", 3))
                            put("review_date", item.optLong("review_date", System.currentTimeMillis()))
                            put("prev_interval", item.optInt("prev_interval", 0))
                            put("new_interval", item.optInt("new_interval", 1))
                            put("prev_efactor", item.optDouble("prev_efactor", 2.5))
                            put("new_efactor", item.optDouble("new_efactor", 2.5))
                            put("item_kind", kind)
                            put("item_id", mappedItemId)
                            put("cue_level", item.optInt("cue_level", 0))
                            put("mode", item.optString("mode", "reveal"))
                            if (item.has("measured_accuracy")) {
                                put("measured_accuracy", item.optDouble("measured_accuracy"))
                            }
                        }
                        val exists = db.rawQuery("SELECT 1 FROM review_log WHERE verse_id = ? AND score = ? AND review_date = ? AND prev_interval = ? AND new_interval = ? AND prev_efactor = ? AND new_efactor = ? AND item_kind = ? AND item_id = ? AND cue_level = ? AND mode = ? AND COALESCE(measured_accuracy, -9999) = CAST(? AS REAL) LIMIT 1",
                            arrayOf(values.getAsString("verse_id"), values.getAsString("score"), values.getAsString("review_date"),
                                values.getAsString("prev_interval"), values.getAsString("new_interval"), values.getAsString("prev_efactor"),
                                values.getAsString("new_efactor"), kind, mappedItemId, values.getAsString("cue_level"), values.getAsString("mode"), values.getAsString("measured_accuracy") ?: "-9999"))
                            .use { it.moveToFirst() }
                        if (!exists) db.insertOrThrow("review_log", null, values)
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
                        val exists = db.rawQuery("SELECT 1 FROM cold_checks WHERE ts = ? AND correct = ? AND total = ? AND median_cold_for = ? LIMIT 1",
                            arrayOf(values.getAsString("ts"), values.getAsString("correct"), values.getAsString("total"), values.getAsString("median_cold_for"))).use { it.moveToFirst() }
                        if (!exists) db.insertOrThrow("cold_checks", null, values)
                    }
                }

                if (root.has("sessionAdherence")) {
                    val arr = root.getJSONArray("sessionAdherence")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val values = ContentValues().apply {
                            put("ts", item.getLong("ts")); put("completed", item.getInt("completed")); put("duration_ms", item.getLong("duration_ms"))
                            if (item.has("abandoned_at") && !item.isNull("abandoned_at")) put("abandoned_at", item.getInt("abandoned_at"))
                        }
                        val exists = db.rawQuery("SELECT 1 FROM session_adherence WHERE ts = ? AND completed = ? AND duration_ms = ? AND COALESCE(abandoned_at, -1) = CAST(? AS INTEGER) LIMIT 1",
                            arrayOf(values.getAsString("ts"), values.getAsString("completed"), values.getAsString("duration_ms"), values.getAsString("abandoned_at") ?: "-1")).use { it.moveToFirst() }
                        if (!exists) db.insertOrThrow("session_adherence", null, values)
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
                        check(db.insertWithOnConflict("user_stats", null, values, SQLiteDatabase.CONFLICT_REPLACE) != -1L)
                    }
                }

                if (root.has("topics")) {
                    val arr = root.getJSONArray("topics")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val originalId = item.getString("id")
                        val name = item.getString("name")
                        val existingName = db.rawQuery("SELECT name FROM topics WHERE id = ?", arrayOf(originalId)).use { if (it.moveToFirst()) it.getString(0) else null }
                        val matchingId = db.rawQuery("SELECT id FROM topics WHERE LOWER(name) = LOWER(?) LIMIT 1", arrayOf(name.trim())).use { if (it.moveToFirst()) it.getString(0) else null }
                        val localId = when {
                            existingName != null && existingName.equals(name, ignoreCase = true) -> originalId
                            matchingId != null -> matchingId
                            existingName != null -> UUID.randomUUID().toString()
                            else -> originalId
                        }
                        topicIds[originalId] = localId
                        val values = ContentValues().apply {
                            put("id", localId)
                            put("name", item.getString("name"))
                            put("created_at", item.optLong("createdAt", item.optLong("created_at", System.currentTimeMillis())))
                        }
                        val localExists = db.rawQuery("SELECT 1 FROM topics WHERE id = ?", arrayOf(localId)).use { it.moveToFirst() }
                        if (!localExists) db.insertOrThrow("topics", null, values)
                    }
                }

                if (root.has("verseTopics")) {
                    val arr = root.getJSONArray("verseTopics")
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        val values = ContentValues().apply {
                            val originalVerseId = if (item.has("verseId")) item.getLong("verseId") else item.getLong("verse_id")
                            val originalTopicId = if (item.has("topicId")) item.getString("topicId") else item.getString("topic_id")
                            put("verse_id", requireNotNull(verseIds[originalVerseId]))
                            put("topic_id", requireNotNull(topicIds[originalTopicId]))
                        }
                        val added = db.insertWithOnConflict("verse_topics", null, values, SQLiteDatabase.CONFLICT_IGNORE)
                        if (added == -1L) {
                            check(db.rawQuery("SELECT 1 FROM verse_topics WHERE verse_id = ? AND topic_id = ?",
                                arrayOf(values.getAsString("verse_id"), values.getAsString("topic_id"))).use { it.moveToFirst() })
                        }
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
            db.delete("block_progress", null, null)
            db.delete("theme_progress", null, null)
            db.delete("session_state", null, null)
            db.delete("review_log", null, null)
            db.delete("cold_checks", null, null)
            db.delete("session_adherence", null, null)
            db.delete("user_stats", null, null)
            db.delete("topics", null, null)
            db.delete("verse_topics", null, null)
            db.delete("remote_verse_cache", null, null)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }
}


