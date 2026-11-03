package com.example.telugubible.ui.retention

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.ColdCheckCandidate
import com.example.telugubible.data.model.ColdCheckResult
import com.example.telugubible.data.model.RetentionUiState
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
class ColdCheckDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun promptAnswerSaveAndResultAcrossThemes() {
        val item = ColdCheckCandidate("verse:1", "verse", "Genesis 1:1", "In the beginning", 40)
        val state = mutableStateOf(RetentionUiState(isLoading = false, isColdCheckActive = true, coldCheckCandidates = listOf(item)))
        val palette = mutableStateOf("white")
        var closed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    ColdCheckDialog(state.value, { state.value = state.value.copy(coldCheckAnswerTyped = it) },
                        { state.value = state.value.copy(coldCheckRevealed = true) },
                        { state.value = state.value.copy(coldCheckSaving = true) }, { closed = true })
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Genesis 1:1").assertIsDisplayed()
            compose.onNodeWithText("In the beginning").assertDoesNotExist()
        }
        compose.onNodeWithText("Check answer").performScrollTo().performClick()
        compose.onNodeWithText("In the beginning").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Finish check").performScrollTo().performClick()
        compose.onNodeWithText("Saving check…").performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Close cold check").assertIsNotEnabled()
        compose.runOnIdle { state.value = state.value.copy(coldCheckSaving = false, coldCheckFinishedResult = ColdCheckResult(1, 0, 1, 40)) }
        compose.onNodeWithText("0 of 1 answers matched").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Done").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(closed) }
    }
}
