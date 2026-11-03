package com.example.telugubible.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.OriginalWord
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class OriginalWordsDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun wordDetailsAndActionsWorkAcrossThemesAtLargeText() {
        val palette = mutableStateOf("white")
        val entry = StrongsEntry("G3056", "G", "λόγος", "logos", "log'-os", "from G3004", "a word or saying", "word, saying", "noun")
        var opened = ""
        var occurrences = ""
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    OriginalWordsSheet("John 1:1", false, listOf(OriginalWord("word", "G3056", entry)), false,
                        { opened = it.id }, { occurrences = it }, {}, {})
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("λόγος").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Translated as: word").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("More word details").performScrollTo().performClick()
            compose.onNodeWithText("KJV translations").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Hide word details").performScrollTo().performClick()
            compose.onNodeWithText("Open definition").performScrollTo().performClick()
            compose.onNodeWithText("View occurrences").performScrollTo().performClick()
        }
        compose.runOnIdle { assertEquals("G3056", opened); assertEquals("G3056", occurrences) }
    }
    @Test fun unavailableDataHasClearEmptyState() {
        compose.setContent { RemoraTheme("white") { OriginalWordsSheet("John 1:1", false, emptyList(), false, {}, onDismiss = {}) } }
        compose.onNodeWithText("Original word data is unavailable for this verse.").assertIsDisplayed()
    }
}
