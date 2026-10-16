package com.example.telugubible.data.db

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseSearchResult
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

class BibleDatabaseHelper(private val context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {

    companion object {
        const val DB_NAME = "bible.db"
        const val DB_VERSION = 2
        private const val PREFS_NAME = "bible_db_prefs"
        private const val KEY_COPIED_VERSION = "copied_db_version"
    }

    private val dbPath: File
        get() = context.getDatabasePath(DB_NAME)

    init {
        copyDatabaseIfNeeded()
    }

    private fun copyDatabaseIfNeeded() {
        val dbFile = dbPath
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val copiedVersion = prefs.getInt(KEY_COPIED_VERSION, 0)

        if (!dbFile.exists() || dbFile.length() == 0L || copiedVersion < DB_VERSION) {
            dbFile.parentFile?.mkdirs()
            context.assets.open(DB_NAME).use { input ->
                FileOutputStream(dbFile).use { output ->
                    input.copyTo(output)
                }
            }
            prefs.edit().putInt(KEY_COPIED_VERSION, DB_VERSION).apply()
        }
    }

    override fun onCreate(db: SQLiteDatabase?) {
        // Pre-populated from asset
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        // Handled by copying fresh asset in copyDatabaseIfNeeded
    }

    fun getAllBooks(): List<Book> {
        val list = mutableListOf<Book>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_key, name_en, name_te, name_ta, testament, section, chapters, theme_word, key_word, subtitle FROM books ORDER BY id ASC",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    Book(
                        id = it.getInt(0),
                        key = it.getString(1),
                        nameEn = it.getString(2),
                        nameTe = it.getString(3),
                        nameTa = if (it.isNull(4)) null else it.getString(4),
                        testament = it.getString(5),
                        section = it.getString(6),
                        chapters = it.getInt(7),
                        themeWord = if (it.isNull(8)) "" else it.getString(8),
                        keyWord = if (it.isNull(9)) "" else it.getString(9),
                        subtitle = if (it.isNull(10)) "" else it.getString(10)
                    )
                )
            }
        }
        return list
    }

    fun getBook(bookId: Int): Book? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_key, name_en, name_te, name_ta, testament, section, chapters, theme_word, key_word, subtitle FROM books WHERE id = ?",
            arrayOf(bookId.toString())
        )
        cursor.use {
            if (it.moveToNext()) {
                return Book(
                    id = it.getInt(0),
                    key = it.getString(1),
                    nameEn = it.getString(2),
                    nameTe = it.getString(3),
                    nameTa = if (it.isNull(4)) null else it.getString(4),
                    testament = it.getString(5),
                    section = it.getString(6),
                    chapters = it.getInt(7),
                    themeWord = if (it.isNull(8)) "" else it.getString(8),
                    keyWord = if (it.isNull(9)) "" else it.getString(9),
                    subtitle = if (it.isNull(10)) "" else it.getString(10)
                )
            }
        }
        return null
    }

    fun getVerses(bookId: Int, chapter: Int): List<Verse> {
        val list = mutableListOf<Verse>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_id, chapter, verse, text_te, text_en, text_ta FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse ASC",
            arrayOf(bookId.toString(), chapter.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    Verse(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        chapter = it.getInt(2),
                        verse = it.getInt(3),
                        textTe = if (it.isNull(4)) null else it.getString(4),
                        textEn = if (it.isNull(5)) null else it.getString(5),
                        textTa = if (it.isNull(6)) null else it.getString(6)
                    )
                )
            }
        }
        return list
    }

    fun getParagraphBreaks(bookId: Int, chapter: Int): Set<Int> {
        val set = mutableSetOf<Int>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT verse FROM paragraph_breaks WHERE book_id = ? AND chapter = ?",
            arrayOf(bookId.toString(), chapter.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                set.add(it.getInt(0))
            }
        }
        return set
    }

    fun getStrongs(id: String): StrongsEntry? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, lang, lemma, xlit, pron, derivation, strongs_def, kjv_def, pos FROM strongs WHERE id = ?",
            arrayOf(id.uppercase())
        )
        cursor.use {
            if (it.moveToNext()) {
                return StrongsEntry(
                    id = it.getString(0),
                    lang = it.getString(1),
                    lemma = if (it.isNull(2)) null else it.getString(2),
                    xlit = if (it.isNull(3)) null else it.getString(3),
                    pron = if (it.isNull(4)) null else it.getString(4),
                    derivation = if (it.isNull(5)) null else it.getString(5),
                    strongsDef = if (it.isNull(6)) null else it.getString(6),
                    kjvDef = if (it.isNull(7)) null else it.getString(7),
                    pos = if (it.isNull(8)) null else it.getString(8)
                )
            }
        }
        return null
    }

    fun searchVerses(query: String, limit: Int = 40): List<VerseSearchResult> {
        val list = mutableListOf<VerseSearchResult>()
        if (query.isBlank()) return list
        val db = readableDatabase
        val searchPattern = "%${query.trim()}%"
        val cursor = db.rawQuery(
            """
            SELECT v.id, v.book_id, b.book_key, b.name_en, b.name_te, v.chapter, v.verse, v.text_te, v.text_en 
            FROM verses v 
            JOIN books b ON v.book_id = b.id 
            WHERE v.text_en LIKE ? OR v.text_te LIKE ?
            ORDER BY v.book_id ASC, v.chapter ASC, v.verse ASC 
            LIMIT ?
            """.trimIndent(),
            arrayOf(searchPattern, searchPattern, limit.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    VerseSearchResult(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        bookKey = it.getString(2),
                        bookNameEn = it.getString(3),
                        bookNameTe = it.getString(4),
                        chapter = it.getInt(5),
                        verse = it.getInt(6),
                        textTe = if (it.isNull(7)) null else it.getString(7),
                        textEn = if (it.isNull(8)) null else it.getString(8)
                    )
                )
            }
        }
        return list
    }

    fun searchStrongs(query: String, limit: Int = 30): List<StrongsEntry> {
        val list = mutableListOf<StrongsEntry>()
        if (query.isBlank()) return list
        val db = readableDatabase
        val trimmed = query.trim()
        val searchPattern = "%$trimmed%"
        val cursor = db.rawQuery(
            """
            SELECT id, lang, lemma, xlit, pron, derivation, strongs_def, kjv_def, pos 
            FROM strongs 
            WHERE id = ? OR lemma LIKE ? OR xlit LIKE ? OR strongs_def LIKE ? OR kjv_def LIKE ?
            LIMIT ?
            """.trimIndent(),
            arrayOf(trimmed.uppercase(), searchPattern, searchPattern, searchPattern, searchPattern, limit.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    StrongsEntry(
                        id = it.getString(0),
                        lang = it.getString(1),
                        lemma = if (it.isNull(2)) null else it.getString(2),
                        xlit = if (it.isNull(3)) null else it.getString(3),
                        pron = if (it.isNull(4)) null else it.getString(4),
                        derivation = if (it.isNull(5)) null else it.getString(5),
                        strongsDef = if (it.isNull(6)) null else it.getString(6),
                        kjvDef = if (it.isNull(7)) null else it.getString(7),
                        pos = if (it.isNull(8)) null else it.getString(8)
                    )
                )
            }
        }
        return list
    }

    fun getUserMemoryVerses(): List<UserMemoryVerse> {
        val list = mutableListOf<UserMemoryVerse>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT uv.id, uv.book_id, b.book_key, b.name_en, b.name_te, uv.chapter, uv.verse, 
                   v.text_te, v.text_en, uv.status, uv.repetition, uv.interval, uv.efactor, 
                   uv.next_due_date, uv.created_at
            FROM user_verses uv
            JOIN books b ON uv.book_id = b.id
            LEFT JOIN verses v ON v.book_id = uv.book_id AND v.chapter = uv.chapter AND v.verse = uv.verse
            ORDER BY uv.next_due_date ASC
            """.trimIndent(),
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    UserMemoryVerse(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        bookKey = it.getString(2),
                        bookNameEn = it.getString(3),
                        bookNameTe = it.getString(4),
                        chapter = it.getInt(5),
                        verse = it.getInt(6),
                        textTe = if (it.isNull(7)) null else it.getString(7),
                        textEn = if (it.isNull(8)) null else it.getString(8),
                        status = it.getString(9),
                        repetition = it.getInt(10),
                        interval = it.getInt(11),
                        efactor = it.getDouble(12),
                        nextDueDate = it.getLong(13),
                        createdAt = it.getLong(14)
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
        }
        val rowId = db.insertWithOnConflict("user_verses", null, values, SQLiteDatabase.CONFLICT_IGNORE)
        return rowId != -1L
    }

    fun removeUserVerse(id: Long) {
        val db = writableDatabase
        db.delete("user_verses", "id = ?", arrayOf(id.toString()))
    }

    fun gradeUserVerse(id: Long, score: Int) {
        val db = writableDatabase
        val cursor = db.rawQuery(
            "SELECT repetition, interval, efactor FROM user_verses WHERE id = ?",
            arrayOf(id.toString())
        )
        var rep = 0
        var interval = 0
        var efactor = 2.5

        cursor.use {
            if (it.moveToNext()) {
                rep = it.getInt(0)
                interval = it.getInt(1)
                efactor = it.getDouble(2)
            } else {
                return
            }
        }

        // Remora SuperMemo-2 (SM-2) algorithm
        // score: 1 = Blank, 3 = Hard, 4 = Good, 5 = Easy
        if (score < 3) {
            rep = 0
            interval = 1
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
        }
        db.update("user_verses", values, "id = ?", arrayOf(id.toString()))
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
}
