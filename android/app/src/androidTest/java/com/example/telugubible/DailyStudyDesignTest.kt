package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.practice.AnchorCard
import com.example.telugubible.ui.practice.ThemeCard
import com.example.telugubible.util.*
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class DailyStudyDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun anchorFeedbackKeepsExistingScores() {
        val verdict = mutableStateOf(AnchorVerdict.CORRECT)
        var score = 0
        val item = SessionItem.Anchor(1, "Genesis", "genesis", 1, "LIGHT", "Creation", AnchorDirection.N2W,
            emptyList(), false, 0, 0, 0L)
        compose.setContent { RemoraTheme("white") {
            AnchorCard(item, "LIGHT", true, AnchorJudgement(verdict.value, 0), {}, {}, { score = it })
        } }
        listOf(AnchorVerdict.CORRECT to 5, AnchorVerdict.NEAR to 4, AnchorVerdict.WRONG to 2).forEach { (value, expected) ->
            compose.runOnIdle { verdict.value = value }
            compose.onNodeWithText("Continue").performScrollTo().performClick()
            compose.runOnIdle { assertEquals(expected, score) }
        }
    }

    @Test fun bookThemeStaysHiddenUntilRevealAndRecordsGood() {
        var revealed by mutableStateOf(false)
        var score = 0
        val item = SessionItem.Theme(1, "Genesis", "genesis", "Beginnings", "Creation", "The first book", 0L)
        compose.setContent { RemoraTheme("white") { ThemeCard(item, revealed, { revealed = true }, { score = it }) } }
        compose.onNodeWithText("Beginnings").assertDoesNotExist()
        compose.onNodeWithText("Tap to reveal").performScrollTo().performClick()
        compose.onNodeWithText("Beginnings").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Continue records Good.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Continue").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(4, score) }
    }
}
