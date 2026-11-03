package com.example.telugubible.ui.practice

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.util.ListenSpeechPlayer
import com.example.telugubible.util.TtsState
import kotlinx.coroutines.flow.MutableStateFlow
import androidx.lifecycle.Lifecycle
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class ListenDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private class FakePlayer : ListenSpeechPlayer {
        override val state = MutableStateFlow(TtsState(isReady = true))
        var starts = 0
        var stops = 0
        var accepts = true
        var done: (() -> Unit)? = null
        var failed: (() -> Unit)? = null
        override fun speak(text: String, langCode: String, rate: Float, onFailure: (() -> Unit)?, onDone: (() -> Unit)?): Boolean {
            if (!accepts) return false
            starts++; done = onDone; failed = onFailure
            state.value = state.value.copy(isSpeaking = true)
            return true
        }
        override fun stop() { stops++; done = null; failed = null; state.value = state.value.copy(isSpeaking = false) }
        fun complete() { val callback = done; done = null; state.value = state.value.copy(isSpeaking = false); callback?.invoke() }
        fun fail() { val callback = failed; failed = null; state.value = state.value.copy(isSpeaking = false); callback?.invoke() }
    }

    @Test fun repeatAndAdvanceOnlyOnSuccessfulCompletion() {
        val fake = FakePlayer()
        val current = mutableIntStateOf(0)
        var next = 0
        val palette = mutableStateOf("white")
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    ListenMode("Verse ${current.intValue}", true, 1f, 2, false, true, {}, {}, {}, {}, {}, { next++; current.intValue++ }, {}, fake,
                        Modifier.width(320.dp).height(650.dp), itemKey = current.intValue, canGoNext = current.intValue == 0)
                }
            }
        }
        compose.onNodeWithContentDescription("Play verse").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, fake.starts); fake.complete() }
        compose.runOnIdle { assertEquals(2, fake.starts); assertEquals(0, next); fake.complete() }
        compose.runOnIdle { assertEquals(1, next); assertEquals(3, fake.starts) }
        compose.onNodeWithContentDescription("Stop playback").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, next); assertNull(fake.done) }
        for (theme in listOf("black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Listening options").performScrollTo().performClick()
            compose.onNodeWithText("Hide text").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Hide listening options").performScrollTo().performClick()
        }
    }

    @Test fun unavailableVoiceAndErrorsNeverAdvance() {
        val fake = FakePlayer()
        var next = 0
        compose.setContent { RemoraTheme("white") {
            ListenMode("In the beginning", true, 1f, 1, false, true, {}, {}, {}, {}, {}, { next++ }, {}, fake)
        } }
        compose.runOnIdle { fake.accepts = false }
        compose.onNodeWithContentDescription("Play verse").performClick()
        compose.onNodeWithText("Speech is unavailable", substring = true).assertIsDisplayed()
        compose.runOnIdle { assertEquals(0, next); fake.accepts = true }
        compose.onNodeWithContentDescription("Play verse").performClick()
        compose.runOnIdle { fake.fail() }
        compose.onNodeWithText("Speech could not be played", substring = true).assertIsDisplayed()
        compose.runOnIdle { assertEquals(0, next) }
    }

    @Test fun hiddenTextIsNotExposedAndCanBeRestored() {
        val fake = FakePlayer()
        val hidden = mutableStateOf(false)
        compose.setContent { RemoraTheme("white") {
            ListenMode("A distinctive verse", true, 1f, 1, hidden.value, false, {}, {}, { hidden.value = it }, {}, {}, {}, {}, fake)
        } }
        compose.onNodeWithText("Listening options").performScrollTo().performClick()
        compose.onNodeWithText("Hide text").performScrollTo().performClick()
        compose.onNodeWithText("A distinctive verse").assertDoesNotExist()
        compose.onNodeWithText("Verse text hidden while you listen.").assertIsDisplayed()
        compose.onNodeWithText("Hide text").performScrollTo().performClick()
        compose.onNodeWithText("A distinctive verse").assertIsDisplayed()
    }
    @Test fun backgroundingStopsPlayback() {
        val fake = FakePlayer()
        compose.setContent { RemoraTheme("white") {
            ListenMode("In the beginning", true, 1f, 1, false, false, {}, {}, {}, {}, {}, {}, {}, fake)
        } }
        compose.onNodeWithContentDescription("Play verse").performClick()
        compose.runOnIdle { assertEquals(1, fake.starts) }
        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        assertTrue(fake.stops > 0)
        assertNull(fake.done)
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
    }
}
