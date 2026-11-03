package com.example.telugubible.ui.lookup

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class LookupDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun resultsAndActionsWorkAcrossThemesAtLargeText() {
        val palette = mutableStateOf("white")
        val result = VerseSearchResult(id = 1, bookId = 1, bookKey = "genesis", bookNameEn = "Genesis", bookNameTe = "ఆదికాండము", chapter = 1, verse = 1, textTe = "ఆదియందు", textEn = "In the beginning")
        val state = mutableStateOf(LookupUiState(query = "beginning", hasSearched = true, verseResults = listOf(result)))
        var read = false
        var added = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    LookupContent(state.value, { state.value = state.value.copy(query = it) }, { state.value = state.value.copy(mode = it) }, {}, { read = true }, { added = true }, null, {})
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; state.value = state.value.copy(mode = LookupMode.VERSES) }
            compose.onNodeWithText("Genesis 1:1").assertIsDisplayed()
            compose.onNodeWithText("Read").performClick()
            compose.onNodeWithText("Add to memory").performClick()
            compose.onNodeWithText("Strong's").performClick().assertIsSelected()
            compose.onNodeWithText("No Strong's entries found", substring = true).assertIsDisplayed()
        }
        compose.runOnIdle { assertTrue(read); assertTrue(added) }
    }
}
