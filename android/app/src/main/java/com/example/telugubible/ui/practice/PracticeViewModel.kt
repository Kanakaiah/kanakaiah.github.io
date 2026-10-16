package com.example.telugubible.ui.practice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class PracticeUiState(
    val verses: List<UserMemoryVerse> = emptyList(),
    val currentIndex: Int = 0,
    val isRevealed: Boolean = false,
    val isFinished: Boolean = false,
    val isLoading: Boolean = true
) {
    val currentVerse: UserMemoryVerse?
        get() = verses.getOrNull(currentIndex)
}

class PracticeViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = BibleRepository(BibleDatabaseHelper(application))

    private val _uiState = MutableStateFlow(PracticeUiState())
    val uiState: StateFlow<PracticeUiState> = _uiState.asStateFlow()

    init {
        loadPracticeVerses()
    }

    fun loadPracticeVerses() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, isFinished = false, currentIndex = 0, isRevealed = false) }
            val allVerses = repository.getUserMemoryVerses()
            val now = System.currentTimeMillis()

            // Prioritize due verses, fallback to all verses if none are due
            val due = allVerses.filter { it.nextDueDate <= now }
            val queue = if (due.isNotEmpty()) due else allVerses

            _uiState.update {
                it.copy(
                    verses = queue,
                    currentIndex = 0,
                    isRevealed = false,
                    isFinished = queue.isEmpty(),
                    isLoading = false
                )
            }
        }
    }

    fun revealVerse() {
        _uiState.update { it.copy(isRevealed = true) }
    }

    fun gradeCurrent(score: Int) {
        val state = _uiState.value
        val verse = state.currentVerse ?: return

        viewModelScope.launch {
            repository.gradeUserVerse(verse.id, score)

            val nextIndex = state.currentIndex + 1
            if (nextIndex >= state.verses.size) {
                _uiState.update { it.copy(isFinished = true, currentIndex = nextIndex) }
            } else {
                _uiState.update {
                    it.copy(
                        currentIndex = nextIndex,
                        isRevealed = false
                    )
                }
            }
        }
    }

    fun restart() {
        loadPracticeVerses()
    }
}
