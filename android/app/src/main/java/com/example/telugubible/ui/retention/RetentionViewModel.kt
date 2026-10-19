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

class RetentionViewModel(
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
            val leeches = RetentionAnalytics.computeLeeches(verses, chapterProgress, booksMap)
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
                coldCheckFinishedResult = null
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

        val typed = state.coldCheckAnswerTyped.trim()
        val isCorrect = if (item.kind == "verse") {
            // Verse accuracy check: words match or fuzzy match
            val targetWords = item.answer.lowercase().split("\\s+".toRegex()).filter { it.isNotBlank() }
            val typedWords = typed.lowercase().split("\\s+".toRegex()).filter { it.isNotBlank() }
            if (targetWords.isEmpty()) false
            else {
                val matches = typedWords.count { targetWords.contains(it) }
                (matches.toDouble() / targetWords.size) >= 0.75
            }
        } else {
            // Anchor word check: exact or single word match
            val cleanedTarget = item.answer.trim().lowercase()
            val cleanedTyped = typed.trim().lowercase()
            cleanedTarget == cleanedTyped || cleanedTarget.startsWith(cleanedTyped) && cleanedTyped.length >= 3
        }

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

            viewModelScope.launch {
                repository.recordColdCheck(result.correct, result.total, result.medianColdFor)
                _uiState.update {
                    it.copy(
                        coldCheckFinishedResult = result,
                        lastColdCheck = result
                    )
                }
            }
        }
    }

    fun closeColdCheck() {
        _uiState.update {
            it.copy(isColdCheckActive = false, coldCheckFinishedResult = null)
        }
        loadAnalytics()
    }
}
