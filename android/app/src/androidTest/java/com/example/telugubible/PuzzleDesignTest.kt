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
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class PuzzleDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun punctuationDuplicatesAndWrongOrderAreHandledAcrossThemes() {
        val palette = mutableStateOf("white")
        val reset = mutableIntStateOf(0)
        var result = -1f
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { key(reset.intValue) {
                    ScrambleMode("Love, love end.", { result = it }, Modifier.width(320.dp).height(650.dp))
                } }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; reset.intValue++; result = -1f }
            compose.onNodeWithText("Check order").assertIsNotEnabled()
            compose.onNodeWithText("end.").performScrollTo().performClick()
            compose.onNodeWithText("Love,").performScrollTo().performClick()
            compose.onNodeWithText("love").performScrollTo().performClick()
            compose.onNodeWithText("Check order").performClick()
            compose.onNodeWithText("The order isn't quite right", substring = true).performScrollTo().assertIsDisplayed()
            compose.runOnIdle { assertEquals(-1f, result) }
            compose.onNodeWithContentDescription("Reset").performScrollTo().performClick()
            compose.onNodeWithText("Love,").performScrollTo().performClick()
            compose.onNodeWithText("love").performScrollTo().performClick()
            compose.onNodeWithText("end.").performScrollTo().performClick()
            compose.onNodeWithText("Check order").performClick()
            compose.waitUntil(5000) { result >= 0f }
            compose.runOnIdle { assertEquals(0.75f, result, 0.001f) }
        }
    }
}
