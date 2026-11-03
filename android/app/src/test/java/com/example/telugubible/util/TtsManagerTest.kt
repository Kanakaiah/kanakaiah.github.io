package com.example.telugubible.util

import android.app.Application
import android.os.Looper
import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import org.robolectric.shadows.ShadowTextToSpeech
import org.robolectric.shadow.api.Shadow
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [35], shadows = [ManualSpeechShadow::class])
class TtsManagerTest {
    private lateinit var manager: TtsManager
    private lateinit var shadow: ManualSpeechShadow
    @Before fun setUp() {
        ShadowTextToSpeech.reset()
        ShadowTextToSpeech.addLanguageAvailability(Locale.US)
        manager = TtsManager(ApplicationProvider.getApplicationContext<Application>())
        manager.onInit(TextToSpeech.SUCCESS)
        shadowOf(Looper.getMainLooper()).idle()
        shadow = Shadow.extract(ShadowTextToSpeech.getLastTextToSpeechInstance())
        assertTrue(manager.state.value.isReady)
    }
    @After fun tearDown() { manager.shutdown() }
    private fun id(): String = TtsManager::class.java.getDeclaredField("activeId").let { it.isAccessible = true; it.get(manager) as String }
    private fun idle() = shadowOf(Looper.getMainLooper()).idle()

    @Test fun stoppedAndSupersededUtterancesCannotCompleteNewPlayback() {
        var old = 0
        var current = 0
        assertTrue(manager.speak("first", onDone = { old++ }))
        val first = id()
        assertTrue(manager.speak("second", onDone = { current++ }))
        val second = id()
        shadow.utteranceProgressListener.onDone(first); idle()
        assertTrue(manager.state.value.isSpeaking)
        assertEquals(0, old); assertEquals(0, current)
        shadow.utteranceProgressListener.onDone(second); idle()
        assertFalse(manager.state.value.isSpeaking)
        assertEquals(1, current)
        assertTrue(manager.speak("third", onDone = { current++ }))
        val third = id()
        manager.stop()
        shadow.utteranceProgressListener.onDone(third); idle()
        assertEquals(1, current)
    }

    @Test fun errorsAndUnavailableLanguageDoNotCallCompletion() {
        var completed = 0
        var failed = 0
        assertFalse(manager.speak("test", langCode = "te", onFailure = { failed++ }, onDone = { completed++ }))
        assertEquals(0, completed)
        assertFalse(manager.state.value.isSpeaking)
        assertTrue(manager.speak("test", onFailure = { failed++ }, onDone = { completed++ }))
        val active = id()
        shadow.utteranceProgressListener.onError(active); idle()
        assertEquals(1, failed); assertEquals(0, completed)
        assertFalse(manager.state.value.isSpeaking)
        assertTrue(manager.speak("interrupted", onFailure = { failed++ }, onDone = { completed++ }))
        shadow.utteranceProgressListener.onStop(id(), true); idle()
        assertEquals(2, failed); assertEquals(0, completed)
        assertFalse(manager.state.value.isSpeaking)
    }

    @Test fun readerQueueStillAdvancesAfterSingleUtterance() {
        assertTrue(manager.speak("single"))
        shadow.utteranceProgressListener.onDone(id()); idle()
        assertTrue(manager.playVerses(listOf(1 to "verse one", 2 to "verse two")))
        assertEquals(1, manager.state.value.currentVerse)
        shadow.utteranceProgressListener.onDone(id()); idle()
        assertEquals(2, manager.state.value.currentVerse)
        assertEquals("verse two", shadow.spoken)
        shadow.utteranceProgressListener.onDone(id()); idle()
        assertFalse(manager.state.value.isSpeaking)
    }
}

@Implements(TextToSpeech::class)
class ManualSpeechShadow : ShadowTextToSpeech() {
    var spoken: String? = null
    @Implementation
    public override fun speak(text: CharSequence, queueMode: Int, params: Bundle?, utteranceId: String?): Int {
        spoken = text.toString()
        return TextToSpeech.SUCCESS
    }
}
