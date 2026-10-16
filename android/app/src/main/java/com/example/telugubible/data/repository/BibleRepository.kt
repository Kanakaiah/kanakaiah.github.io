package com.example.telugubible.data.repository

import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseSearchResult
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

    suspend fun searchVerses(query: String, limit: Int = 40): List<VerseSearchResult> = withContext(Dispatchers.IO) {
        dbHelper.searchVerses(query, limit)
    }

    suspend fun searchStrongs(query: String, limit: Int = 30): List<StrongsEntry> = withContext(Dispatchers.IO) {
        dbHelper.searchStrongs(query, limit)
    }

    suspend fun getUserMemoryVerses(): List<UserMemoryVerse> = withContext(Dispatchers.IO) {
        dbHelper.getUserMemoryVerses()
    }

    suspend fun addUserVerse(bookId: Int, chapter: Int, verse: Int): Boolean = withContext(Dispatchers.IO) {
        dbHelper.addUserVerse(bookId, chapter, verse)
    }

    suspend fun removeUserVerse(id: Long) = withContext(Dispatchers.IO) {
        dbHelper.removeUserVerse(id)
    }

    suspend fun gradeUserVerse(id: Long, score: Int) = withContext(Dispatchers.IO) {
        dbHelper.gradeUserVerse(id, score)
    }

    suspend fun getStreak(): Int = withContext(Dispatchers.IO) {
        dbHelper.getStreak()
    }
}
