package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.today.SearchTabContent
import com.example.telugubible.ui.today.CollectionsTabContent
import com.example.telugubible.ui.today.AddVerseSheet
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class AddVerseDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun searchRangeKeepsSeparateAndCombinedActions() {
        var combined: List<Int?> = emptyList()
        var individual = emptyList<Triple<Int, Int, Int>>()
        val result = VerseSearchResult(1L, 1, "genesis", "Genesis", "ఆదికాండము", null,
            1, 1, 3, null, "In the beginning.", null, listOf(1 to "One", 2 to "Two", 3 to "Three"))
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme("white") {
                    androidx.compose.foundation.layout.Box(Modifier.width(320.dp)) {
                        SearchTabContent(listOf(result), false, "LSB", { _, _ -> },
                            { book, chapter, start, end -> combined = listOf(book, chapter, start, end) },
                            { individual = it }, {})
                    }
                }
            }
        }
        compose.onNodeWithText("Add Individually (3)").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(listOf(Triple(1, 1, 1), Triple(1, 1, 2), Triple(1, 1, 3)), individual) }
        compose.onNodeWithText("Add Combined (1)").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(listOf(1, 1, 1, 3), combined) }
    }

    @Test fun curatedImportsKeepTheirOriginalIds() {
        var imported = ""
        var guides = false
        compose.setContent { RemoraTheme("white") { CollectionsTabContent({ imported = it }, { guides = true }) } }
        compose.onNodeWithText("Add All Key Verses (206 Verses)").performScrollTo().performClick()
        compose.runOnIdle { assertEquals("key_verses_66", imported) }
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Add Well-Known"))
        compose.onNodeWithText("Add Well-Known").performClick()
        compose.runOnIdle { assertEquals("well_known", imported) }
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("View Collections in Guides"))
        compose.onNodeWithText("View Collections in Guides").performClick()
        compose.runOnIdle { assertTrue(guides) }
    }

    @Test fun modesRemainSelectableAtLargeTextInEveryTheme() {
        val palette = mutableStateOf("white")
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    AddVerseSheet(books = emptyList(), topics = emptyList(), searchResults = emptyList(), isSearching = false,
                        onDismiss = {}, onAddSingleVerse = { _, _, _, _, _ -> }, onAddIndividually = { _, _ -> },
                        onAddManualVerse = { _, _ -> }, onAddCollection = { _, _ -> },
                        onSearchVerses = { _, _ -> }, onNavigateToGuides = {})
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Search").performClick().assertIsSelected()
            compose.onNodeWithText("Collections", useUnmergedTree = false).performClick().assertIsSelected()
            compose.onNodeWithText("Manual").performClick().assertIsSelected()
        }
    }

    @Test fun referenceSearchCanSelectTeluguTranslation() {
        var searchedQuery = ""
        var searchedVersion = ""
        compose.setContent { RemoraTheme("white") {
            SearchTabContent(emptyList(), false, "BSB", { query, version -> searchedQuery = query; searchedVersion = version },
                { _, _, _, _ -> }, {}, {})
        } }
        compose.onNodeWithText("BSB").performClick()
        compose.onNodeWithText("Telugu (IRV)").performClick()
        compose.onNodeWithText("Search Scripture").performTextInput("Genesis 1:1")
        compose.runOnIdle { assertEquals("Genesis 1:1", searchedQuery); assertEquals("TELIRV", searchedVersion) }
    }

    @Test fun validationAndSearchErrorsAppearInsideTheSheet() {
        compose.setContent { RemoraTheme("white") {
            AddVerseSheet(books = emptyList(), topics = emptyList(), searchResults = emptyList(), isSearching = false,
                onDismiss = {}, onAddSingleVerse = { _, _, _, _, _ -> }, onAddIndividually = { _, _ -> },
                onAddManualVerse = { _, _ -> }, onAddCollection = { _, _ -> }, onSearchVerses = { _, _ -> },
                onNavigateToGuides = {}, addError = "Check the book, chapter, and verse range.",
                searchError = "Search is unavailable. Try again.")
        } }
        compose.onNodeWithText("Check the book, chapter, and verse range.").assertIsDisplayed()
        compose.onNodeWithText("Search").performClick()
        compose.onNodeWithText("Search is unavailable. Try again.").performScrollTo().assertIsDisplayed()
    }

    @Test fun pickerRejectsInvalidNumbersAndAddsTheChosenReference() {
        var chosen = emptyList<Int>()
        val genesis = Book(1, "genesis", "Genesis", "ఆదికాండము", null, "OT", "Law", 50)
        compose.setContent { RemoraTheme("white") {
            AddVerseSheet(books = listOf(genesis), topics = emptyList(), searchResults = emptyList(), isSearching = false,
                onDismiss = {}, onAddSingleVerse = { book, chapter, verse, _, _ -> chosen = listOf(book, chapter, verse) },
                onAddIndividually = { _, _ -> }, onAddManualVerse = { _, _ -> }, onAddCollection = { _, _ -> },
                onSearchVerses = { _, _ -> }, onNavigateToGuides = {})
        } }
        compose.onNodeWithText("Pick from Bible Dropdown").performClick()
        compose.onNodeWithText("Chapter").performTextClearance()
        compose.onNodeWithText("Chapter").performTextInput("51")
        compose.waitUntil(10_000) { compose.onAllNodesWithTag("add-verse-compact-header").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("manual-entry-list").performScrollToIndex(3)
        compose.onNodeWithText("Add to Library").assertIsNotEnabled()
        compose.onNodeWithTag("manual-entry-list").performScrollToIndex(2)
        compose.onNodeWithText("Chapter").performTextClearance()
        compose.onNodeWithText("Chapter").performTextInput("1")
        compose.onNodeWithText("Verse").performTextClearance()
        compose.onNodeWithText("Verse").performTextInput("0")
        compose.onNodeWithTag("manual-entry-list").performScrollToIndex(3)
        compose.onNodeWithText("Add to Library").assertIsNotEnabled()
        compose.onNodeWithTag("manual-entry-list").performScrollToIndex(2)
        compose.onNodeWithText("Verse").performTextClearance()
        compose.onNodeWithText("Verse").performTextInput("1")
        compose.onNodeWithTag("manual-entry-list").performScrollToIndex(3)
        compose.onNodeWithText("Add to Library").assertIsEnabled().performClick()
        compose.runOnIdle { assertEquals(listOf(1, 1, 1), chosen) }
    }
}
