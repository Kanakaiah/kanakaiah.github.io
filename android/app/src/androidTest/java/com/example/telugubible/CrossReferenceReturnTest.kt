package com.example.telugubible

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.example.telugubible.ui.reader.ReaderViewModel
import com.example.telugubible.util.KjvVersification
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class CrossReferenceReturnTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    @Test fun readingLinkedPassageReturnsToOriginalSelection() {
        check(InstrumentationRegistry.getInstrumentation().targetContext.packageName.endsWith(".uitest"))
        val reader = ViewModelProvider(compose.activity)[ReaderViewModel::class.java]
        compose.runOnUiThread { reader.selectBookAndChapterById(1, 1) }
        compose.waitUntil(60_000) { reader.uiState.value.currentBook?.id == 1 && reader.uiState.value.currentChapter == 1 && !reader.uiState.value.isLoading }
        compose.waitUntil(60_000) { compose.onAllNodesWithText("Genesis 1").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Genesis 1").performScrollTo().performClick()
        compose.waitUntil(60_000) { compose.onAllNodesWithContentDescription("Reader actions").fetchSemanticsNodes().isNotEmpty() }
        compose.runOnUiThread { reader.toggleVerseSelection(1); reader.openCrossReferences(listOf(1)) }
        compose.waitUntil(60_000) { reader.uiState.value.connectionsData?.outgoing?.isNotEmpty() == true }
        val ref = reader.uiState.value.connectionsData!!.outgoing.first { it.toBookId != null && it.toChapter != null }
        val target = KjvVersification.fromVerseIndex(ref.otherStartVid)
        compose.onAllNodesWithText(ref.toRef).onFirst().performScrollTo().performClick()
        compose.waitUntil(60_000) { reader.uiState.value.connectionsData?.vid == ref.otherStartVid }
        compose.onAllNodesWithText("Read in context").onFirst().performScrollTo().performClick()
        compose.waitUntil(60_000) { reader.uiState.value.currentBook?.id == target.bookId && reader.uiState.value.currentChapter == target.chapter && !reader.uiState.value.isLoading }
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.waitUntil(60_000) { reader.uiState.value.currentBook?.id == 1 && reader.uiState.value.currentChapter == 1 && !reader.uiState.value.isLoading && reader.uiState.value.selectedVerses == setOf(1) }
        assertEquals(setOf(1), reader.uiState.value.selectedVerses)
    }
}
