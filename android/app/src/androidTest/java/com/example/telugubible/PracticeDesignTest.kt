package com.example.telugubible

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.practice.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import java.io.File

class PracticeDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun compactReviewSupportsLargeTextPalettesAndGradeLimits() {
        val palette = mutableStateOf("white")
        val telugu = mutableStateOf(false)
        var grade = 0
        var exited = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    Surface(Modifier.width(320.dp)) {
                        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            PracticeHeader("Verse practice", "A collection with a longer name", 2, 12, { exited = true })
                            Text(if (telugu.value) "ఆదికాండము 1:1" else "Genesis 1:1")
                            PracticeModePicker(PracticeMode.READ, {})
                            ReviewAnswer(if (telugu.value) "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను." else "In the beginning God created the heaven and the earth.", null, null)
                            ReviewGrades(3, { grade = it })
                        }
                    }
                }
            }
        }
        for (name in listOf("white", "black", "dark", "sepia")) {
            for (isTelugu in listOf(false, true)) {
                compose.runOnIdle { palette.value = name; telugu.value = isTelugu }
                compose.onNodeWithText("Easy").performScrollTo().assertIsNotEnabled()
                compose.onNodeWithText("Good").assertIsNotEnabled()
                assertTextFits()
                screenshot("practice-compact-$name-${if (isTelugu) "te" else "en"}-150")
            }
        }
        compose.onNodeWithText("Hard").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(3, grade) }
        compose.onNodeWithContentDescription("Exit to Today").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(exited) }
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
