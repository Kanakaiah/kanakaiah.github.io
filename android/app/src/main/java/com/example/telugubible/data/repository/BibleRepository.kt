package com.example.telugubible.data.repository

import android.content.Context
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseSearchResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BibleRepository(
    private val bibleDbHelper: BibleDatabaseHelper,
    private val userDbHelper: UserDatabaseHelper
) {

    constructor(context: Context) : this(
        BibleDatabaseHelper.getInstance(context),
        UserDatabaseHelper.getInstance(context)
    )

    constructor(bibleDbHelper: BibleDatabaseHelper) : this(
        bibleDbHelper,
        UserDatabaseHelper.getInstance(bibleDbHelper.context)
    )

    suspend fun getBooks(): List<Book> = withContext(Dispatchers.IO) {
        bibleDbHelper.getAllBooks()
    }

    suspend fun getBook(bookId: Int): Book? = withContext(Dispatchers.IO) {
        bibleDbHelper.getBook(bookId)
    }

    suspend fun getVerses(bookId: Int, chapter: Int): List<Verse> = withContext(Dispatchers.IO) {
        bibleDbHelper.getVerses(bookId, chapter)
    }

    suspend fun getParagraphBreaks(bookId: Int, chapter: Int): Set<Int> = withContext(Dispatchers.IO) {
        bibleDbHelper.getParagraphBreaks(bookId, chapter)
    }

    suspend fun getStrongs(id: String): StrongsEntry? = withContext(Dispatchers.IO) {
        bibleDbHelper.getStrongs(id)
    }

    suspend fun searchVerses(query: String, limit: Int = 40): List<VerseSearchResult> = withContext(Dispatchers.IO) {
        bibleDbHelper.searchVerses(query, limit)
    }

    suspend fun searchStrongs(query: String, limit: Int = 30): List<StrongsEntry> = withContext(Dispatchers.IO) {
        bibleDbHelper.searchStrongs(query, limit)
    }

    suspend fun getUserMemoryVerses(): List<UserMemoryVerse> = withContext(Dispatchers.IO) {
        val userVerses = userDbHelper.getUserVerses()
        if (userVerses.isEmpty()) return@withContext emptyList()

        val booksMap = bibleDbHelper.getBooksMap()
        val verseKeys = userVerses.map { Triple(it.bookId, it.chapter, it.verse) }
        val verseTexts = bibleDbHelper.getVerseTexts(verseKeys)

        userVerses.map { uv ->
            val book = booksMap[uv.bookId]
            val (textTe, textEn) = verseTexts[Triple(uv.bookId, uv.chapter, uv.verse)] ?: Pair(null, null)
            UserMemoryVerse(
                id = uv.id,
                bookId = uv.bookId,
                bookKey = book?.key ?: "",
                bookNameEn = book?.nameEn ?: "",
                bookNameTe = book?.nameTe ?: "",
                chapter = uv.chapter,
                verse = uv.verse,
                textTe = textTe,
                textEn = textEn,
                status = uv.status,
                repetition = uv.repetition,
                interval = uv.interval,
                efactor = uv.efactor,
                nextDueDate = uv.nextDueDate,
                createdAt = uv.createdAt
            )
        }
    }

    suspend fun addUserVerse(bookId: Int, chapter: Int, verse: Int): Boolean = withContext(Dispatchers.IO) {
        userDbHelper.addUserVerse(bookId, chapter, verse)
    }

    suspend fun removeUserVerse(id: Long) = withContext(Dispatchers.IO) {
        userDbHelper.removeUserVerse(id)
    }

    suspend fun gradeUserVerse(id: Long, score: Int) = withContext(Dispatchers.IO) {
        userDbHelper.gradeUserVerse(id, score)
    }

    suspend fun getStreak(): Int = withContext(Dispatchers.IO) {
        userDbHelper.getStreak()
    }

    suspend fun setStreak(streak: Int) = withContext(Dispatchers.IO) {
        userDbHelper.setStreak(streak)
    }

    suspend fun getSessionState(key: String): String? = withContext(Dispatchers.IO) {
        userDbHelper.getSessionState(key)
    }

    suspend fun setSessionState(key: String, value: String?) = withContext(Dispatchers.IO) {
        userDbHelper.setSessionState(key, value)
    }

    suspend fun getPresetCollections(): List<PresetCollection> = withContext(Dispatchers.IO) {
        bibleDbHelper.getPresetCollections()
    }

    suspend fun addPresetCollection(collectionId: String): Int = withContext(Dispatchers.IO) {
        val verses = bibleDbHelper.getPresetVerses(collectionId)
        userDbHelper.addUserVerses(verses)
    }
}
