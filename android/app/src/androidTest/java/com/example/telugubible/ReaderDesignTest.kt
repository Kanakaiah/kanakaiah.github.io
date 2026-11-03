package com.example.telugubible

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
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
import com.example.telugubible.data.model.Verse
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.reader.*
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import java.io.File

class ReaderDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun compactReaderSupportsLargeTextPalettesAndActions() {
        val palette = mutableStateOf("white")
        val telugu = mutableStateOf(false)
        var settingsOpened = false
        var navigatorOpened = false
        var nextPressed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    Surface(Modifier.width(320.dp)) {
                        Column(Modifier.verticalScroll(rememberScrollState())) {
                            ReaderHeader(if (telugu.value) "ఆదికాండము 1" else "Genesis 1", "LSB", false,
                                {}, { navigatorOpened = true }, { settingsOpened = true }, {}, {}, {})
                            for (section in 0..1) ParagraphView(
                                paragraph = ReaderParagraph("sample-$section", section, listOf(Verse(1, 1, 1, 1,
                                    "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను.",
                                    "In the beginning God created the heaven and the earth.")), sectionHeading = if (section == 0) "The creation" else "Light and darkness"),
                                selectedVerses = emptySet(), flashVerse = null, memorizedVerses = emptySet(),
                                activeTtsVerse = null, otQuotes = emptySet(), showSectionHeadings = true,
                                showVerseNumbers = true, showParagraphMarks = false, showCrossRefMarkers = false,
                                crossRefCounts = emptyMap(), bionicReading = false, fontSizeScale = FontSizeScale.S,
                                readerFontFamily = ReaderFontFamily.MERRIWEATHER, readerTheme = ReaderTheme.fromKey(palette.value),
                                language = if (telugu.value) BibleLanguage.TELUGU else BibleLanguage.ENGLISH,
                                onVerseClick = {}, onCrossRefClick = {}, onEmptySpaceClick = {},
                                modifier = Modifier.padding(20.dp)
                            )
                            ReaderChapterNavigation(1, false, true, {}, { nextPressed = true }, {}, 0f)
                        }
                    }
                }
            }
        }
        for (name in listOf("white", "black", "dark", "sepia")) {
            for (isTelugu in listOf(false, true)) {
                compose.runOnIdle { palette.value = name; telugu.value = isTelugu }
                compose.onNodeWithContentDescription("Go back").performScrollTo()
                assertTextFits()
                val headingStyles = listOf("The creation", "Light and darkness").map { heading ->
                    val layouts = mutableListOf<TextLayoutResult>()
                    compose.onNodeWithText(heading).performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
                    layouts.single().layoutInput.style
                }
                assertEquals(headingStyles[0].fontSize, headingStyles[1].fontSize)
                assertEquals(headingStyles[0].lineHeight, headingStyles[1].lineHeight)
                assertEquals(headingStyles[0].fontWeight, headingStyles[1].fontWeight)
                screenshot("reader-compact-$name-${if (isTelugu) "te" else "en"}-150")
            }
        }
        compose.onNodeWithText("ఆదికాండము 1").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(navigatorOpened) }
        compose.onNodeWithContentDescription("Reading settings").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(settingsOpened) }
        compose.onNodeWithContentDescription("Reader actions").performClick()
        compose.onNodeWithText("Listen").assertIsDisplayed()
        compose.onNodeWithText("Immerse Reading").assertIsDisplayed().performClick()
        compose.onNodeWithContentDescription("Previous").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithContentDescription("Next").performClick()
        compose.runOnIdle { assertTrue(nextPressed) }
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
