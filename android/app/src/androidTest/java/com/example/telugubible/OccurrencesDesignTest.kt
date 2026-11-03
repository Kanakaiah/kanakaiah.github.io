package com.example.telugubible.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class OccurrencesDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val entry = StrongsEntry("G3056", "G", "λόγος", "logos", null, null, "word", null, null)
    @Test fun resultsNavigateAcrossThemesAtLargeText() {
        val palette = mutableStateOf("white")
        val item = StrongsOccurrence(43, "John", 1, 1, "word", "In the beginning was the Word", highlightRanges = listOf(25..28))
        var opened: Triple<Int, Int, Int>? = null
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { StrongsOccurrencesSheet(entry, listOf(item), false, null, { b, c, v -> opened = Triple(b, c, v) }, { _, _, _ -> null }, {}) }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("John 1:1").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("KJV").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Read in context").performScrollTo().performClick()
        }
        compose.runOnIdle { assertEquals(Triple(43, 1, 1), opened) }
    }
    @Test fun loadingEmptyAndErrorStatesAreClear() {
        val loading = mutableStateOf(true)
        val error = mutableStateOf<String?>(null)
        compose.setContent { RemoraTheme("white") { StrongsOccurrencesSheet(entry, emptyList(), loading.value, error.value, { _, _, _ -> }, { _, _, _ -> null }, {}) } }
        compose.onNodeWithText("Searching the Bible…").assertIsDisplayed()
        compose.runOnIdle { loading.value = false }
        compose.onNodeWithText("No occurrences found for this word.").assertIsDisplayed()
        compose.runOnIdle { error.value = "Search unavailable" }
        compose.onNodeWithText("Search unavailable").assertIsDisplayed()
    }
}
