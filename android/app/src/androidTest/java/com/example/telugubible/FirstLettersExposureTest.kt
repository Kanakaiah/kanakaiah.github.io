package com.example.telugubible.ui.practice

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class FirstLettersExposureTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun seenWordsStillCountAfterHintsAreHidden() {
        val palette = mutableStateOf("white")
        val reset = mutableIntStateOf(0)
        var ratio = -1f
        var recorded = emptySet<Int>()
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { key(reset.intValue) {
                    FirstLetterMode("God is love always", { ratio = it }, Modifier.width(320.dp).height(600.dp), onSeenChanged = { seen, _ -> recorded = seen })
                } }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; reset.intValue++ }
            repeat(5) { compose.onNodeWithContentDescription("Hint").performClick() }
            compose.onNodeWithText("4 of 4 words seen", substring = true).assertIsDisplayed()
            compose.onNodeWithText("G__").assertExists()
            compose.onNodeWithText("Done Reciting — Check Recall").performClick()
            compose.runOnIdle { assertEquals(1f, ratio); assertEquals(setOf(0, 1, 2, 3), recorded) }
        }
    }
}
