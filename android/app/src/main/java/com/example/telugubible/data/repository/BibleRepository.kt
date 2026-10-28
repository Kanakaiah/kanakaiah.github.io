package com.example.telugubible.data.repository

import android.content.Context
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.BlockProgressEntity
import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.db.ThemeProgressEntity
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.AdherenceStats
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.BookGuide
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.ColdCheckResult
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.ReviewLogEntry
import com.example.telugubible.data.model.StepBibleWord
import com.example.telugubible.data.model.StepBibleWordOccurrence
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.data.service.BollsBibleService
import com.example.telugubible.data.service.KjvService
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseConnectionsData
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.util.BookMasteryCounts
import com.example.telugubible.util.MasteryUtils
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class BibleRepository(
    private val bibleDbHelper: BibleDatabaseHelper,
    private val userDbHelper: UserDatabaseHelper,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val kjvService: KjvService = KjvService(ioDispatcher),
    private val bollsBibleService: BollsBibleService = BollsBibleService(ioDispatcher)
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

    suspend fun getChapterVerses(bookId: Int, chapter: Int, version: String): List<Verse> = withContext(ioDispatcher) {
        val v = version.uppercase()
        when (v) {
            "BSB" -> bibleDbHelper.getVerses(bookId, chapter)
            "TELIRV" -> bibleDbHelper.getVerses(bookId, chapter)
            "TBSI" -> bibleDbHelper.getVerses(bookId, chapter)
            else -> {
                // Check persistent cache
                val cached = userDbHelper.getCachedVerses(v, bookId, chapter)
                val cachedHasHeadings = cached.any {
                    Regex("<b\\b[^>]*>", RegexOption.IGNORE_CASE).containsMatchIn(it.textEn ?: "")
                }
                if (cached.isNotEmpty() && (v != "LSB" || cachedHasHeadings)) {
                    return@withContext cached
                }
                // Try remote Bolls Life API
                val remote = bollsBibleService.fetchChapter(v, bookId, chapter)
                if (!remote.isNullOrEmpty()) {
                    userDbHelper.saveCachedVerses(v, bookId, chapter, remote)
                    return@withContext remote
                }
                if (cached.isNotEmpty()) {
                    return@withContext cached
                }
                // Fallback to local BSB
                bibleDbHelper.getVerses(bookId, chapter)
            }
        }
    }

    suspend fun getBooks(): List<Book> = withContext(ioDispatcher) {
        bibleDbHelper.getAllBooks()
    }

    suspend fun getBook(bookId: Int): Book? = withContext(ioDispatcher) {
        bibleDbHelper.getBook(bookId)
    }

    suspend fun getVerses(bookId: Int, chapter: Int): List<Verse> = withContext(ioDispatcher) {
        bibleDbHelper.getVerses(bookId, chapter)
    }

    suspend fun getVerse(bookId: Int, chapter: Int, verse: Int): Verse? = withContext(ioDispatcher) {
        bibleDbHelper.getVerse(bookId, chapter, verse)
    }

    suspend fun getStrongsOccurrences(strongsId: String): List<StrongsOccurrence> {
        val booksMap = bibleDbHelper.getBooksMap()
        return kjvService.searchOccurrences(strongsId, booksMap)
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
        val allKeys = userVerses.flatMap { uv ->
            val end = uv.endVerse?.takeIf { it > uv.verse } ?: uv.verse
            (uv.verse..end).map { v -> Triple(uv.bookId, uv.chapter, v) }
        }.distinct()
        val verseTexts = bibleDbHelper.getVerseTexts(allKeys)
        val topicMappings = userDbHelper.getAllVerseTopicMappings()

        val settings = userDbHelper.getAppSettings()
        val activeVersion = settings.bibleVersion.ifBlank { "LSB" }.uppercase()
        var cachedActive = if (activeVersion != "BSB" && activeVersion != "TELIRV" && activeVersion != "TBSI") {
            userDbHelper.getCachedVerseTexts(activeVersion, allKeys)
        } else emptyMap()

        if (activeVersion != "BSB" && activeVersion != "TELIRV" && activeVersion != "TBSI") {
            val missingKeys = allKeys.filter { !cachedActive.containsKey(it) }
            if (missingKeys.isNotEmpty()) {
                val missingChapters = missingKeys.map { Pair(it.first, it.second) }.distinct()
                for ((bId, ch) in missingChapters) {
                    try {
                        val fetched = bollsBibleService.fetchChapter(activeVersion, bId, ch)
                        if (!fetched.isNullOrEmpty()) {
                            userDbHelper.saveCachedVerses(activeVersion, bId, ch, fetched)
                        }
                    } catch (_: Exception) {}
                }
                cachedActive = userDbHelper.getCachedVerseTexts(activeVersion, allKeys)
            }
        }

        userVerses.map { uv ->
            val book = booksMap[uv.bookId]
            val end = uv.endVerse?.takeIf { it > uv.verse } ?: uv.verse
            val range = (uv.verse..end)

            val textTe = range.mapNotNull { v ->
                verseTexts[Triple(uv.bookId, uv.chapter, v)]?.first
            }.joinToString(" ").ifBlank { null }

            val textEn = range.mapNotNull { v ->
                cachedActive[Triple(uv.bookId, uv.chapter, v)]
                    ?: verseTexts[Triple(uv.bookId, uv.chapter, v)]?.second
            }.joinToString(" ").ifBlank { null }

            UserMemoryVerse(
                id = uv.id,
                bookId = uv.bookId,
                bookKey = book?.key ?: "",
                bookNameEn = book?.nameEn ?: "",
                bookNameTe = book?.nameTe ?: "",
                chapter = uv.chapter,
                verse = uv.verse,
                endVerse = uv.endVerse,
                textTe = textTe,
                textEn = textEn,
                status = uv.status,
                repetition = uv.repetition,
                interval = uv.interval,
                efactor = uv.efactor,
                nextDueDate = uv.nextDueDate,
                createdAt = uv.createdAt,
                lapses = uv.lapses,
                attempts = uv.attempts,
                topicIds = topicMappings[uv.id] ?: emptyList()
            )
        }
    }

    suspend fun addUserVerse(bookId: Int, chapter: Int, verse: Int, endVerse: Int? = null): Boolean = withContext(ioDispatcher) {
        val inserted = userDbHelper.addUserVerse(bookId, chapter, verse, endVerse)
        if (inserted) {
            val settings = userDbHelper.getAppSettings()
            val activeVersion = settings.bibleVersion.ifBlank { "LSB" }.uppercase()
            if (activeVersion != "BSB" && activeVersion != "TELIRV" && activeVersion != "TBSI") {
                val cached = userDbHelper.getCachedVerses(activeVersion, bookId, chapter)
                if (cached.isEmpty()) {
                    try {
                        val fetched = bollsBibleService.fetchChapter(activeVersion, bookId, chapter)
                        if (!fetched.isNullOrEmpty()) {
                            userDbHelper.saveCachedVerses(activeVersion, bookId, chapter, fetched)
                        }
                    } catch (_: Exception) {}
                }
            }
        }
        inserted
    }

    suspend fun fetchVerseRange(
        version: String,
        bookId: Int,
        chapter: Int,
        startVerse: Int,
        endVerse: Int
    ): List<Pair<Int, String>> = withContext(ioDispatcher) {
        val ver = version.uppercase().trim()
        val targetRange = (startVerse..endVerse)
        val keys = targetRange.map { Triple(bookId, chapter, it) }

        if (ver == "BSB" || ver == "TELIRV" || ver == "TBSI") {
            val localTexts = bibleDbHelper.getVerseTexts(keys)
            return@withContext targetRange.mapNotNull { v ->
                val txt = localTexts[Triple(bookId, chapter, v)]?.second ?: localTexts[Triple(bookId, chapter, v)]?.first
                if (txt != null) Pair(v, txt.replace(Regex("<[^>]+>"), "").trim()) else null
            }
        }

        var cached = userDbHelper.getCachedVerseTexts(ver, keys)
        if (cached.size < targetRange.count()) {
            try {
                val fetched = bollsBibleService.fetchChapter(ver, bookId, chapter)
                if (!fetched.isNullOrEmpty()) {
                    userDbHelper.saveCachedVerses(ver, bookId, chapter, fetched)
                    cached = userDbHelper.getCachedVerseTexts(ver, keys)
                }
            } catch (_: Exception) {}
        }

        val localFallback = bibleDbHelper.getVerseTexts(keys)
        targetRange.mapNotNull { v ->
            val txt = cached[Triple(bookId, chapter, v)]
                ?: localFallback[Triple(bookId, chapter, v)]?.second
                ?: localFallback[Triple(bookId, chapter, v)]?.first
            if (txt != null) Pair(v, txt.replace(Regex("<[^>]+>"), "").trim()) else null
        }
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

    // ==========================================
    // TOPICS & GROUPS
    // ==========================================

    suspend fun getTopics(): List<Topic> = withContext(ioDispatcher) {
        userDbHelper.getAllTopics()
    }

    suspend fun createTopic(name: String): Topic = withContext(ioDispatcher) {
        userDbHelper.getOrCreateTopic(name)
    }

    suspend fun renameTopic(id: String, newName: String): Boolean = withContext(ioDispatcher) {
        userDbHelper.renameTopic(id, newName)
    }

    suspend fun deleteTopic(id: String): Boolean = withContext(ioDispatcher) {
        userDbHelper.deleteTopic(id)
    }

    suspend fun toggleVerseTopic(verseId: Long, topicId: String): Boolean = withContext(ioDispatcher) {
        userDbHelper.toggleVerseTopic(verseId, topicId)
    }

    suspend fun addTopicToVerse(verseId: Long, topicId: String) = withContext(ioDispatcher) {
        userDbHelper.tagVerse(verseId, topicId)
    }

    suspend fun getPresetCollections(): List<PresetCollection> = withContext(ioDispatcher) {
        bibleDbHelper.getPresetCollections()
    }

    suspend fun addPresetCollection(
        collectionId: String,
        onProgress: ((current: Int, total: Int) -> Unit)? = null
    ): Int = withContext(ioDispatcher) {
        val presetEntries = bibleDbHelper.getPresetVerseEntries(collectionId)
        val topicName = when (collectionId) {
            "top_100" -> "Top 100"
            "well_known" -> "75 Well-Known"
            else -> collectionId.replace('_', ' ').replaceFirstChar { it.uppercase() }
        }
        val topic = userDbHelper.getOrCreateTopic(topicName)
        val total = presetEntries.size
        var insertedCount = 0

        val legacyVerses = mutableListOf<Triple<Int, Int, Int>>()
        for ((idx, entry) in presetEntries.withIndex()) {
            val inserted = userDbHelper.addUserVerse(entry.bookId, entry.chapter, entry.startVerse, entry.endVerse)
            if (inserted) insertedCount++
            legacyVerses.add(Triple(entry.bookId, entry.chapter, entry.startVerse))
            onProgress?.invoke(idx + 1, total)
        }
        userDbHelper.tagVersesWithTopic(legacyVerses, topic.id)
        insertedCount
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

    suspend fun getBlockProgress(bookId: Int): Map<Int, BlockProgressEntity> = withContext(ioDispatcher) {
        userDbHelper.getBlockProgress(bookId)
    }

    suspend fun getAllBlockProgress(): List<BlockProgressEntity> = withContext(ioDispatcher) {
        userDbHelper.getAllBlockProgress()
    }

    suspend fun gradeBlockChain(bookId: Int, blockIndex: Int, label: String, results: List<Pair<Int, Boolean>>): BlockProgressEntity = withContext(ioDispatcher) {
        userDbHelper.gradeBlockChain(bookId, blockIndex, label, results)
    }

    suspend fun recordChainPass(bookId: Int, results: List<Pair<Int, Boolean>>) = withContext(ioDispatcher) {
        userDbHelper.recordChainPass(bookId, results)
    }

    suspend fun getCrossReferences(bookId: Int, chapter: Int, verse: Int, minVotes: Int = 4): List<CrossReference> = withContext(ioDispatcher) {
        bibleDbHelper.getCrossReferences(bookId, chapter, verse, minVotes)
    }

    suspend fun getIncomingCrossReferences(bookId: Int, chapter: Int, verse: Int, minVotes: Int = 4): List<CrossReference> = withContext(ioDispatcher) {
        bibleDbHelper.getIncomingCrossReferences(bookId, chapter, verse, minVotes)
    }

    suspend fun getVerseConnections(bookId: Int, chapter: Int, verse: Int, minVotes: Int = 4): VerseConnectionsData = withContext(ioDispatcher) {
        bibleDbHelper.getVerseConnections(bookId, chapter, verse, minVotes)
    }

    suspend fun getOriginalWordsForVerse(bookId: Int, chapter: Int, verse: Int): List<StepBibleWord> = withContext(ioDispatcher) {
        bibleDbHelper.getOriginalWordsForVerse(bookId, chapter, verse)
    }

    suspend fun getOccurrencesForStepBibleWord(wordId: Int): List<StepBibleWordOccurrence> = withContext(ioDispatcher) {
        bibleDbHelper.getOccurrencesForStepBibleWord(wordId)
    }

    suspend fun getCrossReferenceCount(bookId: Int, chapter: Int, verse: Int, minVotes: Int = 4): Int = withContext(ioDispatcher) {
        bibleDbHelper.getCrossReferenceCount(bookId, chapter, verse, minVotes)
    }

    suspend fun getCrossReferenceCountsForChapter(bookId: Int, chapter: Int, minVotes: Int = 4): Map<Int, Int> = withContext(ioDispatcher) {
        bibleDbHelper.getCrossReferenceCountsForChapter(bookId, chapter, minVotes)
    }

    suspend fun isOtQuote(bookId: Int, chapter: Int, verse: Int): Boolean = withContext(ioDispatcher) {
        bibleDbHelper.isOtQuote(bookId, chapter, verse)
    }

    suspend fun getOtQuotesForChapter(bookId: Int, chapter: Int): Set<Int> = withContext(ioDispatcher) {
        bibleDbHelper.getOtQuotesForChapter(bookId, chapter)
    }

    suspend fun getBookMastery(bookId: Int): BookMasteryCounts = withContext(ioDispatcher) {
        val book = bibleDbHelper.getBook(bookId)
        val chapterCount = book?.chapters ?: 0
        val progress = userDbHelper.getChapterProgress(bookId).values.toList()
        MasteryUtils.calculateBookMastery(bookId, chapterCount, progress)
    }

    suspend fun getAllBookMastery(): Map<Int, BookMasteryCounts> = withContext(ioDispatcher) {
        val books = bibleDbHelper.getAllBooks()
        val allProgress = userDbHelper.getAllChapterProgress().groupBy { it.bookId }
        val now = System.currentTimeMillis()
        books.associate { book ->
            val progress = allProgress[book.id] ?: emptyList()
            book.id to MasteryUtils.calculateBookMastery(book.id, book.chapters, progress, now)
        }
    }
}



