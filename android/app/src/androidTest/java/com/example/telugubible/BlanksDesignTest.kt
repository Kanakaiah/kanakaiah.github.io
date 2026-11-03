package com.example.telugubible.ui.practice

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class BlanksDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun changingSameWordTwiceUpdatesCountAndGradeAcrossThemes() {
        val palette = mutableStateOf("white")
        val reset = mutableIntStateOf(0)
        var ratio = -1f
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { key(reset.intValue) {
                    EraserMode("God is love always", { ratio = it }, Modifier.width(320.dp).height(650.dp))
                } }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; reset.intValue++ }
            compose.onNodeWithContentDescription("Amount of text hidden").performSemanticsAction(SemanticsActions.SetProgress) { it(100f) }
            compose.onNodeWithText("4/4 hidden", substring = true).assertIsDisplayed()
            compose.onAllNodesWithContentDescription("Hidden word, tap to reveal").onFirst().performClick()
            compose.onNodeWithText("3/4 hidden", substring = true).assertIsDisplayed()
            val visibleWord = listOf("God", "is", "love", "always").first { compose.onAllNodesWithText(it).fetchSemanticsNodes().isNotEmpty() }
            compose.onNodeWithText(visibleWord).performClick()
            compose.onNodeWithText("4/4 hidden", substring = true).assertIsDisplayed()
            compose.onNodeWithText("Done Reciting — Check Recall").performClick()
            compose.runOnIdle { assertEquals(1f, ratio) }
        }
    }
}
