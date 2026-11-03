package com.example.telugubible

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.practice.*
import com.example.telugubible.util.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import java.io.File

class StudyPracticeDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val anchor = AnchorDrillItem(1, "Genesis", "gen", 1, "LIGHT", "God creates light and separates it from darkness.",
        siblings = listOf(AnchorSibling(1, "LIGHT"), AnchorSibling(2, "GARDEN")))
    private val book = Book(1, "gen", "Genesis", "ఆదికాండము", null, "OT", "Law", 50,
        "CREATION & FALL", "BEGINNINGS", "God creates the world and begins his covenant story.")

    @Test fun anchorDirectionsFeedbackGradeAndCompletion() {
        val state = mutableStateOf(AnchorDrillUiState(queue = listOf(anchor), isLoading = false))
        var grade = 0
        var exited = false
        compose.setContent {
            RemoraTheme("white") {
                AnchorDrillContent(state.value,
                    { state.value = state.value.copy(direction = it, typedInput = "", isRevealed = false, judgement = null) },
                    { state.value = state.value.copy(typedInput = it) },
                    { state.value = state.value.copy(isRevealed = true, judgement = AnchorJudge.judgeByDirection(state.value.typedInput, state.value.direction, anchor.word, anchor.chapter, anchor.siblings)) },
                    { state.value = state.value.copy(isRevealed = true) },
                    { grade = it; state.value = state.value.copy(isFinished = true) },
                    { state.value = state.value.copy(isFinished = false, isRevealed = false, typedInput = "", judgement = null) },
                    { exited = true })
            }
        }
        compose.onNodeWithText("Check answer").performScrollTo().assertIsNotEnabled()
        screenshot("anchors-prompt")
        compose.onNode(hasSetTextAction()).performScrollTo().performTextInput("GARDEN")
        compose.onNodeWithText("Check answer").performScrollTo().performClick()
        compose.onNodeWithText("That anchor belongs to Chapter 2: GARDEN").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Again").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, grade) }
        compose.onNodeWithText("Anchor practice complete").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Practice again").performScrollTo().performClick()
        compose.onNodeWithText("Number → Word").performScrollTo().performClick()
        compose.onNodeWithText("Word → Number").performClick()
        compose.onNode(hasSetTextAction()).performScrollTo().performTextInput("1")
        compose.onNodeWithText("Check answer").performScrollTo().performClick()
        compose.onNodeWithText("Correct answer").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Good").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(4, grade) }
        compose.onNodeWithText("Practice again").performScrollTo().performClick()
        compose.onNodeWithText("Word → Number").performScrollTo().performClick()
        compose.onNodeWithText("Plate → Word").performClick()
        compose.onNodeWithText("Chapter cue").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Show anchor").performScrollTo().performClick()
        compose.onNodeWithText("Easy").performScrollTo().assertIsEnabled()
        screenshot("anchors-answer")
        compose.onNodeWithContentDescription("Back to verse practice").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(exited) }
    }

    @Test fun themeScopeSkipAndExplicitGrades() {
        val state = mutableStateOf(ThemeDrillUiState(queue = listOf(ThemeDrillItem(book, null),
            ThemeDrillItem(book.copy(id = 2, key = "exo", nameEn = "Exodus"), null)), isLoading = false))
        var skipped = false
        var grade = 0
        var exited = false
        compose.setContent {
            RemoraTheme("white") {
                ThemeDrillContent(state.value, { state.value = state.value.copy(scope = it) },
                    { state.value = state.value.copy(isRevealed = true) },
                    { grade = it; state.value = state.value.copy(currentIndex = state.value.currentIndex + 1,
                        isRevealed = false, isFinished = state.value.currentIndex == 1) },
                    { skipped = true }, {}, { exited = true })
            }
        }
        compose.onNodeWithText("New Testament").performScrollTo().performClick().assertIsSelected()
        compose.onNodeWithText("Old Testament").performClick().assertIsSelected()
        compose.onNodeWithText("Whole Bible").performClick().assertIsSelected()
        compose.onNodeWithText("Skip without grading").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(skipped); assertEquals(0, grade) }
        compose.onNodeWithText("Show theme").performScrollTo().performClick()
        compose.onNodeWithText("CREATION & FALL").performScrollTo().assertIsDisplayed()
        screenshot("themes-answer")
        compose.runOnIdle { state.value = state.value.copy(isGrading = true) }
        compose.onNodeWithText("Good").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Skip without grading").performScrollTo().assertIsNotEnabled()
        compose.runOnIdle { state.value = state.value.copy(isGrading = false) }
        compose.onNodeWithText("Good").performScrollTo().performClick()
        compose.onNodeWithText("Book themes").assertIsDisplayed()
        compose.onNodeWithText("Exodus").performScrollTo().assertIsDisplayed()
        compose.runOnIdle { assertEquals(4, grade) }
        compose.onNodeWithText("Show theme").performScrollTo().performClick()
        compose.onNodeWithText("Easy").performScrollTo().performClick()
        compose.onNodeWithText("Theme practice complete").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Back to Today").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(5, grade); assertTrue(exited) }
    }

    @Test fun compactLargeTextAcrossPalettesAndScripts() {
        val palette = mutableStateOf("white")
        val themes = mutableStateOf(false)
        val telugu = mutableStateOf(false)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    if (themes.value) {
                        val sample = if (telugu.value) book.copy(nameEn = "ఆదికాండము", themeWord = "సృష్టి", subtitle = "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను.") else book
                        ThemeDrillContent(ThemeDrillUiState(queue = listOf(ThemeDrillItem(sample, null)), isLoading = false, isRevealed = true),
                            {}, {}, {}, {}, {}, {}, Modifier.width(320.dp))
                    } else {
                        val sample = if (telugu.value) anchor.copy(bookName = "ఆదికాండము", word = "వెలుగు", scene = "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను.") else anchor
                        AnchorDrillContent(AnchorDrillUiState(queue = listOf(sample), isLoading = false, isRevealed = true),
                            {}, {}, {}, {}, {}, {}, {}, Modifier.width(320.dp))
                    }
                }
            }
        }
        for (name in listOf("white", "black", "dark", "sepia")) {
            for (isTheme in listOf(false, true)) {
                for (isTelugu in listOf(false, true)) {
                    compose.runOnIdle { palette.value = name; themes.value = isTheme; telugu.value = isTelugu }
                    compose.onNodeWithText("Easy").performScrollTo().assertIsDisplayed()
                    assertTextFits()
                    screenshot("${if (isTheme) "themes" else "anchors"}-compact-$name-${if (isTelugu) "te" else "en"}-150")
                }
            }
        }
    }

    private fun assertTextFits() {
        compose.onAllNodes(hasText("", substring = true), useUnmergedTree = true).fetchSemanticsNodes().forEach { node ->
            val layouts = mutableListOf<TextLayoutResult>()
            if (node.config.contains(SemanticsActions.GetTextLayoutResult)) node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
            layouts.forEach { layout ->
                val clipped = layout.multiParagraph.height > layout.size.height + 1f || (0 until layout.lineCount).any {
                    layout.isLineEllipsized(it) || layout.getLineLeft(it) < -1f || layout.getLineRight(it) > layout.size.width + 1f
                }
                assertFalse("Clipped text: ${layout.layoutInput.text}", clipped)
            }
        }
    }

    private fun screenshot(name: String) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "baseline").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use {
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
