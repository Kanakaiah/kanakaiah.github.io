package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.*
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.bible.*
import com.example.telugubible.ui.practice.ChainDrill
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class LibraryGuideDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val book = Book(1, "genesis", "Genesis", "ఆదికాండము", null, "OT", "Pentateuch", 50, "CREATION & FALL")
    private val anchors = listOf(ChapterAnchor(bookId=1, chapter=1, word="LIGHT", scene="God creates light."),
        ChapterAnchor(bookId=1, chapter=2, word="GARDEN", scene="God plants a garden."))
    private val guide = BookGuide(1, "genesis", "Where Everything Began and Everything Broke", null, "**LIGHT** leads to the **GARDEN**.", null,
        blocks=listOf(GuideBlock(bookId=1,blockIndex=0,chapters="1-2",label="Beginnings",description="Creation and the garden.")),
        anchors=anchors, keyVerses=listOf(GuideKeyVerse(bookId=1,ref="Genesis 1:1",text="In the beginning God created the heavens and the earth.",theme=null)))

    @Test fun libraryOffersDistinctReadingAndGuideActions() {
        var readBook = 0
        var guideBook = 0
        compose.setContent { RemoraTheme("white") {
            BibleLibraryContent(BibleBrowserUiState(allBooks=listOf(book),filteredBooks=listOf(book),isLoading=false),
                {},{},{},{ guideBook = it },{}, onReadBook = { readBook = it })
        } }
        compose.onNodeWithText("Read").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, readBook); assertEquals(0, guideBook) }
        compose.onNodeWithText("Open book guide").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, guideBook) }
    }

    @Test fun compactLargeTextAcrossFourThemesAndTwoScripts() {
        val palette=mutableStateOf("white")
        val version=mutableStateOf("LSB")
        val library=mutableStateOf(true)
        compose.setContent {
            val density=LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density,1.5f)) {
                RemoraTheme(palette.value) {
                    key(library.value,version.value,palette.value) {
                        if(library.value) BibleLibraryContent(BibleBrowserUiState(allBooks=listOf(book),filteredBooks=listOf(book),isLoading=false,activeVersion=version.value),{},{},{},{},{},Modifier.width(320.dp))
                        else BookGuideContent(BookGuideUiState(book=book,books=listOf(book),guide=guide,isLoading=false,activeVersion=version.value),{},{_,_->},{},{},{},{},{_,_,_->},{},{},{},{},Modifier.width(320.dp))
                    }
                }
            }
        }
        for(theme in listOf("white","black","dark","sepia")) for(language in listOf("LSB","TELIRV")) {
            compose.runOnIdle { palette.value=theme;version.value=language;library.value=true }
            assertTextFits()
            compose.onNodeWithText("Open book guide").performScrollTo().assertIsDisplayed()
            assertTextFits()
            compose.runOnIdle { library.value=false }
            compose.onNodeWithContentDescription("Back to Bible").assertIsDisplayed().assertHasClickAction()
            compose.onNodeWithContentDescription("Previous book").assertIsNotEnabled()
            assertTextFits()
            compose.onNodeWithText("Choose chapter").performScrollTo().assertIsDisplayed()
            assertTextFits()
            compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Key verses"))
            compose.onNodeWithText("Add to memory").performScrollTo().assertIsDisplayed()
            assertTextFits()
            compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Memory sentence"))
            compose.onNodeWithContentDescription("Copy memory sentence").performScrollTo().assertHasClickAction()
            assertTextFits()
        }
    }

    @Test fun anchorRevealAndPracticeChainSubmission() {
        val state=mutableStateOf(BookGuideUiState(book=book,books=listOf(book),guide=guide,isLoading=false))
        val drill=mutableStateOf(false)
        var results:List<Pair<Int,Boolean>> = emptyList()
        compose.setContent { RemoraTheme("white") {
            BookGuideContent(state.value,{},{_,_->},{},{},{},{chapter->state.value=state.value.copy(revealedAnchors=setOf(chapter))},
                {_,_,_->drill.value=true},{},{},{},{})
            if(drill.value) ChainDrill(1,0,"Beginnings",anchors,{drill.value=false},{results=it})
        } }
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Show anchor"))
        compose.onAllNodesWithText("Show anchor").onFirst().performScrollTo().performClick()
        compose.onNodeWithText("LIGHT").performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Chapter 1 illustration").assertExists()
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Practice chapter chain"))
        compose.onNodeWithText("Practice chapter chain").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Close drill").assertIsDisplayed()
        // The existing chain drill reveals each answer before recording recall.
        compose.onNodeWithText("What comes next?").performClick()
        compose.onNodeWithText("Had it").performClick()
        compose.onNodeWithText("What comes next?").performClick()
        compose.onNodeWithText("Missed").performClick()
        compose.runOnIdle { assertEquals(listOf(1 to true,2 to false),results) }
        compose.onNodeWithText("Done").performClick()
        compose.onNodeWithContentDescription("Back to Bible").assertIsDisplayed()
    }

    @Test fun guideJumpsToKeyVersesAndMemoryWithCollapsedAndExpandedChapters() {
        val state = mutableStateOf(BookGuideUiState(book = book, books = listOf(book), guide = guide, isLoading = false))
        compose.setContent { RemoraTheme("white") {
            BookGuideContent(state.value, {}, { _, _ -> }, {}, {}, {}, {}, { _, _, _ -> }, {}, {}, {}, {})
        } }
        for (collapsed in listOf(emptySet(), setOf(0))) {
            compose.runOnIdle { state.value = state.value.copy(collapsedBlocks = collapsed) }
            compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
            compose.onNodeWithText("Jump to key verses").performScrollTo().performClick()
            compose.onNodeWithText("Key verses").assertIsDisplayed()
            compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
            compose.onNodeWithText("Jump to memory sentence").performScrollTo().performClick()
            compose.onNodeWithText("Memory sentence").assertIsDisplayed()
        }
    }

    private fun assertTextFits() {
        compose.onAllNodes(hasText("",substring=true),useUnmergedTree=true).fetchSemanticsNodes().forEach { node ->
            val layouts=mutableListOf<TextLayoutResult>()
            if(node.config.contains(SemanticsActions.GetTextLayoutResult)) node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
            layouts.forEach { layout ->
                assertFalse("Clipped text: ${layout.layoutInput.text}",layout.multiParagraph.height>layout.size.height+1f || (0 until layout.lineCount).any {
                    layout.isLineEllipsized(it)||layout.getLineLeft(it)< -1f||layout.getLineRight(it)>layout.size.width+1f
                })
            }
        }
    }
}
