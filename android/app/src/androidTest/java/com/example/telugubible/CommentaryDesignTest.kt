package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.bible.CommentarySheet
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class CommentaryDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun filtersBookAcrossThemesAtLargeText() {
        val palette = mutableStateOf("white")
        var dismissed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    CommentarySheet(bookId = 1, bookNameEn = "Genesis", onDismiss = { dismissed = true })
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Only Genesis").assertIsSelected()
            compose.onNodeWithText("Only Genesis").performClick().assertIsNotSelected()
            compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Exodus: Core Commentaries"))
            compose.onNodeWithText("Exodus: Core Commentaries").assertIsDisplayed()
            compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
            compose.onNodeWithText("Only Genesis").performClick().assertIsSelected()
            compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Genesis: Core Commentaries"))
            compose.onNodeWithText("Genesis: Core Commentaries").assertIsDisplayed()
            compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
        }
        compose.onNodeWithContentDescription("Close commentary").performClick()
        compose.runOnIdle { assertTrue(dismissed) }
    }
}
