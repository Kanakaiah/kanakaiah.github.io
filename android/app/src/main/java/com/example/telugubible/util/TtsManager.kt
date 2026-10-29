package com.example.telugubible.util

import android.content.Context
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
    val currentVerse: Int? = null
)

class TtsManager(context: Context) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)

    private val _state = MutableStateFlow(TtsState())
    val state: StateFlow<TtsState> = _state.asStateFlow()

    private var queuedVerses: List<Pair<Int, String>> = emptyList()
    private var currentIndex: Int = 0

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    val verse = utteranceId?.toIntOrNull()
                    _state.update { it.copy(isSpeaking = true, currentVerse = verse) }
                }

                override fun onDone(utteranceId: String?) {
                    currentIndex++
                    if (currentIndex < queuedVerses.size) {
                        speakCurrent()
                    } else {
                        _state.update { it.copy(isSpeaking = false, currentVerse = null) }
                    }
                }

                override fun onError(utteranceId: String?) {
                    _state.update { it.copy(isSpeaking = false, currentVerse = null) }
                }
            })
            _state.update { it.copy(isReady = true) }
        }
    }

    fun playVerses(verses: List<Pair<Int, String>>, startIndex: Int = 0, langCode: String = "en") {
        if (!_state.value.isReady || verses.isEmpty()) return
        stop()
        val locale = when (langCode.lowercase()) {
            "te" -> Locale("te", "IN")
            "ta" -> Locale("ta", "IN")
            else -> Locale.US
        }
        tts?.language = locale
        queuedVerses = verses
        currentIndex = startIndex.coerceIn(0, verses.size - 1)
        speakCurrent()
    }

    fun setSpeechRate(rate: Float) {
        tts?.setSpeechRate(rate.coerceIn(0.5f, 2.0f))
    }

    fun speak(text: String, langCode: String = "en", rate: Float = 1.0f, onDone: (() -> Unit)? = null) {
        if (!_state.value.isReady || text.isBlank()) {
            onDone?.invoke()
            return
        }
        stop()
        val locale = if (langCode.equals("te", ignoreCase = true)) Locale("te", "IN") else Locale.US
        tts?.language = locale
        tts?.setSpeechRate(rate.coerceIn(0.5f, 2.0f))
        val utteranceId = "single_utterance_${System.currentTimeMillis()}"
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {
                _state.update { it.copy(isSpeaking = true) }
            }

            override fun onDone(id: String?) {
                _state.update { it.copy(isSpeaking = false) }
                onDone?.invoke()
            }

            override fun onError(id: String?) {
                _state.update { it.copy(isSpeaking = false) }
                onDone?.invoke()
            }
        })
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }

    private fun speakCurrent() {
        if (currentIndex in queuedVerses.indices) {
            val (verseNum, text) = queuedVerses[currentIndex]
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, verseNum.toString())
        }
    }

    fun stop() {
        tts?.stop()
        _state.update { it.copy(isSpeaking = false, currentVerse = null) }
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
    }
}
