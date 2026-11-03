package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.commentary.PreachersData
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.bible.PreacherCard
import com.example.telugubible.ui.bible.PreachersSheet
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class PreachersDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun eraSelectionWorksAcrossThemesAtLargeText() {
        val palette = mutableStateOf("white")
        var dismissed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) { PreachersSheet(onDismiss = { dismissed = true }) }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Early Church").assertIsSelected()
            compose.onNodeWithText("Ignatius of Antioch").assertIsDisplayed()
            compose.onNodeWithText("Medieval").performClick().assertIsSelected()
            compose.onNodeWithText("Anselm of Canterbury").assertIsDisplayed()
            compose.onNodeWithText("Early Church").performClick()
        }
        compose.onNodeWithContentDescription("Close preachers").performClick()
        compose.runOnIdle { assertTrue(dismissed) }
    }

    @Test fun resourceOpensItsOriginalUrl() {
        val entry = PreachersData.ERAS.first().entries.first()
        var opened = ""
        compose.setContent { RemoraTheme("white") { PreacherCard(entry, onOpenUrl = { opened = it }) } }
        compose.onNodeWithText(entry.resources.first().title).performClick()
        compose.runOnIdle { assertEquals(entry.resources.first().url, opened) }
    }
}
