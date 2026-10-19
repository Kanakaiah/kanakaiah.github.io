package com.example.telugubible.ui.practice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.util.CueLevel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class PracticeMode(val label: String) {
    FLASHCARD("Flashcard"),
    TYPING("Type"),
    FIRST_LETTER("First Letters"),
    ERASER("Eraser"),
    SCRAMBLE("Scramble")
}

data class PracticeUiState(
    val verses: List<UserMemoryVerse> = emptyList(),
    val currentIndex: Int = 0,
    val isRevealed: Boolean = false,
    val isFinished: Boolean = false,
    val isLoading: Boolean = true,
    val displayLanguage: DisplayLanguage = DisplayLanguage.ENGLISH,
    val activeMode: PracticeMode = PracticeMode.TYPING,
    val modeAccuracy: Int? = null,
    val modeCommitted: String? = null
) {
    val currentVerse: UserMemoryVerse?
        get() = verses.getOrNull(currentIndex)
}

class PracticeViewModel(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    companion object {
        const val KEY_SESSION_VERSE_IDS = "practice_session_verse_ids"
        const val KEY_SESSION_INDEX = "practice_session_current_index"
        const val KEY_SESSION_REVEALED = "practice_session_is_revealed"
        const val KEY_SESSION_TIME = "practice_session_timestamp"
        const val KEY_SESSION_LANG = "practice_session_display_lang"
        const val KEY_SESSION_MODE = "practice_session_active_mode"
        private const val SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000L // 12 hours
    }

    private val _uiState = MutableStateFlow(PracticeUiState())
    val uiState: StateFlow<PracticeUiState> = _uiState.asStateFlow()

    init {
        loadPracticeVerses()
    }

    fun loadPracticeVerses(forceNewSession: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val allVerses = repository.getUserMemoryVerses()
            val allVersesMap = allVerses.associateBy { it.id }
            val now = System.currentTimeMillis()

            var restoredQueue: List<UserMemoryVerse>? = null
            var restoredIndex = 0
            var restoredRevealed = false
            var restoredLang = _uiState.value.displayLanguage
            var restoredMode = _uiState.value.activeMode

            if (!forceNewSession) {
                val savedIdsStr = repository.getSessionState(KEY_SESSION_VERSE_IDS)
                val savedTimeStr = repository.getSessionState(KEY_SESSION_TIME)
                val savedTime = savedTimeStr?.toLongOrNull() ?: 0L

                if (savedIdsStr != null && (now - savedTime) < SESSION_EXPIRY_MS) {
                    val savedIds = savedIdsStr.split(",").mapNotNull { it.trim().toLongOrNull() }
                    val loaded = savedIds.mapNotNull { allVersesMap[it] }
                    val savedIndex = repository.getSessionState(KEY_SESSION_INDEX)?.toIntOrNull() ?: 0
                    if (loaded.isNotEmpty() && savedIndex < loaded.size) {
                        restoredQueue = loaded
                        restoredIndex = savedIndex
                        restoredRevealed = repository.getSessionState(KEY_SESSION_REVEALED)?.toBooleanStrictOrNull() ?: false
                        val savedLang = repository.getSessionState(KEY_SESSION_LANG)
                        if (savedLang != null) {
                            restoredLang = try { DisplayLanguage.valueOf(savedLang) } catch (_: Exception) { restoredLang }
                        }
                        val savedMode = repository.getSessionState(KEY_SESSION_MODE)
                        if (savedMode != null) {
                            restoredMode = try { PracticeMode.valueOf(savedMode) } catch (_: Exception) { restoredMode }
                        }
                    }
                }
            }

            if (restoredQueue != null) {
                _uiState.update {
                    it.copy(
                        verses = restoredQueue,
                        currentIndex = restoredIndex,
                        isRevealed = restoredRevealed,
                        isFinished = false,
                        isLoading = false,
                        displayLanguage = restoredLang,
                        activeMode = restoredMode,
                        modeAccuracy = null,
                        modeCommitted = null
                    )
                }
            } else {
                // Prioritize due verses, fallback to all verses if none are due
                val due = allVerses.filter { it.nextDueDate <= now }
                val queue = if (due.isNotEmpty()) due else allVerses

                if (queue.isNotEmpty()) {
                    saveSessionState(
                        verseIds = queue.map { it.id },
                        index = 0,
                        isRevealed = false,
                        lang = restoredLang,
                        mode = restoredMode
                    )
                } else {
                    clearSessionState()
                }

                _uiState.update {
                    it.copy(
                        verses = queue,
                        currentIndex = 0,
                        isRevealed = false,
                        isFinished = queue.isEmpty(),
                        isLoading = false,
                        displayLanguage = restoredLang,
                        activeMode = restoredMode,
                        modeAccuracy = null,
                        modeCommitted = null
                    )
                }
            }
        }
    }

    fun setPracticeMode(mode: PracticeMode) {
        _uiState.update {
            it.copy(
                activeMode = mode,
                isRevealed = false,
                modeAccuracy = null,
                modeCommitted = null
            )
        }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_MODE, mode.name)
            repository.setSessionState(KEY_SESSION_REVEALED, "false")
        }
    }

    fun recordAttempt(accuracy: Int, committed: String) {
        _uiState.update {
            it.copy(
                modeAccuracy = accuracy,
                modeCommitted = committed,
                isRevealed = true
            )
        }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_REVEALED, "true")
        }
    }

    fun revealVerse() {
        _uiState.update { it.copy(isRevealed = true) }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_REVEALED, "true")
        }
    }

    fun setDisplayLanguage(lang: DisplayLanguage) {
        _uiState.update {
            it.copy(
                displayLanguage = lang,
                isRevealed = false,
                modeAccuracy = null,
                modeCommitted = null
            )
        }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_LANG, lang.name)
            repository.setSessionState(KEY_SESSION_REVEALED, "false")
        }
    }

    fun toggleDisplayLanguage() {
        val newLang = if (_uiState.value.displayLanguage == DisplayLanguage.ENGLISH) {
            DisplayLanguage.TELUGU
        } else {
            DisplayLanguage.ENGLISH
        }
        setDisplayLanguage(newLang)
    }

    fun gradeCurrent(score: Int) {
        val state = _uiState.value
        val verse = state.currentVerse ?: return

        viewModelScope.launch {
            val (cueLevel, modeName, accuracy) = when (state.activeMode) {
                PracticeMode.TYPING -> Triple(
                    CueLevel.FIRST_LETTERS.levelNumber,
                    "typing",
                    state.modeAccuracy?.let { it / 100.0 }
                )
                PracticeMode.FLASHCARD -> Triple(
                    0,
                    "reveal",
                    null
                )
                PracticeMode.FIRST_LETTER -> Triple(
                    CueLevel.FIRST_LETTERS.levelNumber,
                    "first_letters",
                    null
                )
                PracticeMode.ERASER -> Triple(
                    CueLevel.SPARSE.levelNumber,
                    "eraser",
                    null
                )
                PracticeMode.SCRAMBLE -> Triple(
                    1,
                    "scramble",
                    null
                )
            }

            repository.gradeUserVerse(
                id = verse.id,
                score = score,
                cueLevel = cueLevel,
                mode = modeName,
                measuredAccuracy = accuracy
            )

            val nextIndex = state.currentIndex + 1
            if (nextIndex >= state.verses.size) {
                clearSessionState()
                _uiState.update {
                    it.copy(
                        isFinished = true,
                        currentIndex = nextIndex,
                        isRevealed = false,
                        modeAccuracy = null,
                        modeCommitted = null
                    )
                }
            } else {
                repository.setSessionState(KEY_SESSION_INDEX, nextIndex.toString())
                repository.setSessionState(KEY_SESSION_REVEALED, "false")
                _uiState.update {
                    it.copy(
                        currentIndex = nextIndex,
                        isRevealed = false,
                        modeAccuracy = null,
                        modeCommitted = null
                    )
                }
            }
        }
    }

    fun restart() {
        loadPracticeVerses(forceNewSession = true)
    }

    private suspend fun saveSessionState(
        verseIds: List<Long>,
        index: Int,
        isRevealed: Boolean,
        lang: DisplayLanguage,
        mode: PracticeMode
    ) {
        repository.setSessionState(KEY_SESSION_VERSE_IDS, verseIds.joinToString(","))
        repository.setSessionState(KEY_SESSION_INDEX, index.toString())
        repository.setSessionState(KEY_SESSION_REVEALED, isRevealed.toString())
        repository.setSessionState(KEY_SESSION_TIME, System.currentTimeMillis().toString())
        repository.setSessionState(KEY_SESSION_LANG, lang.name)
        repository.setSessionState(KEY_SESSION_MODE, mode.name)
    }

    private suspend fun clearSessionState() {
        repository.setSessionState(KEY_SESSION_VERSE_IDS, null)
        repository.setSessionState(KEY_SESSION_INDEX, null)
        repository.setSessionState(KEY_SESSION_REVEALED, null)
        repository.setSessionState(KEY_SESSION_TIME, null)
        repository.setSessionState(KEY_SESSION_MODE, null)
    }
}
