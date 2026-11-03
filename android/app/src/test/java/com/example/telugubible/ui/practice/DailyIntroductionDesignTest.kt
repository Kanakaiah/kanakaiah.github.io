package com.example.telugubible.ui.practice

import android.content.ComponentName
import android.content.Context
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.util.SessionItem
import org.junit.Assert.assertEquals
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
class DailyIntroductionDesignTest {
    @get:Rule(order = 0) val registerActivity = TestRule { base, _ -> object : Statement() {
        override fun evaluate() {
            val context = ApplicationProvider.getApplicationContext<Context>()
            shadowOf(context.packageManager).addActivityIfNotPresent(ComponentName(context, ComponentActivity::class.java))
            base.evaluate()
        }
    } }
    @get:Rule(order = 1) val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun introductionShowsChapterCueAndActionAcrossThemes() {
        val item = SessionItem.Introduce(1, "Genesis", "genesis", 1, "Creation", "God creates the world.", "Beginning")
        val palette = mutableStateOf("white")
        var starts = 0
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    androidx.compose.foundation.layout.Box(Modifier.width(320.dp)) {
                        IntroduceCard(item, { starts++ }, artwork = { Text("Chapter illustration") })
                    }
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Chapter illustration").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Genesis 1 · Creation").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Follows: Beginning").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Start practice").performScrollTo().performClick()
        }
        compose.runOnIdle { assertEquals(4, starts) }
    }
}
