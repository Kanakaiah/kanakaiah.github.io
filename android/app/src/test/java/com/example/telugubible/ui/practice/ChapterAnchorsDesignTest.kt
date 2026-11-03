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
import com.example.telugubible.util.AnchorDirection
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
class ChapterAnchorsDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()
    @Test fun imageCueRevealAndBookSelectionWorkAcrossThemes() {
        val book = Book(1, "genesis", "Genesis", "ఆదికాండము", null, "OT", "Law", 50, "Creation")
        val anchor = AnchorDrillItem(1, "Genesis", "genesis", 1, "LIGHT", "God creates light.")
        val state = mutableStateOf(AnchorDrillUiState(queue = listOf(anchor), books = listOf(book), isLoading = false))
        val palette = mutableStateOf("white")
        var selected: Int? = null
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    AnchorDrillContent(state.value, { state.value = state.value.copy(direction = it, isRevealed = false) }, {}, {},
                        { state.value = state.value.copy(isRevealed = true) }, {}, {}, {}, Modifier.width(320.dp),
                        onSelectBook = { selected = it }, artwork = { _, description -> Text(description, Modifier.testTag("fake-art")) })
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme; state.value = state.value.copy(direction = AnchorDirection.N2W, isRevealed = false) }
            compose.onNodeWithText("LIGHT").assertDoesNotExist()
            compose.onNodeWithTag("fake-art").assertDoesNotExist()
            compose.onNodeWithText("Show anchor").performScrollTo().performClick()
            compose.onNodeWithText("LIGHT").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Chapter illustration").performScrollTo().assertIsDisplayed()
            compose.runOnIdle { state.value = state.value.copy(direction = AnchorDirection.P2W, isRevealed = false) }
            compose.onNodeWithText("LIGHT").assertDoesNotExist()
            compose.onNodeWithText("Chapter illustration cue").performScrollTo().assertIsDisplayed()
        }
        compose.onNodeWithText("Book: All books").performScrollTo().performClick()
        compose.onAllNodesWithText("Genesis").onLast().performClick()
        compose.runOnIdle { assertEquals(1, selected) }
    }
}
