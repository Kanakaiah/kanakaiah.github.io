package com.example.telugubible.ui.retention

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.RetentionBucket
import com.example.telugubible.data.model.RetentionUiState
import com.example.telugubible.data.model.HeadlineRetention
import com.example.telugubible.theme.RemoraTheme
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
class RetentionDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun intervalResultsIncludeCountsAndMissingDataAcrossThemes() {
        val theme = mutableStateOf("white")
        val buckets = listOf(RetentionBucket("1d", 1, 10, 8, 0.8), RetentionBucket("1w", 7, 2, 1, null))
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(theme.value) {
                    androidx.compose.foundation.layout.Box(Modifier.width(320.dp)) { ForgettingCurveChart(buckets) }
                }
            }
        }
        for (palette in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { theme.value = palette }
            compose.onNodeWithText("1d: 80% recalled · 10 reviews").assertIsDisplayed()
            compose.onNodeWithText("1w: Not enough reviews · 2 reviews").assertIsDisplayed()
        }
    }

    @Test fun overviewKeepsStatisticsSecondaryAndOffersColdCheck() {
        val state = RetentionUiState(isLoading = false, headline = HeadlineRetention(10, 8, 0.8),
            curve = listOf(RetentionBucket("1d", 1, 10, 8, 0.8)), coldAvailableCount = 2, needsShortening = true)
        var started = false
        var selectedScale = 1.0
        compose.setContent { RemoraTheme("white") {
            RetentionContent(state, {}, { selectedScale = it }, { started = true }, {}, {}, {}, {})
        } }
        compose.onNodeWithText("80%").assertIsDisplayed()
        compose.onNodeWithText("HOW LONG IT HOLDS").assertDoesNotExist()
        compose.onNodeWithText("Show detailed statistics").performScrollTo().performClick()
        compose.onNodeWithText("HOW LONG IT HOLDS").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Normal (selected)").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("15% shorter").performScrollTo().performClick()
        compose.runOnIdle { org.junit.Assert.assertEquals(0.85, selectedScale, 0.001) }
        compose.onNodeWithText("Hide detailed statistics").performScrollTo().performClick()
        compose.onNodeWithText("HOW LONG IT HOLDS").assertDoesNotExist()
        compose.onNodeWithText("Run a cold check").performScrollTo().performClick()
        compose.runOnIdle { org.junit.Assert.assertTrue(started) }
    }
}
