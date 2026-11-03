package com.example.telugubible.ui.practice

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.model.Book
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
class BookThemesDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun coverRemainsVisibleAndThemeIsHiddenUntilReveal() {
        val book = Book(1, "genesis", "Genesis", "ఆదికాండము", null, "OT", "Law", 50, "CREATION & FALL")
        val state = mutableStateOf(ThemeDrillUiState(queue = listOf(ThemeDrillItem(book, null)), isLoading = false))
        val palette = mutableStateOf("white")
        var skipped = 0
        var graded = 0
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    ThemeDrillContent(state.value, { state.value = state.value.copy(scope = it) }, { state.value = state.value.copy(isRevealed = true) },
                        { graded = it }, { skipped++ }, {}, {}, Modifier.width(320.dp), cover = { Text("Book cover", Modifier.testTag("cover")) })
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; state.value = state.value.copy(isRevealed = false) }
            compose.onNodeWithTag("cover").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("CREATION & FALL").assertDoesNotExist()
            compose.onNodeWithText("Skip without grading").performScrollTo().performClick()
            compose.onNodeWithText("Show theme").performScrollTo().performClick()
            compose.onNodeWithText("CREATION & FALL").performScrollTo().assertIsDisplayed()
            compose.onNodeWithTag("cover").performScrollTo().assertExists()
            compose.onNodeWithText("Good").performScrollTo().performClick()
        }
        compose.runOnIdle { assertEquals(4, skipped); assertEquals(4, graded) }
    }
}
