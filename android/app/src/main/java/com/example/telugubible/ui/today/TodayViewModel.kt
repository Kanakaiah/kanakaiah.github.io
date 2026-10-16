package com.example.telugubible.ui.today

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class VerseFilter {
    ALL, DUE, LEARNING, MEMORIZED
}

data class TodayUiState(
    val verses: List<UserMemoryVerse> = emptyList(),
    val filteredVerses: List<UserMemoryVerse> = emptyList(),
    val books: List<Book> = emptyList(),
    val filter: VerseFilter = VerseFilter.ALL,
    val streak: Int = 14,
    val memorizedCount: Int = 0,
    val learningCount: Int = 0,
    val dueCount: Int = 0,
    val isLoading: Boolean = true,
    val showAddDialog: Boolean = false
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

            val now = System.currentTimeMillis()
            val memorized = verses.count { it.status == "memorized" }
            val learning = verses.count { it.status == "learning" }
            val due = verses.count { it.nextDueDate <= now }

            val filtered = filterList(verses, _uiState.value.filter, now)

            _uiState.update {
                it.copy(
                    verses = verses,
                    filteredVerses = filtered,
                    books = books,
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
        val filtered = filterList(_uiState.value.verses, filter, now)
        _uiState.update { it.copy(filter = filter, filteredVerses = filtered) }
    }

    private fun filterList(list: List<UserMemoryVerse>, filter: VerseFilter, now: Long): List<UserMemoryVerse> {
        return when (filter) {
            VerseFilter.ALL -> list
            VerseFilter.DUE -> list.filter { it.nextDueDate <= now }
            VerseFilter.LEARNING -> list.filter { it.status == "learning" }
            VerseFilter.MEMORIZED -> list.filter { it.status == "memorized" }
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
            _uiState.update { it.copy(showAddDialog = false) }
            loadData()
        }
    }

    fun toggleAddDialog(show: Boolean) {
        _uiState.update { it.copy(showAddDialog = show) }
    }
}
