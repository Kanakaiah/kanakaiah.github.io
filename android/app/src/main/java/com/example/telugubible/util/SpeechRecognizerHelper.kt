package com.example.telugubible.util

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SpeechRecognizerState(
    val isListening: Boolean = false,
    val isProcessing: Boolean = false,
    val transcript: String = "",
    val error: String? = null,
    val isAvailable: Boolean = true
)

class SpeechRecognizerHelper(
    private val context: Context,
    private val onResultReceived: ((String) -> Unit)? = null,
    private val recognitionAvailable: () -> Boolean = { SpeechRecognizer.isRecognitionAvailable(context) }
) {
    private var recognizer: SpeechRecognizer? = null
    private var generation = 0
    private val handler = Handler(Looper.getMainLooper())
    private val _state = MutableStateFlow(SpeechRecognizerState(isAvailable = available()))
    val state: StateFlow<SpeechRecognizerState> = _state.asStateFlow()

    private fun available(): Boolean = try { recognitionAvailable() } catch (_: Exception) { false }
    private fun release() {
        val current = recognizer
        recognizer = null
        try { current?.destroy() } catch (_: Exception) { }
    }
    private fun awaitFinalResult(request: Int) {
        _state.value = _state.value.copy(isListening = false, isProcessing = true)
        handler.postDelayed({
            if (request == generation && _state.value.isProcessing) {
                generation++
                release()
                _state.value = _state.value.copy(isProcessing = false, error = "Speech recognition timed out. Try again.")
            }
        }, 10_000L)
    }

    fun startListening(languageCode: String = "en-US") {
        cancelListening()
        if (!available()) {
            _state.value = SpeechRecognizerState(isAvailable = false, error = "Speech recognition is unavailable on this device.")
            return
        }
        val request = ++generation
        _state.value = SpeechRecognizerState(isListening = true, isAvailable = true)
        handler.post {
            if (request != generation) return@post
            try {
                val engine = SpeechRecognizer.createSpeechRecognizer(context)
                recognizer = engine
                engine.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) { if (request == generation && !_state.value.isProcessing) _state.value = _state.value.copy(isListening = true, error = null) }
                    override fun onBeginningOfSpeech() { if (request == generation && !_state.value.isProcessing) _state.value = _state.value.copy(isListening = true) }
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() { if (request == generation) awaitFinalResult(request) }
                    override fun onError(error: Int) {
                        if (request != generation) return
                        val message = when (error) {
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized. Try again."
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech was heard. Try again."
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission is required."
                            SpeechRecognizer.ERROR_NETWORK -> "Speech recognition requires a network connection."
                            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "The speech service timed out. Try again."
                            else -> "Speech recognition stopped. Try again."
                        }
                        generation++
                        release()
                        _state.value = _state.value.copy(isListening = false, isProcessing = false, error = message)
                    }
                    override fun onResults(results: Bundle?) {
                        if (request != generation) return
                        val result = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty().trim()
                        generation++
                        release()
                        if (result.isEmpty()) {
                            _state.value = _state.value.copy(isListening = false, isProcessing = false, error = "No speech recognized. Try again.")
                        } else {
                            _state.value = _state.value.copy(isListening = false, isProcessing = false, transcript = result, error = null)
                            onResultReceived?.invoke(result)
                        }
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        if (request != generation) return
                        val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                        if (!partial.isNullOrBlank()) _state.value = _state.value.copy(transcript = partial)
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageCode)
                }
                engine.startListening(intent)
            } catch (_: Exception) {
                if (request == generation) {
                    release()
                    _state.value = _state.value.copy(isListening = false, isProcessing = false, error = "Could not start speech recognition. Try again.")
                }
            }
        }
    }

    fun stopListening() {
        if (!_state.value.isListening) return
        if (recognizer == null) {
            cancelListening()
            _state.value = _state.value.copy(error = "No speech was heard. Try again.")
            return
        }
        try {
            recognizer?.stopListening()
            awaitFinalResult(generation)
        } catch (_: Exception) {
            cancelListening()
            _state.value = _state.value.copy(error = "Could not finish speech recognition. Try again.")
        }
    }

    fun cancelListening() {
        generation++
        try { recognizer?.cancel() } catch (_: Exception) { }
        release()
        _state.value = _state.value.copy(isListening = false, isProcessing = false)
    }

    fun simulateTranscript(simulated: String) {
        val result = simulated.trim()
        if (result.isBlank()) return
        cancelListening()
        _state.value = _state.value.copy(transcript = result, error = null)
        onResultReceived?.invoke(result)
    }

    fun destroy() = cancelListening()
}
