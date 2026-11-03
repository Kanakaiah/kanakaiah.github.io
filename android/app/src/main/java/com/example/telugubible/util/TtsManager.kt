package com.example.telugubible.util

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.Locale

data class TtsState(
    val isReady: Boolean = false,
    val isSpeaking: Boolean = false,
    val currentVerse: Int? = null,
    val initializationFailed: Boolean = false
)

interface ListenSpeechPlayer {
    val state: StateFlow<TtsState>
    fun speak(text: String, langCode: String = "en", rate: Float = 1f, onFailure: (() -> Unit)? = null, onDone: (() -> Unit)? = null): Boolean
    fun stop()
}

class TtsManager(context: Context) : TextToSpeech.OnInitListener, ListenSpeechPlayer {
    private val main = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private val _state = MutableStateFlow(TtsState())
    override val state: StateFlow<TtsState> = _state.asStateFlow()
    private var generation = 0L
    private var activeId: String? = null
    private var queuedVerses: List<Pair<Int, String>> = emptyList()
    private var currentIndex = 0
    private var completion: (() -> Unit)? = null
    private var failure: (() -> Unit)? = null

    override fun onInit(status: Int) {
        main.post {
            val engine = tts
            if (status != TextToSpeech.SUCCESS || engine == null) {
                _state.update { it.copy(isReady = false, initializationFailed = true) }
                return@post
            }
            val listenerResult = engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    main.post { if (utteranceId == activeId) _state.update { it.copy(isSpeaking = true) } }
                }
                override fun onDone(utteranceId: String?) {
                    main.post {
                        if (utteranceId == null || utteranceId != activeId) return@post
                        if (queuedVerses.isNotEmpty() && currentIndex + 1 < queuedVerses.size) {
                            currentIndex++
                            if (!speakCurrent()) finishFailure()
                        } else {
                            activeId = null
                            queuedVerses = emptyList()
                            _state.update { it.copy(isSpeaking = false, currentVerse = null) }
                            val callback = completion
                            completion = null; failure = null
                            callback?.invoke()
                        }
                    }
                }
                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) { handleError(utteranceId) }
                override fun onError(utteranceId: String?, errorCode: Int) { handleError(utteranceId) }
                override fun onStop(utteranceId: String?, interrupted: Boolean) { handleError(utteranceId) }
                private fun handleError(id: String?) {
                    main.post { if (id != null && id == activeId) finishFailure() }
                }
            })
            _state.update { it.copy(isReady = listenerResult == TextToSpeech.SUCCESS, initializationFailed = listenerResult != TextToSpeech.SUCCESS) }
        }
    }

    private fun configureLanguage(langCode: String): Boolean {
        val engine = tts ?: return false
        val locale = when (langCode.lowercase()) { "te" -> Locale("te", "IN"); "ta" -> Locale("ta", "IN"); else -> Locale.US }
        return try {
            val result = engine.setLanguage(locale)
            result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED
        } catch (_: Exception) { false }
    }

    fun playVerses(verses: List<Pair<Int, String>>, startIndex: Int = 0, langCode: String = "en"): Boolean {
        stop()
        if (!_state.value.isReady || verses.isEmpty() || !configureLanguage(langCode)) return false
        queuedVerses = verses
        currentIndex = startIndex.coerceIn(0, verses.size - 1)
        if (!speakCurrent()) { finishFailure(); return false }
        return true
    }

    fun setSpeechRate(rate: Float) { tts?.setSpeechRate(rate.coerceIn(0.5f, 2.0f)) }

    override fun speak(text: String, langCode: String, rate: Float, onFailure: (() -> Unit)?, onDone: (() -> Unit)?): Boolean {
        stop()
        if (!_state.value.isReady || text.isBlank() || !configureLanguage(langCode)) return false
        val engine = tts ?: return false
        try { engine.setSpeechRate(rate.coerceIn(0.5f, 2.0f)) } catch (_: Exception) { return false }
        completion = onDone; failure = onFailure
        val id = "single_${++generation}"
        activeId = id
        val result = try { engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) } catch (_: Exception) { TextToSpeech.ERROR }
        if (result != TextToSpeech.SUCCESS) {
            activeId = null; completion = null; failure = null
            return false
        }
        _state.update { it.copy(isSpeaking = true, currentVerse = null) }
        return true
    }

    private fun speakCurrent(): Boolean {
        val (verse, text) = queuedVerses.getOrNull(currentIndex) ?: return false
        val id = "verse_${++generation}_$currentIndex"
        activeId = id
        val result = try { tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) } catch (_: Exception) { TextToSpeech.ERROR }
        if (result != TextToSpeech.SUCCESS) return false
        _state.update { it.copy(isSpeaking = true, currentVerse = verse) }
        return true
    }

    private fun finishFailure() {
        activeId = null; queuedVerses = emptyList()
        _state.update { it.copy(isSpeaking = false, currentVerse = null) }
        val callback = failure
        completion = null; failure = null
        callback?.invoke()
    }

    override fun stop() {
        activeId = null; queuedVerses = emptyList(); completion = null; failure = null
        tts?.stop()
        _state.update { it.copy(isSpeaking = false, currentVerse = null) }
    }

    fun shutdown() { stop(); tts?.shutdown(); tts = null; _state.update { it.copy(isReady = false) } }
}
