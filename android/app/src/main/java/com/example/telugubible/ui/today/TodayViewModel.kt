package com.example.telugubible.ui.today

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import com.example.telugubible.data.model.DisplayLanguage
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class VerseFilter {
    ALL, DUE, LEARNING, MEMORIZED
}

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
    val showAddDialog: Boolean = false,
    val searchResults: List<VerseSearchResult> = emptyList(),
    val isSearchingInDialog: Boolean = false,
    val messageBanner: String? = null
)

class TodayViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = BibleRepository(BibleDatabaseHelper(application))

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

            val now = System.currentTimeMillis()
            val memorized = verses.count { it.status == "memorized" }
            val learning = verses.count { it.status == "learning" }
            val dueList = verses.filter { it.nextDueDate <= now }
            val due = dueList.size
            val hero = dueList.firstOrNull() ?: verses.firstOrNull()

            val filtered = filterAndSearchList(verses, _uiState.value.filter, _uiState.value.searchQuery, now)

            _uiState.update {
                it.copy(
                    verses = verses,
                    filteredVerses = filtered,
                    books = books,
                    presetCollections = collections,
                    heroVerse = hero,
                    streak = streak,
                    memorizedCount = memorized,
                    learningCount = learning,
                    dueCount = due,
                    isLoading = false
                )
            }
        }
    }

    fun setFilter(filter: VerseFilter) {
        val now = System.currentTimeMillis()
        val filtered = filterAndSearchList(_uiState.value.verses, filter, _uiState.value.searchQuery, now)
        _uiState.update { it.copy(filter = filter, filteredVerses = filtered) }
    }

    fun setSearchQuery(query: String) {
        val now = System.currentTimeMillis()
        val filtered = filterAndSearchList(_uiState.value.verses, _uiState.value.filter, query, now)
        _uiState.update { it.copy(searchQuery = query, filteredVerses = filtered) }
    }

    fun setDisplayLanguage(lang: DisplayLanguage) {
        _uiState.update { it.copy(displayLanguage = lang) }
    }

    private fun filterAndSearchList(
        list: List<UserMemoryVerse>,
        filter: VerseFilter,
        query: String,
        now: Long
    ): List<UserMemoryVerse> {
        val q = query.trim().lowercase()
        val filteredByStatus = when (filter) {
            VerseFilter.ALL -> list
            VerseFilter.DUE -> list.filter { it.nextDueDate <= now }
            VerseFilter.LEARNING -> list.filter { it.status == "learning" }
            VerseFilter.MEMORIZED -> list.filter { it.status == "memorized" }
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

    fun removeVerse(id: Long) {
        viewModelScope.launch {
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
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val count = repository.addPresetCollection(collectionId)
            val name = if (collectionId == "well_known") "75 Well-Known Verses" else "Top 100 Verses"
            _uiState.update {
                it.copy(
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

    fun dismissMessage() {
        _uiState.update { it.copy(messageBanner = null) }
    }
}
