package com.example.telugubible.util

import android.content.Context
import android.os.Bundle
import android.os.Looper
import android.speech.SpeechRecognizer
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadow.api.Shadow
import org.robolectric.shadows.ShadowSpeechRecognizer
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [35])
class SpeechRecognizerHelperTest {
    private fun bundle(value: String) = Bundle().apply { putStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION, arrayListOf(value)) }
    private fun idle() = shadowOf(Looper.getMainLooper()).idle()
    private fun latest(): ShadowSpeechRecognizer = Shadow.extract(ShadowSpeechRecognizer.getLatestSpeechRecognizer())

    @Test fun partialResultsAreNotSubmittedAndFinalResultIsSubmittedOnce() {
        val results = mutableListOf<String>()
        val helper = SpeechRecognizerHelper(ApplicationProvider.getApplicationContext<Context>(), { results.add(it) }, { true })
        helper.startListening(); idle()
        val recognizer = latest()
        recognizer.triggerOnPartialResults(bundle("In the")); idle()
        assertEquals("In the", helper.state.value.transcript)
        assertTrue(results.isEmpty())
        helper.stopListening()
        assertTrue(helper.state.value.isProcessing)
        recognizer.triggerOnResults(bundle("In the beginning")); idle()
        assertEquals(listOf("In the beginning"), results)
        assertFalse(helper.state.value.isProcessing)
        recognizer.triggerOnResults(bundle("duplicate")); idle()
        assertEquals(1, results.size)
        helper.destroy()
    }

    @Test fun emptyAndCancelledRecognitionNeverSubmit() {
        val results = mutableListOf<String>()
        val helper = SpeechRecognizerHelper(ApplicationProvider.getApplicationContext<Context>(), { results.add(it) }, { true })
        helper.startListening(); idle()
        val first = latest()
        first.triggerOnResults(bundle(" ")); idle()
        assertTrue(results.isEmpty())
        assertNotNull(helper.state.value.error)
        helper.startListening(); idle()
        val second = latest()
        helper.cancelListening()
        second.triggerOnResults(bundle("late result")); idle()
        assertTrue(results.isEmpty())
        assertFalse(helper.state.value.isListening)
        helper.destroy()
    }

    @Test fun unavailableRecognitionShowsErrorWithoutSubmitting() {
        var results = 0
        val helper = SpeechRecognizerHelper(ApplicationProvider.getApplicationContext<Context>(), { results++ }, { false })
        helper.startListening(); idle()
        assertFalse(helper.state.value.isAvailable)
        assertNotNull(helper.state.value.error)
        assertEquals(0, results)
    }

    @Test fun missingFinalResultTimesOutWithoutSubmitting() {
        var results = 0
        val helper = SpeechRecognizerHelper(ApplicationProvider.getApplicationContext<Context>(), { results++ }, { true })
        helper.startListening(); idle()
        latest().triggerOnEndOfSpeech(); idle()
        assertTrue(helper.state.value.isProcessing)
        shadowOf(Looper.getMainLooper()).idleFor(11, TimeUnit.SECONDS)
        assertFalse(helper.state.value.isProcessing)
        assertTrue(helper.state.value.error?.contains("timed out") == true)
        assertEquals(0, results)
        helper.destroy()
    }
}
