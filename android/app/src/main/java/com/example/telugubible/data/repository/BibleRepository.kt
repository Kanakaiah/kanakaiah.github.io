package com.example.telugubible.data.repository

import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.Verse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BibleRepository(private val dbHelper: BibleDatabaseHelper) {

    suspend fun getBooks(): List<Book> = withContext(Dispatchers.IO) {
        dbHelper.getAllBooks()
    }

    suspend fun getBook(bookId: Int): Book? = withContext(Dispatchers.IO) {
        dbHelper.getBook(bookId)
    }

    suspend fun getVerses(bookId: Int, chapter: Int): List<Verse> = withContext(Dispatchers.IO) {
        dbHelper.getVerses(bookId, chapter)
    }

    suspend fun getParagraphBreaks(bookId: Int, chapter: Int): Set<Int> = withContext(Dispatchers.IO) {
        dbHelper.getParagraphBreaks(bookId, chapter)
    }

    suspend fun getStrongs(id: String): StrongsEntry? = withContext(Dispatchers.IO) {
        dbHelper.getStrongs(id)
    }
}
