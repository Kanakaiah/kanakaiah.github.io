package com.example.telugubible.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class StrongsDefinitionDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun detailsAndOccurrencesWorkAcrossThemesAtLargeText() {
        val palette = mutableStateOf("white")
        val entry = StrongsEntry("G3056", "G", "λόγος", "logos", "log'-os", "from G3004", "a word or saying", "word, saying", "noun")
        var occurrences = ""
        var closed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { StrongsDialog(entry, { occurrences = it }, {}, { closed = true }) }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("λόγος").assertIsDisplayed()
            compose.onNodeWithText("More word details").performScrollTo().performClick()
            compose.onNodeWithText("KJV translations").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Hide word details").performScrollTo().performClick()
            compose.onNodeWithText("View occurrences").performScrollTo().performClick()
        }
        compose.onNodeWithText("Close").performClick()
        compose.runOnIdle { assertEquals("G3056", occurrences); assertTrue(closed) }
    }
}
