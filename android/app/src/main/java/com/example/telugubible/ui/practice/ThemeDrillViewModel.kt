package com.example.telugubible.ui.practice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.ThemeProgressEntity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ThemeScope {
    ALL,
    OT,
    NT
}

data class ThemeDrillItem(
    val book: Book,
    val progress: ThemeProgressEntity?
)

data class ThemeDrillUiState(
    val scope: ThemeScope = ThemeScope.ALL,
    val queue: List<ThemeDrillItem> = emptyList(),
    val currentIndex: Int = 0,
    val isRevealed: Boolean = false,
    val learnedCount: Int = 0,
    val totalCount: Int = 66,
    val isLoading: Boolean = true,
    val lastGradedIntervalDays: Int? = null,
    val isFinished: Boolean = false
) {
    val currentItem: ThemeDrillItem?
        get() = queue.getOrNull(currentIndex)
}

class ThemeDrillViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(ThemeDrillUiState())
    val uiState: StateFlow<ThemeDrillUiState> = _uiState.asStateFlow()

    private var allBooksCache: List<Book> = emptyList()
    private var frozenPool: List<ThemeDrillItem>? = null

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val books = repository.getBooks()
            allBooksCache = books
            buildPool(resetFrozen = true)
        }
    }

    fun onScreenEntered() {
        if (_uiState.value.isFinished || _uiState.value.queue.isEmpty()) {
            restart()
        } else {
            _uiState.update { it.copy(isRevealed = false) }
        }
    }

    fun setScope(scope: ThemeScope) {
        if (_uiState.value.scope == scope) return
        _uiState.update { it.copy(scope = scope, currentIndex = 0, isRevealed = false, isFinished = false) }
        viewModelScope.launch {
            buildPool(resetFrozen = true)
        }
    }

    fun revealAnswer() {
        _uiState.update { it.copy(isRevealed = true) }
    }

    fun skipToNext() {
        val state = _uiState.value
        if (state.queue.isEmpty()) return
        val nextIndex = if (state.currentIndex < state.queue.size - 1) state.currentIndex + 1 else 0
        _uiState.update {
            it.copy(
                currentIndex = nextIndex,
                isRevealed = false
            )
        }
    }

    fun gradeCurrent(score: Int) {
        val current = _uiState.value.currentItem ?: return

        viewModelScope.launch {
            if (frozenPool == null) {
                frozenPool = _uiState.value.queue
            }

            val entity = repository.gradeThemeProgress(current.book.id, score)
            val allProgress = repository.getAllThemeProgress()
            val learned = allProgress.values.count { it.repetition >= 6 }

            val queue = frozenPool ?: _uiState.value.queue
            val isLast = _uiState.value.currentIndex >= queue.size - 1

            if (isLast) {
                frozenPool = null
                _uiState.update {
                    it.copy(
                        isRevealed = false,
                        learnedCount = learned,
                        lastGradedIntervalDays = entity.interval,
                        isFinished = true
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        currentIndex = it.currentIndex + 1,
                        isRevealed = false,
                        learnedCount = learned,
                        lastGradedIntervalDays = entity.interval
                    )
                }
            }
        }
    }

    fun restart() {
        frozenPool = null
        _uiState.update { it.copy(currentIndex = 0, isRevealed = false, isFinished = false, isLoading = true) }
        viewModelScope.launch {
            buildPool(resetFrozen = true, forceAll = true)
        }
    }

    private suspend fun buildPool(resetFrozen: Boolean, forceAll: Boolean = false) {
        if (resetFrozen) {
            frozenPool = null
        }

        val allProgress = repository.getAllThemeProgress()
        val learned = allProgress.values.count { it.repetition >= 6 }
        val now = System.currentTimeMillis()

        val books = when (_uiState.value.scope) {
            ThemeScope.ALL -> allBooksCache
            ThemeScope.OT -> allBooksCache.filter { it.testament.equals("OT", ignoreCase = true) }
            ThemeScope.NT -> allBooksCache.filter { it.testament.equals("NT", ignoreCase = true) }
        }

        // Remora queue logic:
        // 1. Due first (most overdue leading)
        // 2. Never-attempted fresh books in canon order
        // 3. Deliberately excludes books known and not yet due unless forceAll is set or nothing is due/fresh
        val dueBooks = books.filter { b ->
            val p = allProgress[b.id]
            p != null && p.nextDueDate <= now
        }.sortedBy { allProgress[it.id]?.nextDueDate ?: Long.MAX_VALUE }

        val freshBooks = books.filter { b -> !allProgress.containsKey(b.id) }

        val targetBooks = when {
            forceAll -> books
            dueBooks.isNotEmpty() -> dueBooks + freshBooks
            freshBooks.isNotEmpty() -> freshBooks
            else -> books // Fallback so practice is always possible across the scope!
        }

        val items = targetBooks.map { b ->
            ThemeDrillItem(
                book = b,
                progress = allProgress[b.id]
            )
        }

        _uiState.update {
            it.copy(
                queue = items,
                currentIndex = 0,
                isRevealed = false,
                learnedCount = learned,
                totalCount = 66,
                isLoading = false,
                isFinished = false
            )
        }
    }
}
