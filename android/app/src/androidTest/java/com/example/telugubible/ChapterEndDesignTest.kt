package com.example.telugubible.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class ChapterEndDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun answerAndIllustrationStayHiddenUntilRevealAndGradeIsExplicit() {
        val theme = mutableStateOf("white")
        val revealed = mutableStateOf(false)
        val saving = mutableStateOf(false)
        var grades = 0
        var dismissals = 0
        val anchor = ChapterAnchor(bookId = 1, chapter = 1, word = "LIGHT", scene = "God creates light.")
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(theme.value) {
                    EndOfChapterRecallCard("genesis", 1, anchor, revealed.value, saving.value, null,
                        { revealed.value = true }, { grades += it }, { dismissals++ })
                }
            }
        }
        for (palette in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { theme.value = palette; revealed.value = false }
            compose.onNodeWithText("LIGHT").assertDoesNotExist()
            compose.onNodeWithTag("chapter-recall-illustration").assertDoesNotExist()
            compose.onNodeWithText("Show answer").performClick()
            compose.onNodeWithText("LIGHT").assertIsDisplayed()
            compose.onNodeWithTag("chapter-recall-illustration").assertExists()
            compose.runOnIdle { assertEquals(0, grades) }
        }
        compose.onNodeWithText("Not now").performClick()
        compose.runOnIdle { assertEquals(1, dismissals); saving.value = true }
        compose.onNodeWithText("Saving…").assertIsNotEnabled()
        compose.runOnIdle { saving.value = false }
        compose.onNodeWithText("Mark recalled").performClick()
        compose.runOnIdle { assertEquals(4, grades) }
    }
}
