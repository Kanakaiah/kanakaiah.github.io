package com.example.telugubible.ui.settings

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.AppSettings
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
class SettingsDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun groupedSettingsRemainUsableAtLargeTextAcrossThemes() {
        var category by mutableStateOf(SettingsCategory.APPEARANCE)
        var settings by mutableStateOf(AppSettings(theme = "white", fontFamily = "serif", bibleVersion = "IRV-TE"))
        val palette = mutableStateOf("white")
        var preset = ""
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    Column(Modifier.width(320.dp).fillMaxHeight().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SettingsCategoryTabs(category) { category = it }
                        SettingsCategoryContent(category, settings, { transform -> settings = transform(settings) }, { preset = it })
                    }
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; category = SettingsCategory.APPEARANCE }
            compose.onNodeWithText("Theme").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Paper").performScrollTo().assertIsSelected()
            compose.runOnIdle { category = SettingsCategory.READING }
            compose.onNodeWithText("Scripture size").performScrollTo().assertIsDisplayed()
            compose.runOnIdle { category = SettingsCategory.PRACTICE }
            compose.onNodeWithText("Recall masking").performScrollTo().assertIsDisplayed()
        }
        compose.runOnIdle { category = SettingsCategory.APPEARANCE }
        compose.onAllNodesWithText("Reading").onFirst().performScrollTo().performClick()
        compose.onNodeWithText("Scripture size").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Merriweather").performScrollTo().assertIsSelected()
        compose.onNodeWithText("Roomy").performScrollTo().performClick()
        compose.runOnIdle { assertEquals("roomy", settings.lineSpacing) }
        compose.onNodeWithText("Clean").performScrollTo().performClick()
        compose.runOnIdle { assertEquals("clean", preset) }
        compose.onNodeWithText("Telugu").performScrollTo().assertIsSelected()
        compose.onNodeWithText("Practice").performScrollTo().performClick()
        compose.onNodeWithText("Recall masking").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(settings.recallMasking) }
        compose.onNodeWithText("Saved for compatibility; this switch is not currently applied to playback.").performScrollTo().assertIsDisplayed()
    }

    @Test fun cleanPresetMatchesActualSavedFlags() {
        val base = AppSettings()
        assertEquals("study", readingPreset(base))
        assertEquals("clean", readingPreset(base.copy(showSectionHeadings = false, showVerseNumbers = false, showParagraphMarks = false, showCrossRefMarkers = false)))
        assertEquals("custom", readingPreset(base.copy(showSectionHeadings = false)))
    }
}
