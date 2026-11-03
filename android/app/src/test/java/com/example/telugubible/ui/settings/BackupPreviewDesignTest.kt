package com.example.telugubible.ui.settings

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.BackupPreview
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
class BackupPreviewDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun previewDisclosesScopeAndBlocksRepeatedRestoreAcrossThemes() {
        val preview = BackupPreview(1, 3, 2, 4, 0, 1, 5, 0, 0, true, true)
        var saving by mutableStateOf(false)
        var restoreCount = 0
        val theme = mutableStateOf("white")
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(theme.value) {
                    BackupPreviewDialog(preview, saving, null, {}, { restoreCount++; saving = true })
                }
            }
        }
        for (palette in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { theme.value = palette }
            compose.onNodeWithText("3 saved verses · 2 collections").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("This older backup may not contain verse ranges, book themes, chain details or session records. Missing information cannot be recovered from it.").performScrollTo().assertIsDisplayed()
        }
        compose.onNodeWithText("Restore backup").performScrollTo().performClick()
        compose.onNodeWithText("Restore backup").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Cancel").performScrollTo().assertIsNotEnabled()
        compose.runOnIdle { assertEquals(1, restoreCount) }
    }
}
