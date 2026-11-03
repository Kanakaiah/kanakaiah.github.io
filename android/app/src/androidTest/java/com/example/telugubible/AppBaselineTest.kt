package com.example.telugubible

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File

/** Real app smoke tests. Run with -PisolatedUiTests=true on an explicit device. */
class AppBaselineTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Before
    fun waitForToday() {
        check(InstrumentationRegistry.getInstrumentation().targetContext.packageName.endsWith(".uitest")) {
            "Run with -PisolatedUiTests=true to keep tests separate from personal progress."
        }
        awaitNode(hasContentDescription("Settings"))
    }

    @Test
    fun chapterAnchorsReturnThroughVersePractice() {
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Chapter Themes"))
        compose.onNodeWithText("Chapter Themes").performClick()
        awaitNode(hasText("Genesis"))
        screenshot("chapter-picker")
        compose.onNodeWithText("Genesis").performClick()
        awaitNode(hasText("Chapter anchors"))
        compose.waitUntil(15000) { compose.onAllNodesWithText("Show anchor").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Show anchor").performScrollTo().performClick()
        compose.onNodeWithText("LIGHT").performScrollTo().assertIsDisplayed()
        screenshot("anchors-app")
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasContentDescription("Exit to Today"))
        compose.onNodeWithContentDescription("Exit to Today").performClick()
        awaitNode(hasContentDescription("Settings"))
    }

    @Test
    fun bookThemesReturnToToday() {
        compose.onNodeWithText("Book Themes").performScrollTo().performClick()
        awaitNode(hasText("Book themes"))
        compose.waitUntil(15000) { compose.onAllNodesWithText("Show theme").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("New Testament").performScrollTo().performClick()
        awaitNode(hasText("Matthew"))
        compose.onNodeWithText("Show theme").performScrollTo().performClick()
        compose.onNodeWithText("Easy").performScrollTo().assertIsEnabled()
        screenshot("themes-app")
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasContentDescription("Settings"))
    }

    @Test
    fun collectionManagementOpensAndClosesFromToday() {
        compose.onNodeWithText("Manage collections").performScrollTo().performClick()
        awaitNode(hasText("New collection name"))
        compose.onNodeWithContentDescription("Close").performClick()
        awaitNode(hasText("Collections"))
    }

    @Test
    fun bibleFiltersSearchAndReturnFromGuide() {
        compose.onNode(hasText("Bible") and hasClickAction()).performClick()
        awaitNode(hasContentDescription("Close to Today"))
        compose.onNodeWithText("New Testament").performClick()
        awaitNode(hasContentDescription("Matthew"))
        val search = compose.onNodeWithText("Search all books")
        search.performTextInput("Genesis")
        compose.waitUntil(60_000) { compose.onAllNodesWithContentDescription("Genesis").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithContentDescription("Genesis").performScrollTo().performClick()
        awaitNode(hasContentDescription("Back to Bible"))
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        compose.waitUntil(60_000) { compose.onAllNodesWithContentDescription("Clear search").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithContentDescription("Genesis").assertExists()
        compose.onNodeWithContentDescription("Clear search").performScrollTo().performClick()
        compose.waitUntil(60_000) { compose.onAllNodesWithContentDescription("Matthew").fetchSemanticsNodes().isNotEmpty() }
        screenshot("bible-library")
    }

    @Test
    fun bookGuideChapterPickerAndReaderReturn() {
        compose.onNode(hasText("Bible") and hasClickAction()).performClick()
        awaitNode(hasContentDescription("Genesis"))
        compose.onNodeWithContentDescription("Genesis").performScrollTo().performClick()
        awaitNode(hasText("Choose chapter"))
        screenshot("book-guide")
        compose.onNodeWithText("Choose chapter").performClick()
        awaitNode(hasContentDescription("Read chapter 2"))
        compose.onNodeWithContentDescription("Read chapter 2").performClick()
        awaitNode(hasText("Genesis 2"))
        compose.onNodeWithContentDescription("Go back").performClick()
        awaitNode(hasText("Choose chapter"))
        compose.onNodeWithContentDescription("Back to Bible").performClick()
        awaitNode(hasContentDescription("Genesis"))
    }

    @Test
    fun todayLookupAndBibleNavigation() {
        screenshot("today")
        compose.onNode(hasText("Lookup") and hasClickAction()).performClick()
        awaitNode(hasText("Bible Verses"))
        screenshot("lookup")
        compose.onNode(hasText("Bible") and hasClickAction()).performClick()
        awaitNode(hasContentDescription("Close to Today"))
        awaitNode(hasContentDescription("Genesis"))
        screenshot("bible")
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasContentDescription("Settings"))
        compose.onNode(hasText("Lookup") and hasClickAction()).assertExists()
    }

    @Test
    fun settingsReturnsToLookupThenBackReturnsToToday() {
        compose.onNode(hasText("Lookup") and hasClickAction()).performClick()
        awaitNode(hasText("Bible Verses"))
        compose.onNodeWithContentDescription("Settings").performClick()
        awaitNode(hasText("Theme Palette"))
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasText("Bible Verses"))
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasText("Collections"))
    }

    @Test
    fun settingsSurviveActivityRecreationAndBackReturnsToToday() {
        compose.onNodeWithContentDescription("Settings").performClick()
        awaitNode(hasText("Theme Palette"))
        screenshot("settings")
        compose.activityRule.scenario.recreate()
        awaitNode(hasText("Theme Palette"))
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasContentDescription("Settings"))
        compose.onNode(hasText("Lookup") and hasClickAction()).assertExists()
    }

    @Test
    fun todayReaderReturnsToCurrentChapter() {
        compose.runOnUiThread {
            androidx.lifecycle.ViewModelProvider(compose.activity)[com.example.telugubible.ui.reader.ReaderViewModel::class.java]
                .selectBookAndChapterById(1, 1)
        }
        awaitNode(hasText("Genesis 1"))
        compose.onNodeWithText("Genesis 1").performScrollTo().performClick()
        awaitNode(hasContentDescription("Go back"))
        awaitNode(hasContentDescription("Next") and isEnabled())
        compose.onNodeWithContentDescription("Next").performClick()
        awaitNode(hasText("Genesis 2"))
        screenshot("reader")
        compose.activityRule.scenario.recreate()
        awaitNode(hasText("Genesis 2"))
        compose.onNodeWithContentDescription("Reading settings").performClick()
        awaitNode(hasText("Reading settings"))
        screenshot("reader-settings")
        compose.onNodeWithText("Done").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Go back").performClick()
        awaitNode(hasText("Continue reading"))
        compose.onNodeWithText("Genesis 2").performScrollTo().assertExists().performClick()
        awaitNode(hasContentDescription("Go back"))
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasText("Continue reading"))
        compose.onNodeWithText("Genesis 2").assertExists()
    }

    @Test
    fun immerseKeepsChapterAndRestoresControls() {
        compose.runOnUiThread {
            androidx.lifecycle.ViewModelProvider(compose.activity)[com.example.telugubible.ui.reader.ReaderViewModel::class.java]
                .selectBookAndChapterById(1, 1)
        }
        awaitNode(hasText("Genesis 1"))
        compose.onNodeWithText("Genesis 1").performScrollTo().performClick()
        awaitNode(hasContentDescription("Reader actions"))
        compose.onNodeWithContentDescription("Reader actions").performClick()
        compose.onNodeWithText("Immerse Reading").performClick()
        awaitNode(hasText("Genesis 1"))
        compose.onNodeWithContentDescription("Reader actions").performClick()
        compose.onNodeWithText("Hide controls").performClick()
        awaitNode(hasContentDescription("Show reading controls"))
        compose.onNodeWithContentDescription("Show reading controls").performClick()
        awaitNode(hasText("Genesis 1"))
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        awaitNode(hasContentDescription("Reader actions"))
    }

    @Test
    fun passageSelectorOpensVerseInAnotherChapter() {
        val reader = androidx.lifecycle.ViewModelProvider(compose.activity)[com.example.telugubible.ui.reader.ReaderViewModel::class.java]
        compose.runOnUiThread { reader.selectBookAndChapterById(1, 1) }
        awaitNode(hasText("Genesis 1"))
        compose.onNodeWithText("Genesis 1").performScrollTo().performClick()
        awaitNode(hasContentDescription("Reader actions"))
        compose.onNodeWithText("Genesis 1").performClick()
        awaitNode(hasText("Choose passage"))
        compose.onNodeWithText("Chapter").performClick()
        compose.onNodeWithText("2").performClick()
        awaitNode(hasContentDescription("Verse 5"))
        compose.onAllNodes(hasScrollToIndexAction()).onLast().performScrollToNode(hasContentDescription("Verse 20"))
        compose.onNodeWithContentDescription("Verse 20").performClick()
        compose.waitUntil(60_000) { reader.uiState.value.currentChapter == 2 && reader.uiState.value.flashVerse == 20 && !reader.uiState.value.isLoading }
        awaitNode(hasText("Genesis 2"))
        compose.waitUntil(10_000) {
            val headerBottom = compose.onNodeWithContentDescription("Reading settings").fetchSemanticsNode().boundsInRoot.bottom
            val screenBottom = compose.onRoot().fetchSemanticsNode().boundsInRoot.bottom
            compose.onAllNodes(hasText("", substring = true), useUnmergedTree = true).fetchSemanticsNodes().any { node ->
                val layouts = mutableListOf<TextLayoutResult>()
                if (node.config.contains(SemanticsActions.GetTextLayoutResult)) node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
                layouts.any { layout ->
                    val text = layout.layoutInput.text
                    val verse = text.getStringAnnotations("VERSE", 0, text.length).firstOrNull { it.item == "20" }
                    if (verse == null) false else {
                        val top = node.boundsInRoot.top + layout.getLineTop(layout.getLineForOffset(verse.start))
                        top >= headerBottom && top < screenBottom - 48
                    }
                }
            }
        }
    }

    private fun awaitNode(matcher: SemanticsMatcher) {
        compose.waitUntil(60_000) {
            compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onAllNodes(matcher).onFirst().assertIsDisplayed()
    }

    private fun screenshot(name: String) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "baseline").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use {
            compose.waitForIdle()
            val bitmap = if (name == "reader-settings" || name == "chapter-picker") {
                // ModalBottomSheet has its own window; capture the composed device frame.
                InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot()
            } else compose.onRoot().captureToImage().asAndroidBitmap()
            checkNotNull(bitmap).compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
