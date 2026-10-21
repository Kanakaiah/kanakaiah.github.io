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
    val transcript: String = "",
    val error: String? = null,
    val isAvailable: Boolean = true
)

class SpeechRecognizerHelper(
    private val context: Context,
    private val onResultReceived: ((String) -> Unit)? = null
) {
    private var speechRecognizer: SpeechRecognizer? = null

    private val isAvail = try {
        SpeechRecognizer.isRecognitionAvailable(context)
    } catch (_: Throwable) {
        false
    }

    private val _state = MutableStateFlow(
        SpeechRecognizerState(isAvailable = isAvail)
    )
    val state: StateFlow<SpeechRecognizerState> = _state.asStateFlow()

    fun startListening(languageCode: String = "en-US") {
        val available = try {
            SpeechRecognizer.isRecognitionAvailable(context)
        } catch (_: Throwable) {
            false
        }

        if (!available) {
            _state.value = _state.value.copy(
                error = "Speech recognition is not available on this device",
                isAvailable = false,
                isListening = false
            )
            return
        }

        stopListening()

        // Ensure creation and execution on main looper
        Handler(Looper.getMainLooper()).post {
            try {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) {
                            _state.value = _state.value.copy(isListening = true, error = null)
                        }

                        override fun onBeginningOfSpeech() {
                            _state.value = _state.value.copy(isListening = true)
                        }

                        override fun onRmsChanged(rmsdB: Float) {}
                        override fun onBufferReceived(buffer: ByteArray?) {}

                        override fun onEndOfSpeech() {
                            _state.value = _state.value.copy(isListening = false)
                        }

                        override fun onError(error: Int) {
                            val msg = when (error) {
                                SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized"
                                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timed out"
                                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
                                SpeechRecognizer.ERROR_NETWORK -> "Network required for speech"
                                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timed out"
                                else -> "Speech recognition paused"
                            }
                            _state.value = _state.value.copy(isListening = false, error = msg)
                        }

                        override fun onResults(results: Bundle?) {
                            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            val text = matches?.firstOrNull().orEmpty()
                            _state.value = _state.value.copy(isListening = false, transcript = text, error = null)
                            onResultReceived?.invoke(text)
                        }

                        override fun onPartialResults(partialResults: Bundle?) {
                            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            val text = matches?.firstOrNull()
                            if (!text.isNullOrBlank()) {
                                _state.value = _state.value.copy(transcript = text)
                                onResultReceived?.invoke(text)
                            }
                        }

                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageCode)
                }

                speechRecognizer?.startListening(intent)
                _state.value = _state.value.copy(isListening = true, transcript = "", error = null)
            } catch (e: Throwable) {
                _state.value = _state.value.copy(isListening = false, error = e.localizedMessage ?: "Failed to start listening")
            }
        }
    }

    fun stopListening() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Throwable) {}
        speechRecognizer = null
        _state.value = _state.value.copy(isListening = false)
    }

    fun simulateTranscript(simulated: String) {
        _state.value = _state.value.copy(isListening = false, transcript = simulated)
        onResultReceived?.invoke(simulated)
    }

    fun destroy() {
        stopListening()
    }
}
