package com.example.telugubible.ui.practice

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.util.SpeechRecognizerState
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [35])
class ReciteDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun permissionAndSpeechStatesAreClearAcrossThemes() {
        val palette = mutableStateOf("white")
        val permission = mutableStateOf(false)
        val settings = mutableStateOf(false)
        val state = mutableStateOf(SpeechRecognizerState())
        var asked = 0
        var opened = 0
        var started = 0
        var stopped = 0
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    SpeechModeContent("God is love", state.value, permission.value, settings.value, { asked++ }, { opened++ }, { started++ }, { stopped++ }, Modifier.width(320.dp))
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; permission.value = false; settings.value = false; state.value = SpeechRecognizerState() }
            compose.onNodeWithText("Allow microphone").performScrollTo().performClick()
            compose.runOnIdle { settings.value = true }
            compose.onNodeWithText("Open app settings").performScrollTo().performClick()
            compose.runOnIdle { permission.value = true }
            compose.onNodeWithText("Start reciting").performScrollTo().performClick()
            compose.runOnIdle { state.value = SpeechRecognizerState(isListening = true, transcript = "God is") }
            compose.onNodeWithText("God is love").assertDoesNotExist()
            compose.onNodeWithText("God is").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Finish speaking").performScrollTo().performClick()
            compose.runOnIdle { state.value = SpeechRecognizerState(isProcessing = true, transcript = "God is") }
            compose.onNodeWithText("Processing…").performScrollTo().assertIsNotEnabled()
            compose.runOnIdle { state.value = SpeechRecognizerState(isAvailable = false, error = "Not available") }
            compose.onNodeWithText("Speech recognition is unavailable on this device.").performScrollTo().assertIsDisplayed()
        }
        compose.runOnIdle { assertEquals(4, asked); assertEquals(4, opened); assertEquals(4, started); assertEquals(4, stopped) }
    }
}
