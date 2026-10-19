package com.example.telugubible.data.repository

import android.content.Context
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.db.ThemeProgressEntity
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.AdherenceStats
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.BookGuide
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.ColdCheckResult
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.ReviewLogEntry
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseSearchResult
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BibleRepository(
    private val bibleDbHelper: BibleDatabaseHelper,
    private val userDbHelper: UserDatabaseHelper,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {

    constructor(context: Context) : this(
        BibleDatabaseHelper.getInstance(context),
        UserDatabaseHelper.getInstance(context),
        Dispatchers.IO
    )

    constructor(bibleDbHelper: BibleDatabaseHelper) : this(
        bibleDbHelper,
        UserDatabaseHelper.getInstance(bibleDbHelper.context),
        Dispatchers.IO
    )

    suspend fun getBooks(): List<Book> = withContext(ioDispatcher) {
        bibleDbHelper.getAllBooks()
    }

    suspend fun getBook(bookId: Int): Book? = withContext(ioDispatcher) {
        bibleDbHelper.getBook(bookId)
    }

    suspend fun getVerses(bookId: Int, chapter: Int): List<Verse> = withContext(ioDispatcher) {
        bibleDbHelper.getVerses(bookId, chapter)
    }

    suspend fun getParagraphBreaks(bookId: Int, chapter: Int): Set<Int> = withContext(ioDispatcher) {
        bibleDbHelper.getParagraphBreaks(bookId, chapter)
    }

    suspend fun getStrongs(id: String): StrongsEntry? = withContext(ioDispatcher) {
        bibleDbHelper.getStrongs(id)
    }

    suspend fun searchVerses(query: String, limit: Int = 40): List<VerseSearchResult> = withContext(ioDispatcher) {
        bibleDbHelper.searchVerses(query, limit)
    }

    suspend fun searchStrongs(query: String, limit: Int = 30): List<StrongsEntry> = withContext(ioDispatcher) {
        bibleDbHelper.searchStrongs(query, limit)
    }

    suspend fun getUserMemoryVerses(): List<UserMemoryVerse> = withContext(ioDispatcher) {
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
                createdAt = uv.createdAt,
                lapses = uv.lapses,
                attempts = uv.attempts
            )
        }
    }

    suspend fun addUserVerse(bookId: Int, chapter: Int, verse: Int): Boolean = withContext(ioDispatcher) {
        userDbHelper.addUserVerse(bookId, chapter, verse)
    }

    suspend fun removeUserVerse(id: Long) = withContext(ioDispatcher) {
        userDbHelper.removeUserVerse(id)
    }

    suspend fun gradeUserVerse(
        id: Long,
        score: Int,
        cueLevel: Int = 0,
        mode: String = "reveal",
        measuredAccuracy: Double? = null
    ) = withContext(ioDispatcher) {
        userDbHelper.gradeUserVerse(id, score, cueLevel, mode, measuredAccuracy)
    }

    suspend fun getStreak(): Int = withContext(ioDispatcher) {
        userDbHelper.getStreak()
    }

    suspend fun setStreak(streak: Int) = withContext(ioDispatcher) {
        userDbHelper.setStreak(streak)
    }

    suspend fun getSessionState(key: String): String? = withContext(ioDispatcher) {
        userDbHelper.getSessionState(key)
    }

    suspend fun setSessionState(key: String, value: String?) = withContext(ioDispatcher) {
        userDbHelper.setSessionState(key, value)
    }

    suspend fun getPresetCollections(): List<PresetCollection> = withContext(ioDispatcher) {
        bibleDbHelper.getPresetCollections()
    }

    suspend fun addPresetCollection(collectionId: String): Int = withContext(ioDispatcher) {
        val verses = bibleDbHelper.getPresetVerses(collectionId)
        userDbHelper.addUserVerses(verses)
    }

    suspend fun getBookGuide(bookId: Int): BookGuide? = withContext(ioDispatcher) {
        bibleDbHelper.getBookGuide(bookId)
    }

    suspend fun getChapterAnchors(bookId: Int): List<ChapterAnchor> = withContext(ioDispatcher) {
        bibleDbHelper.getChapterAnchors(bookId)
    }

    suspend fun getChapterProgress(bookId: Int): Map<Int, ChapterProgressEntity> = withContext(ioDispatcher) {
        userDbHelper.getChapterProgress(bookId)
    }

    suspend fun getAllChapterProgress(): List<ChapterProgressEntity> = withContext(ioDispatcher) {
        userDbHelper.getAllChapterProgress()
    }

    suspend fun gradeChapterAnchor(bookId: Int, chapter: Int, score: Int): ChapterProgressEntity = withContext(ioDispatcher) {
        userDbHelper.gradeChapterAnchor(bookId, chapter, score)
    }

    suspend fun getReviewLog(): List<ReviewLogEntry> = withContext(ioDispatcher) {
        userDbHelper.getReviewLog()
    }

    suspend fun recordColdCheck(correct: Int, total: Int, medianColdFor: Int): Long = withContext(ioDispatcher) {
        userDbHelper.recordColdCheck(correct, total, medianColdFor)
    }

    suspend fun getLastColdCheck(): ColdCheckResult? = withContext(ioDispatcher) {
        userDbHelper.getLastColdCheck()
    }

    suspend fun recordSessionAdherence(completed: Boolean, durationMs: Long, abandonedAt: Int? = null) = withContext(ioDispatcher) {
        userDbHelper.recordSessionAdherence(completed, durationMs, abandonedAt)
    }

    suspend fun getAdherenceStats(): AdherenceStats = withContext(ioDispatcher) {
        userDbHelper.getAdherenceStats()
    }

    suspend fun updateIntervalScale(scale: Double) = withContext(ioDispatcher) {
        userDbHelper.updateIntervalScale(scale)
    }

    suspend fun getAppSettings(): AppSettings = withContext(ioDispatcher) {
        userDbHelper.getAppSettings()
    }

    suspend fun saveAppSettings(settings: AppSettings) = withContext(ioDispatcher) {
        userDbHelper.saveAppSettings(settings)
    }

    suspend fun exportUserDataJson(): String = withContext(ioDispatcher) {
        userDbHelper.exportUserDataJson()
    }

    suspend fun restoreUserDataJson(jsonString: String): Boolean = withContext(ioDispatcher) {
        userDbHelper.restoreUserDataJson(jsonString)
    }

    suspend fun clearAllUserData() = withContext(ioDispatcher) {
        userDbHelper.clearAllUserData()
    }

    suspend fun getThemeProgress(bookId: Int): ThemeProgressEntity? = withContext(ioDispatcher) {
        userDbHelper.getThemeProgress(bookId)
    }

    suspend fun getAllThemeProgress(): Map<Int, ThemeProgressEntity> = withContext(ioDispatcher) {
        userDbHelper.getAllThemeProgress()
    }

    suspend fun gradeThemeProgress(bookId: Int, score: Int): ThemeProgressEntity = withContext(ioDispatcher) {
        userDbHelper.gradeThemeProgress(bookId, score)
    }
}


