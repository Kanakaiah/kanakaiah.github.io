package com.example.telugubible.ui.reader

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.data.model.OriginalWord
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.data.service.KjvService
import com.example.telugubible.util.StrongsParser
import com.example.telugubible.util.TtsManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class FontSizeScale(val label: String, val multiplier: Float) {
    XS("XS", 0.85f),
    S("S", 1.00f),
    M("M", 1.15f),
    L("L", 1.30f),
    XL("XL", 1.45f)
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
    val isTtsSpeaking: Boolean = false,
    val activeTtsVerse: Int? = null,
    val fontSizeScale: FontSizeScale = FontSizeScale.S,
    val language: BibleLanguage = BibleLanguage.TELUGU,
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
    val readerFontFamily: ReaderFontFamily = ReaderFontFamily.SERIF
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

    private fun loadInitialData() {
        viewModelScope.launch {
            val books = repository.getBooks()
            val firstBook = books.firstOrNull { it.id == 1 } ?: books.firstOrNull()
            if (firstBook != null) {
                val verses = repository.getVerses(firstBook.id, 1)
                val breaks = repository.getParagraphBreaks(firstBook.id, 1)
                val crossRefCounts = repository.getCrossReferenceCountsForChapter(firstBook.id, 1)
                val otQuotes = repository.getOtQuotesForChapter(firstBook.id, 1)
                _uiState.update {
                    it.copy(
                        books = books,
                        currentBook = firstBook,
                        currentChapter = 1,
                        verses = verses,
                        paragraphBreaks = breaks,
                        crossRefCounts = crossRefCounts,
                        otQuotes = otQuotes,
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
                    originalWordsVerse = null,
                    originalWordsList = emptyList()
                )
            }
            val verses = repository.getVerses(book.id, chapter)
            val breaks = repository.getParagraphBreaks(book.id, chapter)
            val crossRefCounts = repository.getCrossReferenceCountsForChapter(book.id, chapter)
            val otQuotes = repository.getOtQuotesForChapter(book.id, chapter)
            val kjvMap = if (_uiState.value.alphaMode) {
                kjvService.getChapterKjv(book.id, chapter) ?: emptyMap()
            } else {
                emptyMap()
            }
            _uiState.update {
                it.copy(
                    currentBook = book,
                    currentChapter = chapter,
                    verses = verses,
                    paragraphBreaks = breaks,
                    crossRefCounts = crossRefCounts,
                    otQuotes = otQuotes,
                    kjvChapterVerses = kjvMap,
                    isLoading = false
                )
            }
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

    fun addSelectedVersesToMemory(onSuccess: (count: Int) -> Unit = {}) {
        viewModelScope.launch {
            val book = _uiState.value.currentBook ?: return@launch
            val ch = _uiState.value.currentChapter
            val selected = _uiState.value.selectedVerses.toList()
            if (selected.isEmpty()) return@launch

            var addedCount = 0
            for (v in selected) {
                val success = repository.addUserVerse(book.id, ch, v)
                if (success) addedCount++
            }
            _uiState.update {
                it.copy(
                    selectedVerses = emptySet(),
                    toastMessage = "Added $addedCount verse${if (addedCount == 1) "" else "s"} to memory"
                )
            }
            onSuccess(addedCount)
        }
    }

    // Cross-References
    fun openCrossReferences(verseNumbers: List<Int>) {
        viewModelScope.launch {
            val currentBook = _uiState.value.currentBook ?: return@launch
            val ch = _uiState.value.currentChapter
            val list = mutableListOf<CrossReference>()
            for (v in verseNumbers) {
                list.addAll(repository.getCrossReferences(currentBook.id, ch, v))
            }
            _uiState.update {
                it.copy(
                    crossRefSheetVerses = verseNumbers,
                    crossRefsForSheet = list
                )
            }
        }
    }

    fun dismissCrossReferences() {
        _uiState.update {
            it.copy(crossRefSheetVerses = null, crossRefsForSheet = emptyList())
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
            _uiState.update { it.copy(fontSizeScale = values[currentIndex + 1]) }
        }
    }

    fun decreaseFontSize() {
        val values = FontSizeScale.entries
        val currentIndex = values.indexOf(_uiState.value.fontSizeScale)
        if (currentIndex > 0) {
            _uiState.update { it.copy(fontSizeScale = values[currentIndex - 1]) }
        }
    }

    fun resetFontSize() {
        _uiState.update { it.copy(fontSizeScale = FontSizeScale.S) }
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
    }

    fun setReaderFontFamily(fontFamily: ReaderFontFamily) {
        _uiState.update { it.copy(readerFontFamily = fontFamily) }
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
