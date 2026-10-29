package com.example.telugubible.ui.reader

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.data.model.OriginalWord
import com.example.telugubible.data.model.StepBibleWordOccurrence
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseConnectionsData
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.data.service.KjvService
import com.example.telugubible.util.KjvVersification
import com.example.telugubible.util.StrongsParser
import com.example.telugubible.util.TtsManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class FontSizeScale(
    val label: String,
    val multiplier: Float,
    val spSize: Float,
    val lineHeightSp: Float
) {
    XS("XS", 0.82f, 15f, 23f),
    S("S", 1.00f, 18f, 28f),
    M("M", 1.28f, 23f, 36f),
    L("L", 1.60f, 29f, 45f),
    XL("XL", 2.00f, 36f, 56f);

    companion object {
        fun fromMultiplier(multiplier: Float): FontSizeScale = when {
            multiplier <= 0.90f -> XS
            multiplier <= 1.12f -> S
            multiplier <= 1.42f -> M
            multiplier <= 1.78f -> L
            else -> XL
        }
    }
}

enum class BibleLanguage(val code: String, val displayName: String) {
    TELUGU("TE", "తెలుగు"),
    ENGLISH("EN", "English")
}

data class ReaderUiState(
    val books: List<Book> = emptyList(),
    val currentBook: Book? = null,
    val currentChapter: Int = 1,
    val verses: List<Verse> = emptyList(),
    val paragraphBreaks: Set<Int> = emptySet(),
    val crossRefCounts: Map<Int, Int> = emptyMap(),
    val otQuotes: Set<Int> = emptySet(),
    val selectedVerses: Set<Int> = emptySet(),
    val crossRefSheetVerses: List<Int>? = null,
    val crossRefsForSheet: List<CrossReference> = emptyList(),
    val connectionsData: VerseConnectionsData? = null,
    val connectionsMinVotes: Int = 4,
    val connectionsInitialSection: String? = null,
    val connectionsQuoteTextEn: String? = null,
    val connectionsQuoteTextTe: String? = null,
    val stepBibleWordOccurrences: Map<Int, List<StepBibleWordOccurrence>> = emptyMap(),
    val isTtsSpeaking: Boolean = false,
    val activeTtsVerse: Int? = null,
    val fontSizeScale: FontSizeScale = FontSizeScale.S,
    val activeVersion: String = "LSB",
    val language: BibleLanguage = BibleLanguage.ENGLISH,
    val showBookSelector: Boolean = false,
    val showSettings: Boolean = false,
    val selectedStrongs: StrongsEntry? = null,
    val isImmersive: Boolean = false,
    val isLoading: Boolean = true,
    val toastMessage: String? = null,
    val alphaMode: Boolean = false,
    val originalWordsVerse: Int? = null,
    val originalWordsList: List<OriginalWord> = emptyList(),
    val isOriginalWordsLoading: Boolean = false,
    val occurrencesStrongs: StrongsEntry? = null,
    val occurrencesList: List<StrongsOccurrence> = emptyList(),
    val isOccurrencesLoading: Boolean = false,
    val occurrencesError: String? = null,
    val kjvChapterVerses: Map<Int, String> = emptyMap(),
    val readerTheme: ReaderTheme = ReaderTheme.OBSIDIAN,
    val readerFontFamily: ReaderFontFamily = ReaderFontFamily.MERRIWEATHER,
    val currentAnchor: ChapterAnchor? = null,
    val chapterProgress: ChapterProgressEntity? = null,
    val isAnchorDismissed: Boolean = false,
    val anchorWordRevealed: Boolean = false,
    val showAnchorScene: Boolean = false,
    val flashVerse: Int? = null,
    val memorizedVerses: Set<Int> = emptySet(),
    val bionicReading: Boolean = false,
    val topics: List<Topic> = emptyList(),
    val anchorReveal: String = "tap",
    val showSectionHeadings: Boolean = true,
    val showVerseNumbers: Boolean = true,
    val showParagraphMarks: Boolean = true,
    val showCrossRefMarkers: Boolean = true,
    val showReadingOptions: Boolean = false
)

class ReaderViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application),
    private val kjvService: KjvService = KjvService()
) : AndroidViewModel(application) {

    private val ttsManager = TtsManager(application)

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
        observeTts()
    }

    private fun observeTts() {
        viewModelScope.launch {
            ttsManager.state.collect { tts ->
                _uiState.update {
                    it.copy(
                        isTtsSpeaking = tts.isSpeaking,
                        activeTtsVerse = tts.currentVerse
                    )
                }
            }
        }
    }

    private fun extractMemorizedVerseNumbers(userVerses: List<UserMemoryVerse>, bookId: Int, chapter: Int): Set<Int> {
        return userVerses
            .filter { it.bookId == bookId && it.chapter == chapter }
            .flatMap { uv ->
                val end = uv.endVerse
                if (end != null && end >= uv.verse) (uv.verse..end).toList()
                else listOf(uv.verse)
            }
            .toSet()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            val books = repository.getBooks()
            val topics = repository.getTopics()
            val firstBook = books.firstOrNull { it.id == 1 } ?: books.firstOrNull()
            val settings = repository.getAppSettings()
            val activeVer = settings.bibleVersion.ifBlank { "LSB" }.uppercase()
            val lang = if (activeVer == "TELIRV") BibleLanguage.TELUGU else BibleLanguage.ENGLISH

            if (firstBook != null) {
                val rawVerses = repository.getChapterVerses(firstBook.id, 1, activeVer)
                val verses = attachHeadingsIfNeeded(firstBook.id, 1, activeVer, rawVerses)
                val breaks = repository.getParagraphBreaks(firstBook.id, 1)
                val crossRefCounts = repository.getCrossReferenceCountsForChapter(firstBook.id, 1)
                val otQuotes = repository.getOtQuotesForChapter(firstBook.id, 1)
                val anchors = repository.getChapterAnchors(firstBook.id)
                val currentAnchor = anchors.find { it.chapter == 1 }
                val chapterProgress = repository.getChapterProgress(firstBook.id)[1]
                val userVerses = repository.getUserMemoryVerses()
                val memorized = extractMemorizedVerseNumbers(userVerses, firstBook.id, 1)
                val fontScale = FontSizeScale.fromMultiplier(settings.fontSize)
                val fontFam = ReaderFontFamily.fromKey(settings.fontFamily)
                val theme = ReaderTheme.fromKey(settings.theme)

                _uiState.update {
                    it.copy(
                        books = books,
                        topics = topics,
                        currentBook = firstBook,
                        currentChapter = 1,
                        activeVersion = activeVer,
                        language = lang,
                        verses = verses,
                        paragraphBreaks = breaks,
                        crossRefCounts = crossRefCounts,
                        otQuotes = otQuotes,
                        currentAnchor = currentAnchor,
                        chapterProgress = chapterProgress,
                        memorizedVerses = memorized,
                        fontSizeScale = fontScale,
                        readerFontFamily = fontFam,
                        readerTheme = theme,
                        bionicReading = settings.bionicReading,
                        anchorReveal = settings.anchorReveal,
                        showSectionHeadings = settings.showSectionHeadings,
                        showVerseNumbers = settings.showVerseNumbers,
                        showParagraphMarks = settings.showParagraphMarks,
                        showCrossRefMarkers = settings.showCrossRefMarkers,
                        anchorWordRevealed = settings.anchorReveal == "always",
                        showAnchorScene = false,
                        isLoading = false
                    )
                }
            }
        }
    }

    fun selectBookAndChapterById(bookId: Int, chapter: Int = 1) {
        viewModelScope.launch {
            val books = _uiState.value.books.ifEmpty { repository.getBooks() }
            val target = books.firstOrNull { it.id == bookId } ?: return@launch
            selectBookAndChapter(target, chapter)
        }
    }

    fun selectBookAndChapter(book: Book, chapter: Int) {
        viewModelScope.launch {
            ttsManager.stop()
            _uiState.update {
                it.copy(
                    isLoading = true,
                    showBookSelector = false,
                    selectedVerses = emptySet(),
                    crossRefSheetVerses = null,
                    connectionsData = null,
                    connectionsInitialSection = null,
                    originalWordsVerse = null,
                    originalWordsList = emptyList()
                )
            }
            val settings = repository.getAppSettings()
            val activeVer = settings.bibleVersion.ifBlank { _uiState.value.activeVersion }.uppercase()
            val lang = if (activeVer == "TELIRV") BibleLanguage.TELUGU else BibleLanguage.ENGLISH
            val rawVerses = repository.getChapterVerses(book.id, chapter, activeVer)
            val verses = attachHeadingsIfNeeded(book.id, chapter, activeVer, rawVerses)
            val breaks = repository.getParagraphBreaks(book.id, chapter)
            val crossRefCounts = repository.getCrossReferenceCountsForChapter(book.id, chapter)
            val otQuotes = repository.getOtQuotesForChapter(book.id, chapter)
            val anchors = repository.getChapterAnchors(book.id)
            val currentAnchor = anchors.find { it.chapter == chapter }
            val chapterProgress = repository.getChapterProgress(book.id)[chapter]
            val userVerses = repository.getUserMemoryVerses()
            val memorized = extractMemorizedVerseNumbers(userVerses, book.id, chapter)
            val fontScale = FontSizeScale.fromMultiplier(settings.fontSize)
            val fontFam = ReaderFontFamily.fromKey(settings.fontFamily)
            val theme = ReaderTheme.fromKey(settings.theme)
            val kjvMap = if (_uiState.value.alphaMode) {
                kjvService.getChapterKjv(book.id, chapter) ?: emptyMap()
            } else {
                emptyMap()
            }
            _uiState.update {
                it.copy(
                    currentBook = book,
                    currentChapter = chapter,
                    activeVersion = activeVer,
                    language = lang,
                    verses = verses,
                    paragraphBreaks = breaks,
                    crossRefCounts = crossRefCounts,
                    otQuotes = otQuotes,
                    currentAnchor = currentAnchor,
                    chapterProgress = chapterProgress,
                    memorizedVerses = memorized,
                    fontSizeScale = fontScale,
                    readerFontFamily = fontFam,
                    readerTheme = theme,
                    bionicReading = settings.bionicReading,
                    anchorReveal = settings.anchorReveal,
                    showSectionHeadings = settings.showSectionHeadings,
                    showVerseNumbers = settings.showVerseNumbers,
                    showParagraphMarks = settings.showParagraphMarks,
                    showCrossRefMarkers = settings.showCrossRefMarkers,
                    anchorWordRevealed = settings.anchorReveal == "always",
                    showAnchorScene = false,
                    isAnchorDismissed = false,
                    kjvChapterVerses = kjvMap,
                    isLoading = false
                )
            }
        }
    }

    private suspend fun attachHeadingsIfNeeded(bookId: Int, chapter: Int, activeVersion: String, verses: List<Verse>): List<Verse> {
        val headingRegex = Regex("<b\\b[^>]*>([\\s\\S]*?)</b>", RegexOption.IGNORE_CASE)
        val hasHeadings = verses.any { headingRegex.containsMatchIn(it.textEn ?: "") }
        if (hasHeadings) return verses
        val lsbVerses = repository.getChapterVerses(bookId, chapter, "LSB")
        val lsbHeadings = mutableMapOf<Int, String>()
        lsbVerses.forEach { lv ->
            val text = lv.textEn ?: ""
            val matches = headingRegex.findAll(text).map { it.value }.toList()
            if (matches.isNotEmpty()) {
                lsbHeadings[lv.verse] = matches.joinToString(" ")
            }
        }
        if (lsbHeadings.isEmpty()) return verses
        return verses.map { v ->
            val h = lsbHeadings[v.verse]
            if (h != null) {
                val currentText = v.textEn ?: v.textTe ?: ""
                v.copy(textEn = "$h $currentText")
            } else {
                v
            }
        }
    }

    fun gradeChapterRecall(score: Int) {
        val b = _uiState.value.currentBook ?: return
        val ch = _uiState.value.currentChapter
        viewModelScope.launch {
            val updated = repository.gradeChapterAnchor(b.id, ch, score)
            _uiState.update { it.copy(chapterProgress = updated, isAnchorDismissed = true) }
        }
    }

    fun dismissChapterRecall() {
        _uiState.update { it.copy(isAnchorDismissed = true) }
    }

    fun revealAnchorWord() {
        _uiState.update { it.copy(anchorWordRevealed = true, showAnchorScene = true) }
    }

    fun toggleAnchorScene() {
        _uiState.update { it.copy(showAnchorScene = !it.showAnchorScene) }
    }

    fun setFlashVerse(verse: Int?) {
        _uiState.update { it.copy(flashVerse = verse) }
    }

    fun toggleReadingOptions(show: Boolean? = null) {
        _uiState.update { it.copy(showReadingOptions = show ?: !it.showReadingOptions) }
    }

    fun toggleReadingOption(key: String) {
        viewModelScope.launch {
            val current = repository.getAppSettings()
            val updated = when (key) {
                "bionicReading" -> current.copy(bionicReading = !current.bionicReading)
                "showSectionHeadings" -> current.copy(showSectionHeadings = !current.showSectionHeadings)
                "showVerseNumbers" -> current.copy(showVerseNumbers = !current.showVerseNumbers)
                "showParagraphMarks" -> current.copy(showParagraphMarks = !current.showParagraphMarks)
                "showCrossRefMarkers" -> current.copy(showCrossRefMarkers = !current.showCrossRefMarkers)
                else -> current
            }
            repository.saveAppSettings(updated)
            _uiState.update {
                it.copy(
                    bionicReading = updated.bionicReading,
                    showSectionHeadings = updated.showSectionHeadings,
                    showVerseNumbers = updated.showVerseNumbers,
                    showParagraphMarks = updated.showParagraphMarks,
                    showCrossRefMarkers = updated.showCrossRefMarkers
                )
            }
        }
    }

    fun setBibleVersion(version: String) {
        val v = version.uppercase()
        val lang = if (v == "TELIRV") BibleLanguage.TELUGU else BibleLanguage.ENGLISH
        _uiState.update { it.copy(activeVersion = v, language = lang, isLoading = true) }
        viewModelScope.launch {
            val currentSettings = repository.getAppSettings()
            repository.saveAppSettings(currentSettings.copy(bibleVersion = v))
            val book = _uiState.value.currentBook ?: return@launch
            val ch = _uiState.value.currentChapter
            val rawVerses = repository.getChapterVerses(book.id, ch, v)
            val verses = attachHeadingsIfNeeded(book.id, ch, v, rawVerses)
            _uiState.update { it.copy(verses = verses, isLoading = false) }
        }
    }

    fun nextChapter() {
        val currentBook = _uiState.value.currentBook ?: return
        val currentChapter = _uiState.value.currentChapter
        if (currentChapter < currentBook.chapters) {
            selectBookAndChapter(currentBook, currentChapter + 1)
        } else {
            val books = _uiState.value.books
            val nextIndex = books.indexOfFirst { it.id == currentBook.id } + 1
            if (nextIndex < books.size) {
                selectBookAndChapter(books[nextIndex], 1)
            }
        }
    }

    fun previousChapter() {
        val currentBook = _uiState.value.currentBook ?: return
        val currentChapter = _uiState.value.currentChapter
        if (currentChapter > 1) {
            selectBookAndChapter(currentBook, currentChapter - 1)
        } else {
            val books = _uiState.value.books
            val prevIndex = books.indexOfFirst { it.id == currentBook.id } - 1
            if (prevIndex >= 0) {
                val prevBook = books[prevIndex]
                selectBookAndChapter(prevBook, prevBook.chapters)
            }
        }
    }

    // Verse Multi-Selection
    fun toggleVerseSelection(verseNumber: Int) {
        _uiState.update { current ->
            val set = current.selectedVerses.toMutableSet()
            if (set.contains(verseNumber)) {
                set.remove(verseNumber)
            } else {
                set.add(verseNumber)
            }
            current.copy(selectedVerses = set)
        }
    }

    fun clearVerseSelection() {
        _uiState.update { it.copy(selectedVerses = emptySet()) }
    }

    fun selectAllVerses() {
        _uiState.update { current ->
            current.copy(selectedVerses = current.verses.map { it.verse }.toSet())
        }
    }

    fun formatSelectedVersesForClipboard(): String {
        val book = _uiState.value.currentBook ?: return ""
        val ch = _uiState.value.currentChapter
        val lang = _uiState.value.language
        val selected = _uiState.value.selectedVerses.sorted()
        if (selected.isEmpty()) return ""

        val bookTitle = if (lang == BibleLanguage.TELUGU) book.nameTe else book.nameEn
        val refRange = if (selected.size == 1) "$ch:${selected.first()}" else "$ch:${selected.first()}-${selected.last()}"
        val header = "$bookTitle $refRange"

        val versesMap = _uiState.value.verses.associateBy { it.verse }
        val lines = selected.mapNotNull { vNum ->
            val v = versesMap[vNum] ?: return@mapNotNull null
            val text = if (lang == BibleLanguage.TELUGU) v.textTe ?: v.textEn else v.textEn ?: v.textTe
            "$vNum $text"
        }
        return "$header\n${lines.joinToString("\n")}"
    }

    fun loadTopics() {
        viewModelScope.launch {
            val t = repository.getTopics()
            _uiState.update { it.copy(topics = t) }
        }
    }

    fun createTopic(name: String, onCreated: ((com.example.telugubible.data.model.Topic) -> Unit)? = null) {
        viewModelScope.launch {
            val topic = repository.createTopic(name)
            loadTopics()
            onCreated?.invoke(topic)
        }
    }

    fun addSelectedVersesToMemory(
        combineConsecutive: Boolean = false,
        topicIds: List<String> = emptyList(),
        startLearningNow: Boolean = true,
        keyword: String = "",
        onSuccess: (count: Int) -> Unit = {}
    ) {
        viewModelScope.launch {
            val book = _uiState.value.currentBook ?: return@launch
            val ch = _uiState.value.currentChapter
            val selected = _uiState.value.selectedVerses.sorted()
            if (selected.isEmpty()) return@launch

            val now = System.currentTimeMillis()
            val dueDate = if (startLearningNow) now else now + 86400000L
            val trimmedKeyword = keyword.trim().takeIf { it.isNotEmpty() }

            var addedCount = 0
            if (combineConsecutive && selected.size > 1) {
                val groups = mutableListOf<MutableList<Int>>()
                var currentGroup = mutableListOf(selected[0])
                for (i in 1 until selected.size) {
                    if (selected[i] == selected[i - 1] + 1) {
                        currentGroup.add(selected[i])
                    } else {
                        groups.add(currentGroup)
                        currentGroup = mutableListOf(selected[i])
                    }
                }
                groups.add(currentGroup)

                for (grp in groups) {
                    val start = grp.first()
                    val end = if (grp.size > 1) grp.last() else null
                    val success = repository.addUserVerse(
                        bookId = book.id,
                        chapter = ch,
                        verse = start,
                        endVerse = end,
                        nextDueDate = dueDate,
                        keyword = trimmedKeyword
                    )
                    if (success) {
                        addedCount++
                        if (topicIds.isNotEmpty()) {
                            val allVerses = repository.getUserMemoryVerses()
                            val target = allVerses.find { it.bookId == book.id && it.chapter == ch && it.verse == start && it.endVerse == end }
                            if (target != null) {
                                topicIds.forEach { tid -> repository.addTopicToVerse(target.id, tid) }
                            }
                        }
                    }
                }
            } else {
                for (v in selected) {
                    val success = repository.addUserVerse(
                        bookId = book.id,
                        chapter = ch,
                        verse = v,
                        endVerse = null,
                        nextDueDate = dueDate,
                        keyword = trimmedKeyword
                    )
                    if (success) {
                        addedCount++
                        if (topicIds.isNotEmpty()) {
                            val allVerses = repository.getUserMemoryVerses()
                            val target = allVerses.find { it.bookId == book.id && it.chapter == ch && it.verse == v && it.endVerse == null }
                            if (target != null) {
                                topicIds.forEach { tid -> repository.addTopicToVerse(target.id, tid) }
                            }
                        }
                    }
                }
            }

            val updatedUserVerses = repository.getUserMemoryVerses()
            val updatedMemorized = extractMemorizedVerseNumbers(updatedUserVerses, book.id, ch)

            _uiState.update {
                it.copy(
                    selectedVerses = emptySet(),
                    memorizedVerses = updatedMemorized,
                    toastMessage = "Added $addedCount passage${if (addedCount == 1) "" else "s"} to memory"
                )
            }
            onSuccess(addedCount)
        }
    }

    // Cross-References & Verse Connections
    fun openCrossReferences(verseNumbers: List<Int>, initialSection: String? = null) {
        viewModelScope.launch {
            val currentBook = _uiState.value.currentBook ?: return@launch
            val ch = _uiState.value.currentChapter
            val minVotes = _uiState.value.connectionsMinVotes
            val firstVerse = verseNumbers.firstOrNull() ?: 1
            val list = mutableListOf<CrossReference>()
            for (v in verseNumbers) {
                list.addAll(repository.getCrossReferences(currentBook.id, ch, v, minVotes))
            }
            val connData = repository.getVerseConnections(currentBook.id, ch, firstVerse, minVotes)
            val verseObj = _uiState.value.verses.firstOrNull { it.verse == firstVerse }
                ?: repository.getVerse(currentBook.id, ch, firstVerse)
            _uiState.update {
                it.copy(
                    crossRefSheetVerses = verseNumbers,
                    crossRefsForSheet = list,
                    connectionsData = connData,
                    connectionsInitialSection = initialSection,
                    connectionsQuoteTextEn = verseObj?.textEn,
                    connectionsQuoteTextTe = verseObj?.textTe
                )
            }
        }
    }

    fun openConnectionsForVid(vid: Int, initialSection: String? = null) {
        if (vid !in 0 until KjvVersification.TOTAL_VERSES) return
        viewModelScope.launch {
            val coord = KjvVersification.fromVerseIndex(vid)
            val minVotes = _uiState.value.connectionsMinVotes
            val connData = repository.getVerseConnections(coord.bookId, coord.chapter, coord.verse, minVotes)
            val verseObj = repository.getVerse(coord.bookId, coord.chapter, coord.verse)
            _uiState.update {
                it.copy(
                    crossRefSheetVerses = listOf(coord.verse),
                    crossRefsForSheet = connData.outgoing,
                    connectionsData = connData,
                    connectionsInitialSection = initialSection,
                    connectionsQuoteTextEn = verseObj?.textEn,
                    connectionsQuoteTextTe = verseObj?.textTe
                )
            }
        }
    }

    fun setConnectionsMinVotes(minVotes: Int) {
        _uiState.update { it.copy(connectionsMinVotes = minVotes) }
        val conn = _uiState.value.connectionsData ?: return
        viewModelScope.launch {
            val updated = repository.getVerseConnections(conn.bookId, conn.chapter, conn.verse, minVotes)
            _uiState.update {
                it.copy(
                    connectionsData = updated,
                    crossRefsForSheet = updated.outgoing
                )
            }
        }
    }

    fun loadStepBibleWordOccurrences(wordId: Int) {
        if (_uiState.value.stepBibleWordOccurrences.containsKey(wordId)) return
        viewModelScope.launch {
            val list = repository.getOccurrencesForStepBibleWord(wordId)
            _uiState.update {
                it.copy(stepBibleWordOccurrences = it.stepBibleWordOccurrences + (wordId to list))
            }
        }
    }

    fun dismissCrossReferences() {
        _uiState.update {
            it.copy(
                crossRefSheetVerses = null,
                crossRefsForSheet = emptyList(),
                connectionsData = null,
                connectionsInitialSection = null
            )
        }
    }

    // TTS
    fun toggleTts() {
        if (_uiState.value.isTtsSpeaking) {
            stopTts()
        } else {
            startTts()
        }
    }

    fun startTts() {
        val verses = _uiState.value.verses
        val lang = _uiState.value.language
        val selected = _uiState.value.selectedVerses
        val targetVerses = if (selected.isNotEmpty()) {
            verses.filter { it.verse in selected }
        } else {
            verses
        }
        val pairs = targetVerses.map { v ->
            val text = if (lang == BibleLanguage.TELUGU) v.textTe ?: v.textEn ?: "" else v.textEn ?: v.textTe ?: ""
            Pair(v.verse, text)
        }
        ttsManager.playVerses(pairs)
    }

    fun stopTts() {
        ttsManager.stop()
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }

    fun increaseFontSize() {
        val values = FontSizeScale.entries
        val currentIndex = values.indexOf(_uiState.value.fontSizeScale)
        if (currentIndex < values.size - 1) {
            val nextScale = values[currentIndex + 1]
            _uiState.update { it.copy(fontSizeScale = nextScale) }
            persistFontSize(nextScale)
        }
    }

    fun decreaseFontSize() {
        val values = FontSizeScale.entries
        val currentIndex = values.indexOf(_uiState.value.fontSizeScale)
        if (currentIndex > 0) {
            val prevScale = values[currentIndex - 1]
            _uiState.update { it.copy(fontSizeScale = prevScale) }
            persistFontSize(prevScale)
        }
    }

    fun resetFontSize() {
        _uiState.update { it.copy(fontSizeScale = FontSizeScale.S) }
        persistFontSize(FontSizeScale.S)
    }

    fun setFontSizeScale(scale: FontSizeScale) {
        _uiState.update { it.copy(fontSizeScale = scale) }
        persistFontSize(scale)
    }

    private fun persistFontSize(scale: FontSizeScale) {
        viewModelScope.launch {
            val settings = repository.getAppSettings()
            repository.saveAppSettings(settings.copy(fontSize = scale.multiplier))
        }
    }

    fun setLanguage(lang: BibleLanguage) {
        _uiState.update { it.copy(language = lang) }
    }

    fun toggleBookSelector(show: Boolean) {
        _uiState.update { it.copy(showBookSelector = show) }
    }

    fun toggleSettings(show: Boolean) {
        _uiState.update { it.copy(showSettings = show) }
    }

    fun toggleImmersive() {
        _uiState.update { it.copy(isImmersive = !it.isImmersive) }
    }

    fun lookupStrongs(id: String) {
        viewModelScope.launch {
            val entry = repository.getStrongs(id)
            _uiState.update { it.copy(selectedStrongs = entry) }
        }
    }

    fun dismissStrongs() {
        _uiState.update { it.copy(selectedStrongs = null) }
    }

    // Theme & Typography
    fun setReaderTheme(theme: ReaderTheme) {
        _uiState.update { it.copy(readerTheme = theme) }
        com.example.telugubible.theme.RemoraThemeState.themeName = theme.toSettingKey()
        viewModelScope.launch {
            val settings = repository.getAppSettings()
            repository.saveAppSettings(settings.copy(theme = theme.toSettingKey()))
        }
    }

    fun syncSettings() {
        viewModelScope.launch {
            val settings = repository.getAppSettings()
            val fontScale = FontSizeScale.fromMultiplier(settings.fontSize)
            val fontFam = ReaderFontFamily.fromKey(settings.fontFamily)
            val theme = ReaderTheme.fromKey(settings.theme)
            _uiState.update {
                it.copy(
                    fontSizeScale = fontScale,
                    readerFontFamily = fontFam,
                    readerTheme = theme,
                    bionicReading = settings.bionicReading,
                    anchorReveal = settings.anchorReveal,
                    showSectionHeadings = settings.showSectionHeadings,
                    showVerseNumbers = settings.showVerseNumbers,
                    showParagraphMarks = settings.showParagraphMarks,
                    showCrossRefMarkers = settings.showCrossRefMarkers
                )
            }
        }
    }

    fun setReaderFontFamily(fontFamily: ReaderFontFamily) {
        _uiState.update { it.copy(readerFontFamily = fontFamily) }
        viewModelScope.launch {
            val settings = repository.getAppSettings()
            repository.saveAppSettings(settings.copy(fontFamily = fontFamily.key))
        }
    }

    // Alpha / Study Mode
    fun toggleAlphaMode() {
        val newMode = !_uiState.value.alphaMode
        _uiState.update { it.copy(alphaMode = newMode) }
        if (newMode && _uiState.value.kjvChapterVerses.isEmpty()) {
            val book = _uiState.value.currentBook ?: return
            val chapter = _uiState.value.currentChapter
            viewModelScope.launch {
                val map = kjvService.getChapterKjv(book.id, chapter)
                if (map != null) {
                    _uiState.update { it.copy(kjvChapterVerses = map) }
                }
            }
        }
    }

    // Original Words Sheet
    fun openOriginalWords(verseNumber: Int) {
        val book = _uiState.value.currentBook ?: return
        val chapter = _uiState.value.currentChapter
        val isOT = book.id <= 39

        _uiState.update {
            it.copy(
                originalWordsVerse = verseNumber,
                isOriginalWordsLoading = true,
                originalWordsList = emptyList()
            )
        }

        viewModelScope.launch {
            var taggedText = _uiState.value.kjvChapterVerses[verseNumber]
            if (taggedText == null) {
                val kjvMap = kjvService.getChapterKjv(book.id, chapter)
                if (kjvMap != null) {
                    _uiState.update { it.copy(kjvChapterVerses = kjvMap) }
                    taggedText = kjvMap[verseNumber]
                }
            }

            val wordsList = if (!taggedText.isNullOrBlank()) {
                val parsed = StrongsParser.parseTaggedText(taggedText, isOT)
                parsed.map { (english, strongsId) ->
                    val entry = strongsId?.let { repository.getStrongs(it) }
                    OriginalWord(english = english, strongsId = strongsId, entry = entry)
                }
            } else {
                val verse = _uiState.value.verses.firstOrNull { it.verse == verseNumber }
                val enText = verse?.textEn ?: ""
                val tokens = enText.split(Regex("[^a-zA-Z]+")).filter { it.length > 2 }
                tokens.map { token ->
                    val results = repository.searchStrongs(token)
                    val match = results.firstOrNull { it.lang == if (isOT) "H" else "G" } ?: results.firstOrNull()
                    OriginalWord(english = token, strongsId = match?.id, entry = match)
                }
            }

            _uiState.update {
                it.copy(
                    originalWordsList = wordsList,
                    isOriginalWordsLoading = false
                )
            }
        }
    }

    fun dismissOriginalWords() {
        _uiState.update {
            it.copy(
                originalWordsVerse = null,
                originalWordsList = emptyList(),
                isOriginalWordsLoading = false
            )
        }
    }

    // Strong's Occurrences Sheet
    fun openOccurrences(strongsId: String) {
        viewModelScope.launch {
            val normalized = StrongsParser.normalizeStrongsRef(strongsId)
            val entry = repository.getStrongs(normalized) ?: StrongsEntry(
                id = normalized,
                lang = if (StrongsParser.isHebrewStrongs(normalized)) "H" else "G",
                lemma = null,
                xlit = null,
                pron = null,
                derivation = null,
                strongsDef = null,
                kjvDef = null,
                pos = null
            )
            openOccurrencesForEntry(entry)
        }
    }

    fun openOccurrencesForEntry(entry: StrongsEntry) {
        _uiState.update {
            it.copy(
                occurrencesStrongs = entry,
                isOccurrencesLoading = true,
                occurrencesError = null,
                occurrencesList = emptyList()
            )
        }
        viewModelScope.launch {
            try {
                val list = repository.getStrongsOccurrences(entry.id)
                _uiState.update {
                    it.copy(
                        occurrencesList = list,
                        isOccurrencesLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isOccurrencesLoading = false,
                        occurrencesError = e.message ?: "Failed to search occurrences"
                    )
                }
            }
        }
    }

    fun dismissOccurrences() {
        _uiState.update {
            it.copy(
                occurrencesStrongs = null,
                occurrencesList = emptyList(),
                isOccurrencesLoading = false,
                occurrencesError = null
            )
        }
    }

    suspend fun getOfflineVerse(bookId: Int, chapter: Int, verse: Int): Verse? {
        return repository.getVerse(bookId, chapter, verse)
    }

    override fun onCleared() {
        super.onCleared()
        ttsManager.shutdown()
    }
}
