package com.example.telugubible

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.ui.reader.ReaderViewModel
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class OccurrenceReturnTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    @Test fun readingOccurrenceRestoresWordAndResults() {
        check(InstrumentationRegistry.getInstrumentation().targetContext.packageName.endsWith(".uitest"))
        val reader = ViewModelProvider(compose.activity)[ReaderViewModel::class.java]
        compose.runOnUiThread { reader.selectBookAndChapterById(1, 1) }
        compose.waitUntil(60_000) { reader.uiState.value.currentBook?.id == 1 && reader.uiState.value.currentChapter == 1 && !reader.uiState.value.isLoading }
        compose.waitUntil(60_000) { compose.onAllNodesWithText("Genesis 1").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Genesis 1").performScrollTo().performClick()
        compose.waitUntil(60_000) { compose.onAllNodesWithContentDescription("Reader actions").fetchSemanticsNodes().isNotEmpty() }
        val entry = StrongsEntry("G3056", "G", "λόγος", "logos", null, null, "word", null, null)
        val occurrences = (1..25).map { verse -> StrongsOccurrence(43, "John", 1, verse, "word", "In the beginning was the Word") }
        compose.runOnUiThread {
            reader.toggleVerseSelection(1)
            reader.restoreWordStudy(reader.uiState.value.copy(occurrencesStrongs = entry, occurrencesList = occurrences))
        }
        compose.waitUntil(10_000) { compose.onAllNodesWithText("Word occurrences").fetchSemanticsNodes().isNotEmpty() }
        compose.onAllNodes(hasScrollToIndexAction()).onLast().performScrollToIndex(24)
        compose.onNodeWithText("John 1:25").assertIsDisplayed()
        compose.onAllNodesWithText("Read in context").onLast().performScrollTo().performClick()
        compose.waitUntil(60_000) { reader.uiState.value.currentBook?.id == 43 && reader.uiState.value.currentChapter == 1 && !reader.uiState.value.isLoading }
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.waitUntil(60_000) { reader.uiState.value.currentBook?.id == 1 && reader.uiState.value.occurrencesStrongs?.id == "G3056" && reader.uiState.value.occurrencesList.size == 25 }
        compose.onNodeWithText("John 1:25").assertIsDisplayed()
        assertEquals(setOf(1), reader.uiState.value.selectedVerses)
    }
}
