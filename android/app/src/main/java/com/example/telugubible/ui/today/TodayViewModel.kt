package com.example.telugubible.ui.today

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.util.BookMasteryCounts
import com.example.telugubible.util.MasteryUtils
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class VerseFilter {
    ALL, DUE, LEARNING, MEMORIZED
}

data class AddingProgress(
    val collectionName: String,
    val current: Int,
    val total: Int
)

data class TodayUiState(
    val verses: List<UserMemoryVerse> = emptyList(),
    val filteredVerses: List<UserMemoryVerse> = emptyList(),
    val books: List<Book> = emptyList(),
    val presetCollections: List<PresetCollection> = emptyList(),
    val heroVerse: UserMemoryVerse? = null,
    val searchQuery: String = "",
    val filter: VerseFilter = VerseFilter.ALL,
    val displayLanguage: DisplayLanguage = DisplayLanguage.ENGLISH,
    val streak: Int = 14,
    val memorizedCount: Int = 0,
    val learningCount: Int = 0,
    val dueCount: Int = 0,
    val isLoading: Boolean = true,
    val addingProgress: AddingProgress? = null,
    val showAddDialog: Boolean = false,
    val selectedVerseForDetail: UserMemoryVerse? = null,
    val searchResults: List<VerseSearchResult> = emptyList(),
    val isSearchingInDialog: Boolean = false,
    val messageBanner: String? = null,
    val masteryByBook: Map<Int, BookMasteryCounts> = emptyMap(),
    val totalSecureChapters: Int = 0,
    val totalBibleChapters: Int = 1189,
    val dueChaptersByBook: Map<Int, Int> = emptyMap(),
    val dueThemesCount: Int = 0,
    val secureThemesCount: Int = 0,
    val topics: List<Topic> = emptyList(),
    val selectedTopicId: String? = null,
    val showManageTopicsSheet: Boolean = false,
    val bionicReading: Boolean = false,
    val recallMasking: Boolean = false,
    val fontSizeMultiplier: Float = 1.0f,
    val activeVersion: String = "LSB",
    val isTtsSpeaking: Boolean = false
)

class TodayViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val ttsManager = com.example.telugubible.util.TtsManager(application)
    private val _uiState = MutableStateFlow(TodayUiState())
    val uiState: StateFlow<TodayUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val books = repository.getBooks()
            val verses = repository.getUserMemoryVerses()
            val streak = repository.getStreak()
            val collections = repository.getPresetCollections()
            val topics = repository.getTopics()
            val chapterProgress = repository.getAllChapterProgress()
            val themeProgress = repository.getAllThemeProgress()
            val settings = repository.getAppSettings()

            val now = System.currentTimeMillis()
            val memorized = verses.count { it.status == "memorized" }
            val learning = verses.count { it.status == "learning" }
            val dueList = verses.filter { it.nextDueDate <= now }
            val due = dueList.size
            val hero = dueList.firstOrNull() ?: verses.firstOrNull()

            val filtered = filterAndSearchList(
                list = verses,
                filter = _uiState.value.filter,
                query = _uiState.value.searchQuery,
                selectedTopicId = _uiState.value.selectedTopicId,
                now = now
            )

            // Calculate Book Mastery for all 66 books
            val masteryMap = books.associate { book ->
                val pList = chapterProgress.filter { it.bookId == book.id }
                book.id to MasteryUtils.calculateBookMastery(book.id, book.chapters, pList, now)
            }
            val totalSecure = masteryMap.values.sumOf { it.secure }
            val totalChapters = books.sumOf { it.chapters }.coerceAtLeast(1189)

            // Overdue chapter anchors grouped by book
            val dueChaptersMap = chapterProgress
                .filter { it.attempts > 0 && it.nextDueDate <= now }
                .groupBy { it.bookId }
                .mapValues { it.value.size }

            // Theme progress rollups
            val secureThemes = themeProgress.values.count { it.repetition >= 6 }
            val dueThemes = themeProgress.values.count { it.attempts > 0 && it.nextDueDate <= now }

            _uiState.update {
                it.copy(
                    verses = verses,
                    filteredVerses = filtered,
                    books = books,
                    presetCollections = collections,
                    topics = topics,
                    heroVerse = hero,
                    streak = streak,
                    memorizedCount = memorized,
                    learningCount = learning,
                    dueCount = due,
                    masteryByBook = masteryMap,
                    totalSecureChapters = totalSecure,
                    totalBibleChapters = totalChapters,
                    dueChaptersByBook = dueChaptersMap,
                    activeVersion = settings.bibleVersion.ifBlank { "LSB" },
                    secureThemesCount = secureThemes,
                    dueThemesCount = dueThemes,
                    bionicReading = settings.bionicReading,
                    recallMasking = settings.recallMasking,
                    fontSizeMultiplier = settings.fontSize,
                    isLoading = false
                )
            }
        }
    }

    fun setFilter(filter: VerseFilter) {
        val now = System.currentTimeMillis()
        val filtered = filterAndSearchList(_uiState.value.verses, filter, _uiState.value.searchQuery, _uiState.value.selectedTopicId, now)
        _uiState.update { it.copy(filter = filter, filteredVerses = filtered) }
    }

    fun setSearchQuery(query: String) {
        val now = System.currentTimeMillis()
        val filtered = filterAndSearchList(_uiState.value.verses, _uiState.value.filter, query, _uiState.value.selectedTopicId, now)
        _uiState.update { it.copy(searchQuery = query, filteredVerses = filtered) }
    }

    fun setDisplayLanguage(lang: DisplayLanguage) {
        _uiState.update { it.copy(displayLanguage = lang) }
    }

    fun toggleDisplayLanguage() {
        val newLang = if (_uiState.value.displayLanguage == DisplayLanguage.ENGLISH) {
            DisplayLanguage.TELUGU
        } else {
            DisplayLanguage.ENGLISH
        }
        setDisplayLanguage(newLang)
    }

    fun selectTopic(topicId: String?) {
        val now = System.currentTimeMillis()
        val filtered = filterAndSearchList(
            list = _uiState.value.verses,
            filter = _uiState.value.filter,
            query = _uiState.value.searchQuery,
            selectedTopicId = topicId,
            now = now
        )
        _uiState.update { it.copy(selectedTopicId = topicId, filteredVerses = filtered) }
    }

    fun toggleManageTopicsSheet(show: Boolean) {
        _uiState.update { it.copy(showManageTopicsSheet = show) }
    }

    fun createTopic(name: String) {
        viewModelScope.launch {
            repository.createTopic(name)
            loadData()
        }
    }

    fun renameTopic(id: String, newName: String) {
        viewModelScope.launch {
            repository.renameTopic(id, newName)
            loadData()
        }
    }

    fun deleteTopic(id: String) {
        viewModelScope.launch {
            repository.deleteTopic(id)
            if (_uiState.value.selectedTopicId == id) {
                _uiState.update { it.copy(selectedTopicId = null) }
            }
            loadData()
        }
    }

    fun toggleVerseTopic(verseId: Long, topicId: String) {
        viewModelScope.launch {
            repository.toggleVerseTopic(verseId, topicId)
            val verses = repository.getUserMemoryVerses()
            val topics = repository.getTopics()
            val now = System.currentTimeMillis()
            val filtered = filterAndSearchList(
                list = verses,
                filter = _uiState.value.filter,
                query = _uiState.value.searchQuery,
                selectedTopicId = _uiState.value.selectedTopicId,
                now = now
            )
            val updatedSelected = verses.firstOrNull { it.id == _uiState.value.selectedVerseForDetail?.id }
            _uiState.update {
                it.copy(
                    verses = verses,
                    topics = topics,
                    filteredVerses = filtered,
                    selectedVerseForDetail = updatedSelected ?: it.selectedVerseForDetail
                )
            }
        }
    }

    fun createTopicForVerse(verseId: Long, name: String) {
        viewModelScope.launch {
            val topic = repository.createTopic(name)
            repository.toggleVerseTopic(verseId, topic.id)
            loadData()
            val verses = repository.getUserMemoryVerses()
            val updatedSelected = verses.firstOrNull { it.id == verseId }
            _uiState.update { it.copy(selectedVerseForDetail = updatedSelected ?: it.selectedVerseForDetail) }
        }
    }

    private fun filterAndSearchList(
        list: List<UserMemoryVerse>,
        filter: VerseFilter,
        query: String,
        selectedTopicId: String?,
        now: Long
    ): List<UserMemoryVerse> {
        val topicFiltered = if (selectedTopicId != null) {
            list.filter { selectedTopicId in it.topicIds }
        } else {
            list
        }
        val q = query.trim().lowercase()
        val filteredByStatus = when (filter) {
            VerseFilter.ALL -> topicFiltered
            VerseFilter.DUE -> topicFiltered.filter { it.nextDueDate <= now }
            VerseFilter.LEARNING -> topicFiltered.filter { it.status == "learning" }
            VerseFilter.MEMORIZED -> topicFiltered.filter { it.status == "memorized" }
        }

        if (q.isEmpty()) return filteredByStatus

        return filteredByStatus.filter { v ->
            v.bookNameEn.lowercase().contains(q) ||
            v.bookNameTe.lowercase().contains(q) ||
            (v.textEn?.lowercase()?.contains(q) == true) ||
            (v.textTe?.lowercase()?.contains(q) == true) ||
            "${v.chapter}:${v.verse}".contains(q)
        }
    }

    fun selectVerseForDetail(verse: UserMemoryVerse?) {
        _uiState.update { it.copy(selectedVerseForDetail = verse) }
    }

    fun selectNextVerse() {
        val current = _uiState.value.selectedVerseForDetail ?: return
        val list = _uiState.value.filteredVerses
        val currentIndex = list.indexOfFirst { it.id == current.id }
        if (currentIndex != -1 && currentIndex + 1 < list.size) {
            _uiState.update { it.copy(selectedVerseForDetail = list[currentIndex + 1]) }
        }
    }

    fun selectPreviousVerse() {
        val current = _uiState.value.selectedVerseForDetail ?: return
        val list = _uiState.value.filteredVerses
        val currentIndex = list.indexOfFirst { it.id == current.id }
        if (currentIndex > 0) {
            _uiState.update { it.copy(selectedVerseForDetail = list[currentIndex - 1]) }
        }
    }

    fun removeVerse(id: Long) {
        viewModelScope.launch {
            if (_uiState.value.selectedVerseForDetail?.id == id) {
                _uiState.update { it.copy(selectedVerseForDetail = null) }
            }
            repository.removeUserVerse(id)
            loadData()
        }
    }

    fun addVerse(bookId: Int, chapter: Int, verse: Int) {
        viewModelScope.launch {
            repository.addUserVerse(bookId, chapter, verse)
            _uiState.update { it.copy(showAddDialog = false, messageBanner = "Verse added to Today") }
            loadData()
        }
    }

    fun addCollection(collectionId: String) {
        val name = if (collectionId == "well_known") "75 Well-Known Verses" else "Top 100 Verses"
        val estimatedTotal = if (collectionId == "well_known") 75 else 100
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    addingProgress = AddingProgress(name, 0, estimatedTotal)
                )
            }
            val count = repository.addPresetCollection(collectionId) { current, total ->
                _uiState.update {
                    it.copy(addingProgress = AddingProgress(name, current, total))
                }
            }
            _uiState.update {
                it.copy(
                    addingProgress = null,
                    showAddDialog = false,
                    messageBanner = "Added $name ($count passages) to your library!"
                )
            }
            loadData()
        }
    }

    fun toggleAddDialog(show: Boolean) {
        _uiState.update { it.copy(showAddDialog = show, searchResults = emptyList()) }
    }

    fun searchVersesForDialog(query: String) {
        if (query.isBlank()) {
            _uiState.update { it.copy(searchResults = emptyList()) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSearchingInDialog = true) }
            val results = repository.searchVerses(query, limit = 25)
            _uiState.update { it.copy(searchResults = results, isSearchingInDialog = false) }
        }
    }

    fun toggleTts(verse: UserMemoryVerse?) {
        if (_uiState.value.isTtsSpeaking) {
            ttsManager.stop()
            _uiState.update { it.copy(isTtsSpeaking = false) }
        } else if (verse != null) {
            val isEn = _uiState.value.displayLanguage == DisplayLanguage.ENGLISH
            val text = (if (isEn) verse.textEn else verse.textTe)
                ?: (if (isEn) verse.textTe else verse.textEn) ?: ""
            ttsManager.speak(text, langCode = if (isEn) "en" else "te", onDone = {
                _uiState.update { it.copy(isTtsSpeaking = false) }
            })
            _uiState.update { it.copy(isTtsSpeaking = true) }
        }
    }

    fun stopTts() {
        ttsManager.stop()
        _uiState.update { it.copy(isTtsSpeaking = false) }
    }

    override fun onCleared() {
        super.onCleared()
        ttsManager.shutdown()
    }

    fun dismissMessage() {
        _uiState.update { it.copy(messageBanner = null) }
    }
}
