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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import org.json.JSONArray

enum class PracticeMode(val label: String) {
    FIRST_LETTER("First letters"),
    ERASER("Blanks"),
    SCRAMBLE("Puzzle"),
    TYPING("Type"),
    SPEECH("Recite"),
    LISTEN("Listen"),
    READ("Recall"),
    IMMERSED("Immerse");

    companion object {
        val FLASHCARD = READ
        val MENU_MODES = listOf(READ, FIRST_LETTER, ERASER, SCRAMBLE, TYPING, SPEECH, LISTEN, IMMERSED)
    }
}

data class FirstLetterExposure(val seen: List<Int>, val total: Int)

internal fun immersiveExposureKey(verse: UserMemoryVerse?, language: DisplayLanguage): String? {
    verse ?: return null
    val actualLanguage = when (language) {
        DisplayLanguage.ENGLISH -> if (verse.textEn.isNullOrBlank()) DisplayLanguage.TELUGU else language
        DisplayLanguage.TELUGU -> if (verse.textTe.isNullOrBlank()) DisplayLanguage.ENGLISH else language
    }
    return "${verse.id}:${actualLanguage.name}"
}

internal fun exposureGradeCeiling(exposure: FirstLetterExposure?): Int {
    if (exposure == null || exposure.total <= 0) return 5
    val ratio = exposure.seen.size.toFloat() / exposure.total
    return when { ratio <= 0.05f -> 5; ratio <= 0.25f -> 4; ratio <= 0.75f -> 3; else -> 1 }
}

internal fun combineExposure(first: FirstLetterExposure?, second: FirstLetterExposure?): FirstLetterExposure? {
    if (first == null) return second
    if (second == null) return first
    if (first.total != second.total) return null
    return FirstLetterExposure((first.seen + second.seen).distinct().sorted(), first.total)
}

internal fun firstLetterExposureFor(verse: UserMemoryVerse?, language: DisplayLanguage, exposures: Map<String, FirstLetterExposure>): FirstLetterExposure? {
    verse ?: return null
    val actualKey = immersiveExposureKey(verse, language)
    return DisplayLanguage.entries.filter { immersiveExposureKey(verse, it) == actualKey }
        .mapNotNull { exposures["${verse.id}:${it.name}"] }
        .reduceOrNull { left, right ->
            combineExposure(left, right) ?: if (exposureGradeCeiling(left) <= exposureGradeCeiling(right)) left else right
        }
}

internal fun combinedExposureCeiling(first: FirstLetterExposure?, second: FirstLetterExposure?): Int =
    if (first != null && second != null && first.total != second.total)
        minOf(exposureGradeCeiling(first), exposureGradeCeiling(second))
    else exposureGradeCeiling(combineExposure(first, second))

internal fun exposureCueLevel(exposure: FirstLetterExposure?): Int {
    if (exposure == null || exposure.total <= 0) return 0
    val ratio = exposure.seen.size.toFloat() / exposure.total
    return when {
        ratio > 0.75f -> CueLevel.FULL.levelNumber
        ratio > 0.25f -> CueLevel.FIRST_LETTERS.levelNumber
        ratio > 0f -> CueLevel.SPARSE.levelNumber
        else -> CueLevel.NONE.levelNumber
    }
}

