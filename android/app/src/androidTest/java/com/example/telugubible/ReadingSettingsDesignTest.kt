package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.reader.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class ReadingSettingsDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun controlsPreviewAndAdvancedOptionsWorkAcrossThemesAtLargeText() {
        val size = mutableStateOf(FontSizeScale.S)
        val family = mutableStateOf(ReaderFontFamily.INTER)
        val spacing = mutableStateOf(LineSpacing.NORMAL)
        val theme = mutableStateOf(ReaderTheme.PAPER)
        val bionic = mutableStateOf(false)
        val intensity = mutableStateOf(BionicIntensity.MEDIUM)
        val numbers = mutableStateOf(true)
        var resets = 0
        var dismissed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(theme.value.toSettingKey()) {
                    SettingsSheet(size.value, family.value, spacing.value, theme.value, bionic.value, intensity.value, numbers.value,
                        { size.value = it }, { family.value = it }, { spacing.value = it }, { theme.value = it },
                        { bionic.value = it }, { intensity.value = it }, { numbers.value = it }, { resets++ }, { dismissed = true })
                }
            }
        }
        for (palette in ReaderTheme.entries) {
            compose.runOnIdle { theme.value = palette }
            compose.onNodeWithText("Scripture text size").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("XL").performScrollTo().performClick().assertIsSelected()
            compose.runOnIdle { assertEquals(FontSizeScale.XL, size.value) }
            compose.onNodeWithText("S").performScrollTo().performClick()
            compose.onNodeWithText("Advanced reading options").performScrollTo().performClick()
            compose.onNodeWithContentDescription("Bionic reading").performScrollTo().performClick()
            compose.onNodeWithText("Strong").performScrollTo().performClick().assertIsSelected()
            compose.runOnIdle { assertTrue(bionic.value); assertEquals(BionicIntensity.STRONG, intensity.value) }
            compose.onNodeWithContentDescription("Bionic reading").performScrollTo().performClick()
            compose.onNodeWithText("Hide advanced reading options").performScrollTo().performClick()
        }
        compose.onNodeWithText("Reset reading settings").performScrollTo().performClick()
        compose.onNodeWithText("Done").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1, resets); assertTrue(dismissed) }
    }
}
