package com.example.telugubible.ui.practice

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [35])
class ImmersedReaderDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun maskedTextIsNotExposedAndControlsCanBeRestored() {
        val item = UserMemoryVerse(id = 1, bookId = 1, bookNameEn = "Genesis", chapter = 1, verse = 1,
            textEn = "In the <b>beginning</b> God created. Then came light.")
        var open by mutableStateOf(true)
        val palette = mutableStateOf("white")
        var stopped = 0
        var exposed: Set<Int> = emptySet()
        var total = 0
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    if (open) ImmersedReader(item, 0, 1, {}, {}, { open = false }, false, {}, { stopped++ },
                        onExposure = { indices, wordCount -> exposed = indices; total = wordCount },
                        readingSettings = AppSettings(recallMasking = true))
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("In the beginning God created.").assertDoesNotExist()
            compose.onNodeWithText("Reveal sentence 1").assertIsDisplayed()
        }
        compose.runOnIdle { assertTrue(exposed.isEmpty()) }
        compose.onNodeWithText("Reveal sentence 1").performClick()
        compose.runOnIdle { assertEquals(5, exposed.size); assertEquals(8, total) }
        compose.onNodeWithText("In the beginning God created.").assertIsDisplayed()
        compose.onNodeWithText("Hide controls").performClick()
        compose.onNodeWithText("Show controls").assertIsDisplayed().performClick()
        compose.onNodeWithContentDescription("Exit immersive reader").performClick()
        compose.runOnIdle { assertTrue(stopped > 0) }
    }

    @Test fun markupKeepsBoldVerseWordsAndBreaks() {
        val result = immersiveText("In the <b>beginning</b><br/>God &amp; light<S>123</S>")
        assertTrue(result.contains("beginning"))
        assertTrue(result.contains("\n"))
        assertTrue(result.contains("God & light"))
        assertFalse(result.contains("123"))
    }

    @Test fun wordMappingExcludesHeadingsAndKeepsRepeatedAndInlineWords() {
        val passage = practicePassage("<b>Creation story</b><br/>one one <b>bright</b> light.")
        assertEquals(listOf("one", "one", "bright", "light."), passage.practiceWords)
        assertEquals(listOf(emptySet<Int>(), emptySet(), setOf(0), setOf(1), setOf(2), setOf(3)), passage.displayedWordIndices)
        val adjacent = practicePassage("before<b>bold</b>after")
        assertEquals(listOf("beforeboldafter"), adjacent.practiceWords)
    }

    @Test fun unmaskedAndSpokenContentRegistersExposure() {
        val item = UserMemoryVerse(id = 1, bookId = 1, bookNameEn = "Genesis", chapter = 1, verse = 1, textEn = "One two three four.")
        var masked by mutableStateOf(true)
        var playing by mutableStateOf(false)
        var seen = emptySet<Int>()
        compose.setContent { RemoraTheme("white") {
            ImmersedReader(item, 0, 1, {}, {}, {}, playing, { playing = !playing }, {},
                onExposure = { indices, _ -> seen = indices }, readingSettings = AppSettings(recallMasking = masked))
        } }
        compose.runOnIdle { assertTrue(seen.isEmpty()); playing = true }
        compose.runOnIdle { assertEquals(setOf(0, 1, 2, 3), seen); seen = emptySet(); playing = false; masked = false }
        compose.runOnIdle { assertEquals(setOf(0, 1, 2, 3), seen) }
    }
}
