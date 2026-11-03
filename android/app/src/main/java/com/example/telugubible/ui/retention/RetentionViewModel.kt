package com.example.telugubible.ui.retention

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.analytics.RetentionAnalytics
import com.example.telugubible.data.model.*
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException

internal fun coldAnswerMatches(kind: String, answer: String, typed: String): Boolean {
    val cleanAnswer = answer.trim().lowercase()
    val cleanTyped = typed.trim().lowercase()
    if (cleanAnswer.isBlank() || cleanTyped.isBlank()) return false
    if (kind != "verse") return cleanAnswer == cleanTyped || (cleanTyped.length >= 3 && cleanAnswer.startsWith(cleanTyped))
    val targetWords = cleanAnswer.split(Regex("\\s+")).filter { it.isNotBlank() }
    val typedWords = cleanTyped.split(Regex("\\s+")).filter { it.isNotBlank() }
    val available = targetWords.groupingBy { it }.eachCount().toMutableMap()
    var matches = 0
    for (word in typedWords) {
        val count = available[word] ?: 0
        if (count > 0) { matches++; available[word] = count - 1 }
    }
    return targetWords.isNotEmpty() && matches.toDouble() / targetWords.size >= 0.75
}

class RetentionViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(RetentionUiState())
    val uiState: StateFlow<RetentionUiState> = _uiState.asStateFlow()

    init {
        loadAnalytics()
    }

    fun loadAnalytics() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val now = System.currentTimeMillis()
            val log = repository.getReviewLog()
            val verses = repository.getUserMemoryVerses()
            val chapterProgress = repository.getAllChapterProgress()
            val themeProgress = repository.getAllThemeProgress().values.toList()
            val settings = repository.getAppSettings()
            val adherence = repository.getAdherenceStats()
            val lastCold = repository.getLastColdCheck()
            val books = repository.getBooks()
            val booksMap = books.associateBy { it.id }

            // Load chapter anchors for all books with progress
            val anchorsMap = mutableMapOf<String, ChapterAnchor>()
            for (p in chapterProgress) {
                if (!anchorsMap.containsKey("${p.bookId}:${p.chapter}")) {
                    val anchors = repository.getChapterAnchors(p.bookId)
                    for (a in anchors) {
                        anchorsMap["${a.bookId}:${a.chapter}"] = a
                    }
                }
            }

            val headline = RetentionAnalytics.firstTryRetention(log, windowDays = 30, now = now)
            val curve = RetentionAnalytics.retentionByInterval(log, windowDays = 90, now = now)
            val curveSummary = RetentionAnalytics.curveRead(curve)
            val needsShortening = RetentionAnalytics.needsShortening(curve, settings.intervalScale)
            val honestyGap = RetentionAnalytics.honestyGap(log, windowDays = 30, now = now)
            val byLayer = RetentionAnalytics.layerRetention(log, windowDays = 30, now = now)
            val leeches = RetentionAnalytics.computeLeeches(verses, chapterProgress, booksMap, themeProgress)
            val activeDaysCount = RetentionAnalytics.activeDays(log, windowDays = 45, now = now)
            val overdue = RetentionAnalytics.overdueCount(verses, chapterProgress, now = now)
            val coldCandidates = RetentionAnalytics.findColdItems(log, verses, chapterProgress, anchorsMap, booksMap, now = now)

            _uiState.update {
                it.copy(
                    isLoading = false,
                    headline = headline,
                    overdueCount = overdue,
                    curve = curve,
                    curveSummary = curveSummary,
                    needsShortening = needsShortening,
                    intervalScale = settings.intervalScale,
                    honestyGap = honestyGap,
                    byLayer = byLayer,
                    coldAvailableCount = coldCandidates.size,
                    lastColdCheck = lastCold,
                    coldCheckCandidates = coldCandidates,
                    leeches = leeches,
                    activeDaysCount = activeDaysCount,
                    adherence = adherence
                )
            }
        }
    }

    fun setIntervalScale(scale: Double) {
        viewModelScope.launch {
            repository.updateIntervalScale(scale)
            _uiState.update {
                val needs = RetentionAnalytics.needsShortening(it.curve, scale)
                it.copy(intervalScale = scale, needsShortening = needs)
            }
        }
    }

    // Cold Check interactive drill
    fun startColdCheck() {
        val candidates = _uiState.value.coldCheckCandidates
        if (candidates.isEmpty()) return
        _uiState.update {
            it.copy(
                isColdCheckActive = true,
                activeColdIndex = 0,
                coldCheckAnswerTyped = "",
                coldCheckRevealed = false,
                coldCheckCorrectKeys = emptySet(),
                coldCheckFinishedResult = null,
                coldCheckSaving = false,
                coldCheckSaveError = null
            )
        }
    }

    fun updateColdAnswer(typed: String) {
        _uiState.update { it.copy(coldCheckAnswerTyped = typed) }
    }

    fun revealColdAnswer() {
        val state = _uiState.value
        val item = state.coldCheckCandidates.getOrNull(state.activeColdIndex) ?: return
        if (state.coldCheckRevealed) return

        val isCorrect = coldAnswerMatches(item.kind, item.answer, state.coldCheckAnswerTyped)

        val nextCorrect = if (isCorrect) state.coldCheckCorrectKeys + item.key else state.coldCheckCorrectKeys
        _uiState.update {
            it.copy(
                coldCheckRevealed = true,
                coldCheckCorrectKeys = nextCorrect
            )
        }
    }

    fun nextColdItem() {
        val state = _uiState.value
        if (!state.isColdCheckActive || !state.coldCheckRevealed || state.coldCheckSaving ||
            state.coldCheckFinishedResult != null || state.coldCheckSaveError != null || state.coldCheckCandidates.isEmpty()) return
        if (state.activeColdIndex < state.coldCheckCandidates.size - 1) {
            _uiState.update {
                it.copy(
                    activeColdIndex = it.activeColdIndex + 1,
                    coldCheckAnswerTyped = "",
                    coldCheckRevealed = false
                )
            }
        } else {
            // Finish cold check
            val candidates = state.coldCheckCandidates
            val medianCold = if (candidates.isNotEmpty()) {
                val sorted = candidates.map { it.coldForDays }.sorted()
                sorted[sorted.size / 2]
            } else 30

            val result = ColdCheckResult(
                ts = System.currentTimeMillis(),
                correct = state.coldCheckCorrectKeys.size,
                total = candidates.size,
                medianColdFor = medianCold
            )

            _uiState.update { it.copy(coldCheckSaving = true) }
            viewModelScope.launch {
                try {
                    repository.recordColdCheck(result.correct, result.total, result.medianColdFor)
                    _uiState.update { it.copy(coldCheckFinishedResult = result, lastColdCheck = result) }
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    _uiState.update { it.copy(coldCheckSaveError = "Could not confirm this check was saved. Close it and check your history before trying again.") }
                } finally {
                    _uiState.update { it.copy(coldCheckSaving = false) }
                }
            }
        }
    }

    fun closeColdCheck() {
        if (_uiState.value.coldCheckSaving) return
        _uiState.update {
            it.copy(isColdCheckActive = false, coldCheckFinishedResult = null)
        }
        loadAnalytics()
    }
}
