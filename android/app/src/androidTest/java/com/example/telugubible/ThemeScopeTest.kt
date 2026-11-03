package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.example.telugubible.theme.*
import org.junit.Rule
import org.junit.Test

class ThemeScopeTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun nestedThemeDoesNotChangeParentColorsAndUpdatesOnRecomposition() {
        val theme = mutableStateOf("black")
        compose.setContent {
            RemoraTheme(theme.value) {
                Column {
                    Text("parent-before:${RemoraBackground.value}")
                    RemoraTheme("sepia") {
                        Text("child:${RemoraBackground.value}")
                    }
                    Text("parent-after:${RemoraBackground.value}")
                }
            }
        }
        fun assertColors(parent: RemoraColors) {
            compose.onNodeWithText("parent-before:${parent.background.value}").assertExists()
            compose.onNodeWithText("parent-after:${parent.background.value}").assertExists()
            compose.onNodeWithText("child:${RemoraColors.Sepia.background.value}").assertExists()
        }
        assertColors(RemoraColors.Midnight)
        compose.runOnIdle { theme.value = "white" }
        assertColors(RemoraColors.Paper)
    }
}
