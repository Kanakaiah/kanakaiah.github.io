package com.example.telugubible.ui.settings

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.BackupPreview
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class BackupDeviceTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun restorePreviewWorksWithLargeTextAcrossPalettes() {
        val palette = mutableStateOf("white")
        var saving by mutableStateOf(false)
        var restores = 0
        val preview = BackupPreview(1, 3, 2, 4, 0, 1, 5, 0, 0, true, true)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    BackupPreviewDialog(preview, saving, null, {}, { restores++; saving = true })
                }
            }
        }
        for (name in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = name }
            compose.onNodeWithText("3 saved verses · 2 collections").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("This older backup may not contain verse ranges, book themes, chain details or session records. Missing information cannot be recovered from it.").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Restore backup").performScrollTo().assertIsEnabled()
        }
        compose.onNodeWithText("Restore backup").performClick()
        compose.onNodeWithText("Restore backup").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Cancel").performScrollTo().assertIsNotEnabled()
        compose.runOnIdle { assertEquals(1, restores) }
    }
}
