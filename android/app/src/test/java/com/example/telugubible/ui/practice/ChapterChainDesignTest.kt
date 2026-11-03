package com.example.telugubible.ui.practice

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.ChapterAnchor
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
class ChapterChainDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun eachLinkGradesOnceAndCompletionWaitsForSave() {
        val anchors = listOf(ChapterAnchor(bookId = 1, chapter = 1, word = "LIGHT", scene = "Light"), ChapterAnchor(bookId = 1, chapter = 2, word = "GARDEN", scene = "Garden"))
        val saving = mutableStateOf(false)
        val interval = mutableStateOf<Int?>(null)
        var saved = emptyList<Pair<Int, Boolean>>()
        var calls = 0
        var closed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme("white") {
                    ChainDrill(1, 0, "Beginnings", anchors, { closed = true }, { saved = it; calls++; saving.value = true }, interval.value,
                        Modifier.width(320.dp), isSaving = saving.value)
                }
            }
        }
        compose.onNodeWithText("LIGHT").assertDoesNotExist()
        compose.onNodeWithText("What comes next?").performClick()
        compose.onNodeWithText("Had it").performClick()
        compose.onNodeWithText("What comes next?").performClick()
        compose.onNodeWithText("Missed").performClick()
        compose.onNodeWithText("Saving review…").assertIsDisplayed()
        compose.onNodeWithText("Done").assertIsNotEnabled()
        compose.runOnIdle { assertEquals(listOf(1 to true, 2 to false), saved); assertEquals(1, calls); saving.value = false; interval.value = 7 }
        compose.onNodeWithText("Next chain review", substring = true).assertIsDisplayed()
        compose.onNodeWithText("Done").performClick()
        compose.runOnIdle { assertTrue(closed) }
    }
}
