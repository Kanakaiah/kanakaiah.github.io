package com.example.telugubible.ui.practice

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class TypingDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun blankIsDisabledAndPartialAnswerShowsComparisonAcrossThemes() {
        val palette = mutableStateOf("white")
        val reset = mutableIntStateOf(0)
        var accuracy = -1
        var committed = ""
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { key(reset.intValue) { TypingMode("God is love", { score, text -> accuracy = score; committed = text }, Modifier.width(320.dp)) } }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; reset.intValue++ }
            compose.onNodeWithText("Check").performScrollTo().assertIsNotEnabled()
            compose.onNodeWithText("God is love").assertDoesNotExist()
            compose.onNode(hasSetTextAction()).performScrollTo().performTextInput("God is light")
            compose.onNodeWithText("Check").performScrollTo().performClick()
            compose.onNodeWithText("2 of 3 words matched.", substring = true).performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Your answer").performScrollTo().assertIsDisplayed()
            compose.runOnIdle { assertEquals(67, accuracy); assertEquals("God is light", committed) }
        }
    }
    @Test fun exactAnswerIsScoredOnce() {
        var calls = 0
        var score = -1
        compose.setContent { RemoraTheme("white") { TypingMode("God is love", { accuracy, _ -> score = accuracy; calls++ }) } }
        compose.onNode(hasSetTextAction()).performTextInput("God is love")
        compose.onNodeWithText("Check").performScrollTo().performClick()
        compose.onNodeWithText("3 of 3 words matched.", substring = true).assertIsDisplayed()
        compose.runOnIdle { assertEquals(100, score); assertEquals(1, calls) }
    }
}
