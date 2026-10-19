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

    fun playVerses(verses: List<Pair<Int, String>>, startIndex: Int = 0) {
        if (!_state.value.isReady || verses.isEmpty()) return
        stop()
        queuedVerses = verses
        currentIndex = startIndex.coerceIn(0, verses.size - 1)
        speakCurrent()
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
