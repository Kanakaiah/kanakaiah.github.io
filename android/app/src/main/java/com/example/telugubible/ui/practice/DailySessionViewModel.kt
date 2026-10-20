package com.example.telugubible.ui.practice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.util.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SessionOutcome(
    val id: String,
    val kind: String,
    val score: Int
)

data class DailySessionUiState(
    val plan: SessionPlan? = null,
    val currentIndex: Int = 0,
    val isRevealed: Boolean = false,
    val isFinished: Boolean = false,
    val isLoading: Boolean = true,
    val displayLanguage: DisplayLanguage = DisplayLanguage.ENGLISH,
    val activeVerseMode: PracticeMode = PracticeMode.TYPING,
    val anchorInput: String = "",
    val anchorJudgement: AnchorJudgement? = null,
    val outcomes: List<SessionOutcome> = emptyList(),
    val startedAtMs: Long = 0L,
    val verseAccuracy: Int? = null,
    val verseCommitted: String? = null,
    val hintRevealedRatio: Float? = null,
    val eraserHiddenRatio: Float? = null,
    val scrambleAccuracy: Float? = null
) {
    val currentItem: SessionItem?
        get() = plan?.items?.getOrNull(currentIndex)

    val gradeCeiling: Int
        get() {
            if (activeVerseMode == PracticeMode.ERASER) {
                val hidden = eraserHiddenRatio ?: return 5
                return when {
                    hidden >= 0.75f -> 5
                    hidden >= 0.50f -> 4
                    hidden >= 0.25f -> 3
                    else -> 1
                }
            }
            if (activeVerseMode == PracticeMode.SCRAMBLE) {
                val acc = scrambleAccuracy ?: return 5
                return when {
                    acc >= 0.90f -> 5
                    acc >= 0.75f -> 4
                    acc >= 0.50f -> 3
                    else -> 1
                }
            }
            if (activeVerseMode == PracticeMode.SPEECH) {
                val acc = verseAccuracy ?: return 5
                return when {
                    acc >= 90 -> 5
                    acc >= 75 -> 4
                    acc >= 50 -> 3
                    else -> 1
                }
            }
            val ratio = hintRevealedRatio ?: return 5
            return when {
                ratio <= 0.05f -> 5
                ratio <= 0.25f -> 4
                ratio <= 0.75f -> 3
                else -> 1
            }
        }
}

class DailySessionViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    companion object {
        const val KEY_DAILY_SESSION_INDEX = "daily_session_current_index"
        const val KEY_DAILY_SESSION_STARTED = "daily_session_started_at"
    }

    private val _uiState = MutableStateFlow(DailySessionUiState())
    val uiState: StateFlow<DailySessionUiState> = _uiState.asStateFlow()

    private var sessionRecorded = false

    init {
        loadSession()
    }

    fun loadSession(bookId: Int? = null, forceNew: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, isFinished = false) }

            val allVerses = repository.getUserMemoryVerses()
            val allChapterProgress = repository.getAllChapterProgress().associateBy { "${it.bookId}:${it.chapter}" }
            val allThemeProgress = repository.getAllThemeProgress()
            val books = repository.getBooks()
            val booksMap = books.associateBy { it.id }

            // Collect anchors for all books touched or in focus
            val anchorsByBook = mutableMapOf<Int, List<com.example.telugubible.data.model.ChapterAnchor>>()
            val targetBooks = if (bookId != null) listOf(bookId) else books.map { it.id }
            for (bId in targetBooks) {
                anchorsByBook[bId] = repository.getChapterAnchors(bId)
            }

            val appSettings = repository.getAppSettings()
            val plan = SessionPlanner.buildSession(
                allVerses = allVerses,
                allChapterProgress = allChapterProgress,
                allThemeProgress = allThemeProgress,
                booksMap = booksMap,
                anchorsByBook = anchorsByBook,
                options = SessionOptions(
                    cap = SessionPlanner.DEFAULT_CAP,
                    newChapters = appSettings.dailyChapterTarget,
                    bookId = bookId,
                    now = System.currentTimeMillis()
                )
            )

            val now = System.currentTimeMillis()
            _uiState.update {
                it.copy(
                    plan = plan,
                    currentIndex = 0,
                    isRevealed = false,
                    isFinished = plan.items.isEmpty(),
                    isLoading = false,
                    startedAtMs = now,
                    outcomes = emptyList(),
                    anchorInput = "",
                    anchorJudgement = null,
                    verseAccuracy = null,
                    verseCommitted = null,
                    hintRevealedRatio = null,
                    eraserHiddenRatio = null,
                    scrambleAccuracy = null
                )
            }

            sessionRecorded = false
        }
    }

    fun revealAnswer() {
        _uiState.update { it.copy(isRevealed = true) }
    }

    fun setVerseMode(mode: PracticeMode) {
        _uiState.update {
            it.copy(
                activeVerseMode = mode,
                isRevealed = false,
                verseAccuracy = null,
                verseCommitted = null,
                hintRevealedRatio = null,
                eraserHiddenRatio = null,
                scrambleAccuracy = null
            )
        }
    }

    fun recordTypingAttempt(committedText: String, accuracy: Int) {
        _uiState.update {
            it.copy(
                verseCommitted = committedText,
                verseAccuracy = accuracy,
                isRevealed = true
            )
        }
    }

    fun updateHintRatio(ratio: Float) {
        _uiState.update { it.copy(hintRevealedRatio = ratio) }
    }

    fun updateEraserRatio(ratio: Float) {
        _uiState.update { it.copy(eraserHiddenRatio = ratio) }
    }

    fun recordScrambleAttempt(accuracy: Float) {
        _uiState.update {
            it.copy(
                scrambleAccuracy = accuracy,
                isRevealed = true
            )
        }
    }

    fun recordSpeechAttempt(accuracy: Int, committedText: String) {
        _uiState.update {
            it.copy(
                verseCommitted = committedText,
                verseAccuracy = accuracy,
                isRevealed = true
            )
        }
    }

    fun setAnchorInput(text: String) {
        _uiState.update { it.copy(anchorInput = text) }
    }

    fun checkAnchorAnswer() {
        val current = _uiState.value.currentItem as? SessionItem.Anchor ?: return
        val judgement = AnchorJudge.judgeByDirection(
            typed = _uiState.value.anchorInput,
            direction = current.direction,
            word = current.word,
            chapter = current.chapter,
            siblings = current.siblings
        )
        _uiState.update {
            it.copy(
                isRevealed = true,
                anchorJudgement = judgement
            )
        }
    }

    fun advanceIntroduce() {
        val plan = _uiState.value.plan ?: return
        val nextIndex = _uiState.value.currentIndex + 1
        _uiState.update {
            it.copy(
                currentIndex = nextIndex,
                isRevealed = false,
                anchorInput = "",
                anchorJudgement = null
            )
        }
    }

    fun gradeCurrent(score: Int) {
        val state = _uiState.value
        val item = state.currentItem ?: return

        viewModelScope.launch {
            when (item) {
                is SessionItem.Verse -> {
                    val effectiveScore = score.coerceAtMost(state.gradeCeiling)
                    val (cueLevel, modeName, accuracy) = when (state.activeVerseMode) {
                        PracticeMode.TYPING -> Triple(
                            CueLevel.FIRST_LETTERS.levelNumber,
                            "typing",
                            state.verseAccuracy?.let { it / 100.0 }
                        )
                        PracticeMode.FLASHCARD -> Triple(0, "reveal", null)
                        PracticeMode.FIRST_LETTER -> {
                            val ratio = state.hintRevealedRatio ?: 0f
                            val cue = when {
                                ratio > 0.75f -> CueLevel.FULL.levelNumber
                                ratio > 0.25f -> CueLevel.FIRST_LETTERS.levelNumber
                                ratio > 0f -> CueLevel.SPARSE.levelNumber
                                else -> CueLevel.FIRST_LETTERS.levelNumber
                            }
                            Triple(cue, "first_letters", (1.0 - ratio.toDouble()).coerceIn(0.0, 1.0))
                        }
                        PracticeMode.ERASER -> {
                            val hidden = state.eraserHiddenRatio ?: 0.25f
                            val cue = when {
                                hidden >= 0.75f -> CueLevel.NONE.levelNumber
                                hidden >= 0.50f -> CueLevel.SPARSE.levelNumber
                                else -> CueLevel.FIRST_LETTERS.levelNumber
                            }
                            Triple(cue, "eraser", hidden.toDouble())
                        }
                        PracticeMode.SCRAMBLE -> {
                            val acc = state.scrambleAccuracy?.toDouble() ?: 1.0
                            Triple(CueLevel.FIRST_LETTERS.levelNumber, "scramble", acc)
                        }
                        PracticeMode.SPEECH -> {
                            val acc = (state.verseAccuracy ?: 0) / 100.0
                            Triple(CueLevel.FIRST_LETTERS.levelNumber, "speech", acc)
                        }
                        PracticeMode.IMMERSED -> {
                            Triple(0, "immersed", null)
                        }
                    }
                    repository.gradeUserVerse(
                        id = item.verseId,
                        score = effectiveScore,
                        cueLevel = cueLevel,
                        mode = modeName,
                        measuredAccuracy = accuracy
                    )
                }
                is SessionItem.Anchor -> {
                    repository.gradeChapterAnchor(item.bookId, item.chapter, score)
                }
                is SessionItem.Theme -> {
                    repository.gradeThemeProgress(item.bookId, score)
                }
                is SessionItem.Introduce -> {
                    // Introduce items are not graded
                }
            }

            val newOutcomes = state.outcomes + SessionOutcome(item.id, item.kind, score)
            val nextIndex = state.currentIndex + 1
            val itemsCount = state.plan?.items?.size ?: 0

            if (nextIndex >= itemsCount) {
                // Session finished!
                val duration = System.currentTimeMillis() - state.startedAtMs
                repository.recordSessionAdherence(completed = true, durationMs = duration)
                sessionRecorded = true

                _uiState.update {
                    it.copy(
                        currentIndex = nextIndex,
                        isRevealed = false,
                        isFinished = true,
                        outcomes = newOutcomes,
                        anchorInput = "",
                        anchorJudgement = null,
                        verseAccuracy = null,
                        verseCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        currentIndex = nextIndex,
                        isRevealed = false,
                        outcomes = newOutcomes,
                        anchorInput = "",
                        anchorJudgement = null,
                        verseAccuracy = null,
                        verseCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null
                    )
                }
            }
        }
    }

    fun keepGoing() {
        loadSession(forceNew = true)
    }

    fun abandonSession() {
        val state = _uiState.value
        val itemsCount = state.plan?.items?.size ?: 0
        if (!sessionRecorded && state.currentIndex > 0 && state.currentIndex < itemsCount) {
            val duration = System.currentTimeMillis() - state.startedAtMs
            viewModelScope.launch {
                repository.recordSessionAdherence(
                    completed = false,
                    durationMs = duration,
                    abandonedAt = state.currentIndex
                )
                sessionRecorded = true
            }
        }
    }
}