data class PracticeUiState(
    val verses: List<UserMemoryVerse> = emptyList(),
    val currentIndex: Int = 0,
    val isRevealed: Boolean = false,
    val isFinished: Boolean = false,
    val isLoading: Boolean = true,
    val isGrading: Boolean = false,
    val gradingError: String? = null,
    val displayLanguage: DisplayLanguage = DisplayLanguage.ENGLISH,
    val activeMode: PracticeMode = PracticeMode.READ,
    val currentCollectionTitle: String = "All",
    val modeAccuracy: Int? = null,
    val modeCommitted: String? = null,
    val hintRevealedRatio: Float? = null,
    val firstLetterSeenByVerse: Map<String, FirstLetterExposure> = emptyMap(),
    val immersiveSeenByVerse: Map<String, FirstLetterExposure> = emptyMap(),
    val eraserHiddenRatio: Float? = null,
    val scrambleAccuracy: Float? = null,
    val isTtsSpeaking: Boolean = false,
    val audioSpeed: Float = 1.0f,
    val audioRepeatCount: Int = 3,
    val hideTextInAudio: Boolean = false,
    val autoAdvanceAudio: Boolean = true,
    val bionicReading: Boolean = false,
    val recallMasking: Boolean = false,
    val serifTypography: Boolean = true,
    val isImmersed: Boolean = false,
    val readingSettings: com.example.telugubible.data.model.AppSettings = com.example.telugubible.data.model.AppSettings()
) {
    val currentVerse: UserMemoryVerse?
        get() = verses.getOrNull(currentIndex)

    val gradeCeiling: Int get() = minOf(modeGradeCeiling,
        combinedExposureCeiling(firstLetterExposureFor(currentVerse, displayLanguage, firstLetterSeenByVerse),
            immersiveSeenByVerse[immersiveExposureKey(currentVerse, displayLanguage)]))

    private val modeGradeCeiling: Int
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
            if (activeMode == PracticeMode.LISTEN) {
                return 5
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

    fun getTtsManager(): TtsManager = ttsManager

    companion object {
        const val KEY_SESSION_VERSE_IDS = "practice_session_verse_ids"
        const val KEY_SESSION_INDEX = "practice_session_current_index"
        const val KEY_SESSION_REVEALED = "practice_session_is_revealed"
        const val KEY_SESSION_TIME = "practice_session_timestamp"
        const val KEY_SESSION_LANG = "practice_session_display_lang"
        const val KEY_SESSION_MODE = "practice_session_active_mode"
        const val KEY_FIRST_LETTER_EXPOSURE = "practice_session_first_letter_exposure"
        const val KEY_IMMERSIVE_EXPOSURE = "practice_session_immersive_exposure"
        private const val SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000L // 12 hours
    }

    private val _uiState = MutableStateFlow(PracticeUiState())
    private val exposureMutex = Mutex()
    val uiState: StateFlow<PracticeUiState> = _uiState.asStateFlow()

    init {
        loadPracticeVerses()
    }

    fun loadPracticeVerses(forceNewSession: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { if (forceNewSession) it.copy(isLoading = true, firstLetterSeenByVerse = emptyMap(), immersiveSeenByVerse = emptyMap(), gradingError = null) else it.copy(isLoading = true, gradingError = null) }
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
                            if (restoredMode == PracticeMode.IMMERSED) restoredMode = PracticeMode.READ
                        }
                        val savedLang = repository.getSessionState(KEY_SESSION_LANG)
                        if (savedLang != null) {
                            restoredLang = try { DisplayLanguage.valueOf(savedLang) } catch (_: Exception) { restoredLang }
                        }
                    }
                }
            }

            if (restoredQueue != null) {
                val exposures = decodeFirstLetterExposure(repository.getSessionState(KEY_FIRST_LETTER_EXPOSURE))
                val immersiveExposures = decodeFirstLetterExposure(repository.getSessionState(KEY_IMMERSIVE_EXPOSURE))
                val exposure = exposures["${restoredQueue[restoredIndex].id}:${restoredLang.name}"]
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
                        hintRevealedRatio = if (restoredRevealed && restoredMode == PracticeMode.FIRST_LETTER && exposure != null && exposure.total > 0) exposure.seen.size.toFloat() / exposure.total else null,
                        firstLetterSeenByVerse = exposures,
                        immersiveSeenByVerse = immersiveExposures,
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null,
                        readingSettings = settings,
                        bionicReading = settings.bionicReading,
                        recallMasking = settings.recallMasking,
                        serifTypography = (settings.fontFamily == "serif")
                    )
                }
            } else {
                _uiState.update { it.copy(firstLetterSeenByVerse = emptyMap(), immersiveSeenByVerse = emptyMap()) }
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
                        firstLetterSeenByVerse = emptyMap(),
                        immersiveSeenByVerse = emptyMap(),
                        eraserHiddenRatio = null,
                        scrambleAccuracy = null,
                        readingSettings = settings,
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
            _uiState.update { it.copy(isLoading = true, firstLetterSeenByVerse = emptyMap(), immersiveSeenByVerse = emptyMap(), gradingError = null) }
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

            val collectionTitle = when {
                collectionId == null -> "All"
                collectionId == com.example.telugubible.ui.today.DEFAULT_GENERAL_COLLECTION_ID || collectionId == generalTopicId -> "General"
                else -> {
                    val topic = topics.find { it.id == collectionId }
                    if (topic != null) {
                        if (topic.name.equals("well_known", ignoreCase = true) || topic.name.equals("75 well-known", ignoreCase = true)) "Well-Known" else topic.name
                    } else "Collection"
                }
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
                    currentCollectionTitle = collectionTitle,
                    modeAccuracy = null,
                    modeCommitted = null,
                    hintRevealedRatio = null,
                    firstLetterSeenByVerse = emptyMap(),
                    immersiveSeenByVerse = emptyMap(),
                    eraserHiddenRatio = null,
                    scrambleAccuracy = null,
                    readingSettings = settings,
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
                val verse = allVerses[targetIdx]
                val topics = repository.getTopics()
                val topicId = verse.topicIds.firstOrNull()
                val topic = if (topicId != null) topics.find { it.id == topicId } else null
                val collectionTitle = when {
                    topic != null -> if (topic.name.equals("well_known", ignoreCase = true) || topic.name.equals("75 well-known", ignoreCase = true)) "Well-Known" else topic.name
                    else -> "General"
                }

                _uiState.update {
                    it.copy(
                        verses = allVerses,
                        currentIndex = targetIdx,
                        isRevealed = false,
                        isFinished = false,
                        isLoading = false,
                        currentCollectionTitle = collectionTitle,
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

    fun setAudioSpeed(speed: Float) {
        _uiState.update { it.copy(audioSpeed = speed) }
        ttsManager.setSpeechRate(speed)
    }

    fun setAudioRepeatCount(count: Int) {
        _uiState.update { it.copy(audioRepeatCount = count) }
    }

    fun setHideTextInAudio(hide: Boolean) {
        _uiState.update { it.copy(hideTextInAudio = hide) }
    }

    fun setAutoAdvanceAudio(autoAdvance: Boolean) {
        _uiState.update { it.copy(autoAdvanceAudio = autoAdvance) }
    }

    fun getRetentionStage(verse: UserMemoryVerse?): String {
        if (!verse?.keyword.isNullOrBlank()) return verse!!.keyword!!
        if (verse == null) return "Learning"
        return when {
            verse.interval >= 30 || verse.repetition >= 6 -> "Forever"
            verse.repetition >= 2 || verse.interval >= 6 -> "Review"
            else -> "Learning"
        }
    }

    fun setPracticeMode(mode: PracticeMode) {
        if (mode == PracticeMode.IMMERSED) {
            _uiState.update { it.copy(isImmersed = true) }
            return
        }
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

    fun exitImmersed() {
        stopTts()
        _uiState.update { it.copy(isImmersed = false) }
    }

    fun recordImmersiveExposure(verseId: Long, language: DisplayLanguage, indices: Set<Int>, total: Int) {
        if (total <= 0) return
        _uiState.update {
            if (!it.isImmersed || it.isRevealed || it.currentVerse?.id != verseId || it.displayLanguage != language) return@update it
            val key = immersiveExposureKey(it.currentVerse, language) ?: return@update it
            val old = it.immersiveSeenByVerse[key]
            val merged = ((old?.seen ?: emptyList()) + indices.filter { index -> index in 0 until total }).distinct().sorted()
            it.copy(immersiveSeenByVerse = it.immersiveSeenByVerse + (key to FirstLetterExposure(merged, total)))
        }
        viewModelScope.launch {
            exposureMutex.withLock {
                val json = JSONObject()
                _uiState.value.immersiveSeenByVerse.forEach { (entryKey, exposure) ->
                    json.put(entryKey, JSONObject().put("total", exposure.total).put("seen", JSONArray(exposure.seen)))
                }
                repository.setSessionState(KEY_IMMERSIVE_EXPOSURE, json.toString())
            }
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
            val key = "${it.currentVerse?.id}:${it.displayLanguage.name}"
            val exposure = it.firstLetterSeenByVerse[key]
            val seenRatio = if (exposure != null && exposure.total > 0) exposure.seen.size.toFloat() / exposure.total else 0f
            it.copy(
                hintRevealedRatio = maxOf(revealedRatio, seenRatio),
                isRevealed = true
            )
        }
        viewModelScope.launch { exposureMutex.withLock { repository.setSessionState(KEY_SESSION_REVEALED, "true") } }
    }

    fun recordFirstLetterSeen(key: String, indices: Set<Int>, total: Int) {
        _uiState.update { it.copy(firstLetterSeenByVerse = it.firstLetterSeenByVerse + (key to FirstLetterExposure(indices.sorted(), total))) }
        viewModelScope.launch {
            exposureMutex.withLock {
                val json = JSONObject()
                _uiState.value.firstLetterSeenByVerse.forEach { (entryKey, exposure) ->
                    json.put(entryKey, JSONObject().put("total", exposure.total).put("seen", JSONArray(exposure.seen)))
                }
                repository.setSessionState(KEY_FIRST_LETTER_EXPOSURE, json.toString())
            }
        }
    }

    private fun decodeFirstLetterExposure(raw: String?): Map<String, FirstLetterExposure> {
        if (raw.isNullOrBlank()) return emptyMap()
        return try {
            val json = JSONObject(raw)
            buildMap {
                val keys = json.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    val item = json.getJSONObject(key)
                    val total = item.getInt("total").coerceAtLeast(0)
                    val seen = item.getJSONArray("seen")
                    put(key, FirstLetterExposure((0 until seen.length()).map { seen.getInt(it) }.filter { it in 0 until total }.distinct(), total))
                }
            }
        } catch (_: Exception) { emptyMap() }
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
        if (state.isGrading || state.isFinished || state.gradingError != null) return
        val verse = state.currentVerse ?: return

        // Anti-cheating guard: cap submitted score to allowed ceiling
        val effectiveScore = score.coerceAtMost(state.gradeCeiling)

        _uiState.update { it.copy(isGrading = true) }
        viewModelScope.launch {
            try {
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
                PracticeMode.LISTEN -> {
                    Triple(0, "listen", 1.0)
                }
                PracticeMode.IMMERSED -> {
                    Triple(0, "immersed", null)
                }
            }

            val nextIndex = state.currentIndex + 1
            val sessionUpdates = if (nextIndex >= state.verses.size) mapOf(
                KEY_SESSION_VERSE_IDS to null, KEY_SESSION_INDEX to null, KEY_SESSION_REVEALED to null,
                KEY_SESSION_TIME to null, KEY_SESSION_MODE to null, KEY_FIRST_LETTER_EXPOSURE to null, KEY_IMMERSIVE_EXPOSURE to null
            ) else mapOf(KEY_SESSION_INDEX to nextIndex.toString(), KEY_SESSION_REVEALED to "false")
            exposureMutex.withLock {
                val first = firstLetterExposureFor(verse, state.displayLanguage, state.firstLetterSeenByVerse)
                val immersive = state.immersiveSeenByVerse[immersiveExposureKey(verse, state.displayLanguage)]
                val viewed = combineExposure(first, immersive)
                val combinedCue = if (viewed != null) exposureCueLevel(viewed) else maxOf(exposureCueLevel(first), exposureCueLevel(immersive))
                repository.gradeUserVerseAndUpdateSession(verse.id, effectiveScore, maxOf(cueLevel, combinedCue), modeName, accuracy, sessionUpdates)
            }
            if (nextIndex >= state.verses.size) {
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
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update { it.copy(gradingError = "Could not confirm the review was saved. Leave and reopen practice to check your progress.") }
            } finally {
                _uiState.update { it.copy(isGrading = false) }
            }
        }
    }

    fun restart() {
        loadPracticeVerses(forceNewSession = true)
    }

    fun seekListeningVerse(index: Int) {
        if (index !in _uiState.value.verses.indices || index == _uiState.value.currentIndex) return
        _uiState.update { it.copy(currentIndex = index, isRevealed = false, modeAccuracy = null,
            modeCommitted = null, hintRevealedRatio = null, eraserHiddenRatio = null, scrambleAccuracy = null) }
        viewModelScope.launch {
            repository.setSessionState(KEY_SESSION_INDEX, index.toString())
            repository.setSessionState(KEY_SESSION_REVEALED, "false")
        }
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

        val started = ttsManager.speak(textToSpeak, langCode, onFailure = { stopTts() }) {
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
        if (!started) stopTts()
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
        exposureMutex.withLock { repository.setSessionState(KEY_FIRST_LETTER_EXPOSURE, null); repository.setSessionState(KEY_IMMERSIVE_EXPOSURE, null) }
        repository.setSessionState(KEY_SESSION_VERSE_IDS, verseIds.joinToString(","))
        repository.setSessionState(KEY_SESSION_INDEX, index.toString())
        repository.setSessionState(KEY_SESSION_REVEALED, isRevealed.toString())
        repository.setSessionState(KEY_SESSION_TIME, System.currentTimeMillis().toString())
        repository.setSessionState(KEY_SESSION_LANG, lang.name)
        repository.setSessionState(KEY_SESSION_MODE, mode.name)
    }

    private suspend fun clearSessionState() {
        exposureMutex.withLock { repository.setSessionState(KEY_FIRST_LETTER_EXPOSURE, null); repository.setSessionState(KEY_IMMERSIVE_EXPOSURE, null) }
        repository.setSessionState(KEY_SESSION_VERSE_IDS, null)
        repository.setSessionState(KEY_SESSION_INDEX, null)
        repository.setSessionState(KEY_SESSION_REVEALED, null)
        repository.setSessionState(KEY_SESSION_TIME, null)
        repository.setSessionState(KEY_SESSION_MODE, null)
    }
}
