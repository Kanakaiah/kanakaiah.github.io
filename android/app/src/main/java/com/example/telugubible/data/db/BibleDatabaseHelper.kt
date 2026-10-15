package com.example.telugubible.data.db

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.Verse
import java.io.File
import java.io.FileOutputStream

class BibleDatabaseHelper(private val context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {

    companion object {
        const val DB_NAME = "bible.db"
        const val DB_VERSION = 1
    }

    private val dbPath: File
        get() = context.getDatabasePath(DB_NAME)

    init {
        copyDatabaseIfNeeded()
    }

    private fun copyDatabaseIfNeeded() {
        val dbFile = dbPath
        if (!dbFile.exists() || dbFile.length() == 0L) {
            dbFile.parentFile?.mkdirs()
            context.assets.open(DB_NAME).use { input ->
                FileOutputStream(dbFile).use { output ->
                    input.copyTo(output)
                }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase?) {
        // Pre-populated from asset
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        // Pre-populated
    }

    fun getAllBooks(): List<Book> {
        val list = mutableListOf<Book>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_key, name_en, name_te, name_ta, testament, section, chapters FROM books ORDER BY id ASC",
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
                        chapters = it.getInt(7)
                    )
                )
            }
        }
        return list
    }

    fun getBook(bookId: Int): Book? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_key, name_en, name_te, name_ta, testament, section, chapters FROM books WHERE id = ?",
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
                    chapters = it.getInt(7)
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
}
