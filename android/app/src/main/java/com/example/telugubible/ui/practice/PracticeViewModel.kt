package com.example.telugubible.ui.practice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.util.CueLevel
import com.example.telugubible.util.TtsManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class PracticeMode(val label: String) {
    READ("Read"),
    ERASER("Erase"),
    FIRST_LETTER("Letters"),
    SCRAMBLE("Order"),
    TYPING("Type"),
    SPEECH("Recite"),
    IMMERSED("Immerse");

    companion object {
        val FLASHCARD = READ
        val MENU_MODES = listOf(READ, ERASER, FIRST_LETTER, SCRAMBLE, TYPING, SPEECH)
    }
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
    val modeCommitted: String? = null,
    val hintRevealedRatio: Float? = null,
    val eraserHiddenRatio: Float? = null,
    val scrambleAccuracy: Float? = null,
    val isTtsSpeaking: Boolean = false,
    val bionicReading: Boolean = false,
    val recallMasking: Boolean = false,
    val serifTypography: Boolean = true
) {
    val currentVerse: UserMemoryVerse?
        get() = verses.getOrNull(currentIndex)

    val gradeCeiling: Int
        get() {
            if (activeMode == PracticeMode.ERASER) {
                val hidden = eraserHiddenRatio ?: return 5
                return when {
                    hidden >= 0.75f -> 5
                    hidden >= 0.50f -> 4
                    hidden >= 0.25f -> 3
                    else -> 1
                }
            }
            if (activeMode == PracticeMode.SCRAMBLE) {
                val acc = scrambleAccuracy ?: return 5
                return when {
                    acc >= 0.90f -> 5
                    acc >= 0.75f -> 4
                    acc >= 0.50f -> 3
                    else -> 1
                }
            }
            if (activeMode == PracticeMode.SPEECH) {
                val acc = modeAccuracy ?: return 5
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

class PracticeViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val ttsManager = TtsManager(application)

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
            val settings = repository.getAppSettings()
            val now = System.currentTimeMillis()

            val globalLang = if (settings.bibleVersion.equals("TELIRV", ignoreCase = true) || settings.bibleVersion.equals("IRV-TE", ignoreCase = true)) {
                DisplayLanguage.TELUGU
            } else {
                DisplayLanguage.ENGLISH
            }

            var restoredQueue: List<UserMemoryVerse>? = null
            var restoredIndex = 0
            var restoredRevealed = false
            var restoredLang = globalLang
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
                        modeCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null,
                        bionicReading = settings.bionicReading,
                        recallMasking = settings.recallMasking,
                        serifTypography = (settings.fontFamily == "serif")
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
                        modeCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null,
                        bionicReading = settings.bionicReading,
                        recallMasking = settings.recallMasking,
                        serifTypography = (settings.fontFamily == "serif")
                    )
                }
            }
        }
    }

    fun startCollectionReview(
        collectionId: String?,
        order: com.example.telugubible.ui.today.ReviewOrder = com.example.telugubible.ui.today.ReviewOrder.WEAKEST
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val allVerses = repository.getUserMemoryVerses()
            val topics = repository.getTopics()
            val generalTopicId = topics.find { it.name.equals("General", ignoreCase = true) }?.id
            val settings = repository.getAppSettings()
            val now = System.currentTimeMillis()
            val globalLang = if (settings.bibleVersion.equals("TELIRV", ignoreCase = true) || settings.bibleVersion.equals("IRV-TE", ignoreCase = true)) {
                DisplayLanguage.TELUGU
            } else {
                DisplayLanguage.ENGLISH
            }

            val scopedVerses = when {
                collectionId == null -> allVerses
                collectionId == com.example.telugubible.ui.today.DEFAULT_GENERAL_COLLECTION_ID || collectionId == generalTopicId -> {
                    allVerses.filter { it.topicIds.isEmpty() || (generalTopicId != null && it.topicIds.contains(generalTopicId)) }
                }
                else -> allVerses.filter { it.topicIds.contains(collectionId) }
            }

            val dueInScope = scopedVerses.filter { it.nextDueDate <= now }
            val baseQueue = if (dueInScope.isNotEmpty()) dueInScope else scopedVerses

            val sortedQueue = when (order) {
                com.example.telugubible.ui.today.ReviewOrder.WEAKEST -> {
                    baseQueue.sortedWith(
                        compareBy<UserMemoryVerse> { it.nextDueDate > now }
                            .thenBy { it.repetition }
                            .thenBy { it.interval }
                    )
                }
                com.example.telugubible.ui.today.ReviewOrder.DUE_DATE -> {
                    baseQueue.sortedBy { it.nextDueDate }
                }
                com.example.telugubible.ui.today.ReviewOrder.CANONICAL -> {
                    baseQueue.sortedWith(
                        compareBy<UserMemoryVerse> { it.bookId }
                            .thenBy { it.chapter }
                            .thenBy { it.verse }
                    )
                }
                com.example.telugubible.ui.today.ReviewOrder.RANDOM -> {
                    baseQueue.shuffled()
                }
            }

            val mode = _uiState.value.activeMode
            if (sortedQueue.isNotEmpty()) {
                saveSessionState(
                    verseIds = sortedQueue.map { it.id },
                    index = 0,
                    isRevealed = false,
                    lang = globalLang,
                    mode = mode
                )
            } else {
                clearSessionState()
            }

            _uiState.update {
                it.copy(
                    verses = sortedQueue,
                    currentIndex = 0,
                    isRevealed = false,
                    isFinished = sortedQueue.isEmpty(),
                    isLoading = false,
                    displayLanguage = globalLang,
                    modeAccuracy = null,
                    modeCommitted = null,
                    hintRevealedRatio = null,
                    eraserHiddenRatio = null,
                    scrambleAccuracy = null,
                    bionicReading = settings.bionicReading,
                    recallMasking = settings.recallMasking,
                    serifTypography = (settings.fontFamily == "serif")
                )
            }
        }
    }

    fun focusVerse(verseId: Long) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val allVerses = repository.getUserMemoryVerses()
            val targetIdx = allVerses.indexOfFirst { it.id == verseId }
            if (targetIdx >= 0) {
                _uiState.update {
                    it.copy(
                        verses = allVerses,
                        currentIndex = targetIdx,
                        isRevealed = false,
                        isFinished = false,
                        isLoading = false,
                        modeAccuracy = null,
                        modeCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null
                    )
                }
            } else {
                loadPracticeVerses()
            }
        }
    }

    fun setPracticeMode(mode: PracticeMode) {
        _uiState.update {
            it.copy(
                activeMode = mode,
                isRevealed = false,
                modeAccuracy = null,
                modeCommitted = null,
                hintRevealedRatio = null,
                eraserHiddenRatio = null,
                scrambleAccuracy = null
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

    fun recordFirstLetterAttempt(revealedRatio: Float) {
        _uiState.update {
            it.copy(
                hintRevealedRatio = revealedRatio,
                isRevealed = true
            )
        }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_REVEALED, "true")
        }
    }

    fun recordEraserAttempt(hiddenRatio: Float) {
        _uiState.update {
            it.copy(
                eraserHiddenRatio = hiddenRatio,
                isRevealed = true
            )
        }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_REVEALED, "true")
        }
    }

    fun recordScrambleAttempt(accuracy: Float) {
        _uiState.update {
            it.copy(
                scrambleAccuracy = accuracy,
                isRevealed = true
            )
        }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_REVEALED, "true")
        }
    }

    fun recordSpeechAttempt(accuracy: Int, committed: String) {
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
                modeCommitted = null,
                hintRevealedRatio = null,
                eraserHiddenRatio = null,
                scrambleAccuracy = null
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

        // Anti-cheating guard: cap submitted score to allowed ceiling
        val effectiveScore = score.coerceAtMost(state.gradeCeiling)

        viewModelScope.launch {
            val (cueLevel, modeName, accuracy) = when (state.activeMode) {
                PracticeMode.TYPING -> Triple(
                    CueLevel.FIRST_LETTERS.levelNumber,
                    "typing",
                    state.modeAccuracy?.let { it / 100.0 }
                )
                PracticeMode.READ -> Triple(
                    0,
                    "read",
                    null
                )
                PracticeMode.FIRST_LETTER -> {
                    val ratio = state.hintRevealedRatio ?: 0f
                    val cue = when {
                        ratio > 0.75f -> CueLevel.FULL.levelNumber
                        ratio > 0.25f -> CueLevel.FIRST_LETTERS.levelNumber
                        ratio > 0f -> CueLevel.SPARSE.levelNumber
                        else -> CueLevel.FIRST_LETTERS.levelNumber
                    }
                    val acc = (1.0 - ratio.toDouble()).coerceIn(0.0, 1.0)
                    Triple(cue, "first_letters", acc)
                }
                PracticeMode.ERASER -> {
                    val hidden = state.eraserHiddenRatio ?: 0.25f
                    val cue = when {
                        hidden >= 0.75f -> CueLevel.NONE.levelNumber
                        hidden >= 0.50f -> CueLevel.SPARSE.levelNumber
                        else -> CueLevel.FULL.levelNumber
                    }
                    Triple(cue, "eraser", hidden.toDouble())
                }
                PracticeMode.SCRAMBLE -> {
                    val acc = state.scrambleAccuracy ?: 1.0f
                    Triple(1, "scramble", acc.toDouble())
                }
                PracticeMode.SPEECH -> {
                    val acc = (state.modeAccuracy ?: 0) / 100.0
                    Triple(CueLevel.FIRST_LETTERS.levelNumber, "speech", acc)
                }
                PracticeMode.IMMERSED -> {
                    Triple(0, "immersed", null)
                }
            }

            repository.gradeUserVerse(
                id = verse.id,
                score = effectiveScore,
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
                        modeCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null
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
                        modeCommitted = null,
                        hintRevealedRatio = null,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null
                    )
                }
            }
        }
    }

    fun restart() {
        loadPracticeVerses(forceNewSession = true)
    }

    fun nextVerse() {
        val curr = _uiState.value.currentIndex
        val size = _uiState.value.verses.size
        if (curr < size - 1) {
            val nextIdx = curr + 1
            _uiState.update {
                it.copy(
                    currentIndex = nextIdx,
                    isRevealed = false,
                    modeAccuracy = null,
                    modeCommitted = null,
                    hintRevealedRatio = null,
                    eraserHiddenRatio = null,
                    scrambleAccuracy = null
                )
            }
            viewModelScope.launch {
                repository.setSessionState(KEY_SESSION_INDEX, nextIdx.toString())
                repository.setSessionState(KEY_SESSION_REVEALED, "false")
            }
            if (_uiState.value.isTtsSpeaking) {
                playCurrentVerseTts()
            } else {
                stopTts()
            }
        }
    }

    fun prevVerse() {
        val curr = _uiState.value.currentIndex
        if (curr > 0) {
            val prevIdx = curr - 1
            _uiState.update {
                it.copy(
                    currentIndex = prevIdx,
                    isRevealed = false,
                    modeAccuracy = null,
                    modeCommitted = null,
                    hintRevealedRatio = null,
                    eraserHiddenRatio = null,
                    scrambleAccuracy = null
                )
            }
            viewModelScope.launch {
                repository.setSessionState(KEY_SESSION_INDEX, prevIdx.toString())
                repository.setSessionState(KEY_SESSION_REVEALED, "false")
            }
            if (_uiState.value.isTtsSpeaking) {
                playCurrentVerseTts()
            } else {
                stopTts()
            }
        }
    }

    private var ttsJob: kotlinx.coroutines.Job? = null

    fun toggleTts() {
        if (_uiState.value.isTtsSpeaking) {
            stopTts()
        } else {
            _uiState.update { it.copy(isTtsSpeaking = true) }
            playCurrentVerseTts()
        }
    }

    private fun playCurrentVerseTts() {
        ttsJob?.cancel()
        val verse = _uiState.value.currentVerse
        if (verse == null || !_uiState.value.isTtsSpeaking) {
            stopTts()
            return
        }

        val isEnglish = _uiState.value.displayLanguage == DisplayLanguage.ENGLISH
        val rawText = (if (isEnglish) verse.textEn else verse.textTe)
            ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""
        val cleanText = rawText
            .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<[^>]+>"), "")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .trim()

        val ref = verse.fullRef(isEnglish)
        val textToSpeak = "$ref. $cleanText"
        val langCode = if (isEnglish) "en" else "te"

        ttsManager.speak(textToSpeak, langCode) {
            ttsJob = viewModelScope.launch {
                if (!_uiState.value.isTtsSpeaking) return@launch
                val nextIndex = _uiState.value.currentIndex + 1
                if (nextIndex < _uiState.value.verses.size) {
                    kotlinx.coroutines.delay(800)
                    if (!_uiState.value.isTtsSpeaking) return@launch
                    _uiState.update {
                        it.copy(
                            currentIndex = nextIndex,
                            isRevealed = false,
                            modeAccuracy = null,
                            modeCommitted = null,
                            hintRevealedRatio = null,
                            eraserHiddenRatio = null,
                            scrambleAccuracy = null
                        )
                    }
                    repository.setSessionState(KEY_SESSION_INDEX, nextIndex.toString())
                    repository.setSessionState(KEY_SESSION_REVEALED, "false")
                    playCurrentVerseTts()
                } else {
                    _uiState.update { it.copy(isTtsSpeaking = false) }
                }
            }
        }
    }

    fun stopTts() {
        ttsJob?.cancel()
        ttsJob = null
        ttsManager.stop()
        _uiState.update { it.copy(isTtsSpeaking = false) }
    }

    override fun onCleared() {
        super.onCleared()
        ttsManager.shutdown()
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
