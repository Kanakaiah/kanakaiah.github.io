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
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.today.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import java.io.File

class TodayDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun emptyLibraryInvitesAddingVerses() {
        var added = false
        compose.setContent {
            RemoraTheme("white") {
                ReviewHeroCard(0, 0, emptyList(), null, ReviewOrder.WEAKEST,
                    {}, {}, { error("An empty library should not launch a review") }, { added = true })
            }
        }
        compose.onNodeWithText("A small beginning").assertIsDisplayed()
        compose.onNodeWithText("Add verses").performClick()
        compose.runOnIdle { assertTrue(added) }
    }

    @Test fun compactLargeTextPalettesPreserveFiltersAndTeluguReading() {
        val palette = mutableStateOf("white")
        var chosen: String? = null
        var launched: String? = null
        val collection = CollectionCardItem("hope", "Words of hope for every day", 12, 3, 0)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    Surface(Modifier.width(320.dp)) {
                        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(24.dp)) {
                            var selected by remember { mutableStateOf<String?>(null) }
                            var order by remember { mutableStateOf(ReviewOrder.WEAKEST) }
                            TodayHeader(0, {}, {})
                            ReviewHeroCard(7, 12, listOf(collection), selected, order,
                                { selected = it; chosen = it }, { order = it }, { launched = it }, {})
                            ReadingCard(Book(1, "GEN", "Genesis", "ఆదికాండము", null, "OT", "law", 50),
                                1, "TELIRV", false, {})
                        }
                    }
                }
            }
        }
        listOf("white", "black", "dark", "sepia").forEach { name ->
            compose.runOnIdle { palette.value = name }
            compose.onNodeWithText("Today").performScrollTo()
            screenshot("today-compact-$name-150")
            assertTextFits()
        }
        compose.onNodeWithText("Review options").performScrollTo().performClick()
        compose.onNodeWithText("Collection: All").performScrollTo().performClick()
        compose.onNodeWithText(collection.name).performClick()
        compose.onNodeWithText("Order: Weakest").performScrollTo().performClick()
        compose.onNodeWithText("Canonical").performClick()
        compose.onNodeWithText("3 verses ready").assertExists()
        compose.onNodeWithText("Order: Canonical").assertExists()
        assertTextFits()
        compose.onNodeWithText("Start practice").performScrollTo().performClick()
        compose.runOnIdle { assertEquals("hope", chosen); assertEquals("hope", launched) }
        compose.onNodeWithText("ఆదికాండము 1").performScrollTo().assertIsDisplayed()
        assertTextFits()
        screenshot("today-compact-telugu-150")
    }

    private fun assertTextFits() {
        compose.onAllNodes(hasText("", substring = true), useUnmergedTree = true)
            .fetchSemanticsNodes().forEach { node ->
                val layouts = mutableListOf<TextLayoutResult>()
                if (node.config.contains(SemanticsActions.GetTextLayoutResult)) {
                    node.config[SemanticsActions.GetTextLayoutResult].action?.invoke(layouts)
                }
                layouts.forEach { layout ->
                    // Layout coordinates are floats; raster bounds are integer pixels.
                    // Check visible line extents with one pixel of rounding tolerance.
                    val clipped = layout.multiParagraph.height > layout.size.height + 1f ||
                        (0 until layout.lineCount).any { line ->
                            layout.isLineEllipsized(line) || layout.getLineLeft(line) < -1f ||
                                layout.getLineRight(line) > layout.size.width + 1f
                        }
                    assertFalse("Clipped text: ${layout.layoutInput.text}; size=${layout.size}; paragraph=${layout.multiParagraph.width} x ${layout.multiParagraph.height}", clipped)
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
