package com.example.telugubible.util

import android.content.Context
import android.content.Intent
import android.os.Bundle
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

    private val _state = MutableStateFlow(
        SpeechRecognizerState(isAvailable = SpeechRecognizer.isRecognitionAvailable(context))
    )
    val state: StateFlow<SpeechRecognizerState> = _state.asStateFlow()

    fun startListening(languageCode: String = "en-US") {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _state.value = _state.value.copy(
                error = "Speech recognition not available on this device",
                isAvailable = false
            )
            return
        }

        stopListening()

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
                        val message = when (error) {
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                            SpeechRecognizer.ERROR_CLIENT -> "Client error"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
                            SpeechRecognizer.ERROR_NETWORK -> "Network error"
                            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized. Try again."
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                            SpeechRecognizer.ERROR_SERVER -> "Server error"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected"
                            else -> "Recognition error ($error)"
                        }
                        _state.value = _state.value.copy(isListening = false, error = message)
                    }

                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val text = matches?.firstOrNull() ?: ""
                        _state.value = _state.value.copy(isListening = false, transcript = text)
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
        } catch (e: Exception) {
            _state.value = _state.value.copy(isListening = false, error = e.localizedMessage ?: "Failed to start listening")
        }
    }

    fun stopListening() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) {}
        speechRecognizer = null
        _state.value = _state.value.copy(isListening = false)
    }

    /**
     * For manual input / testing without speech hardware
     */
    fun simulateTranscript(simulated: String) {
        _state.value = _state.value.copy(isListening = false, transcript = simulated)
        onResultReceived?.invoke(simulated)
    }

    fun destroy() {
        stopListening()
    }
}
