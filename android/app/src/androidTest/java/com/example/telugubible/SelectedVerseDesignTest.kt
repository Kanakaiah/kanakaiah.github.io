package com.example.telugubible.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.Topic
import com.example.telugubible.theme.RemoraTheme
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class SelectedVerseDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun gapsStayVisibleAndMemoryOptionsWorkAcrossThemes() {
        val palette = mutableStateOf("white")
        val topics = mutableStateListOf(Topic("a", "Favorites"))
        var result: List<Any>? = null
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    MemorizeVersesSheet("Genesis", 1, listOf(1, 2, 4), topics,
                        { name, callback -> val topic = Topic("new", name); topics.add(topic); callback(topic) },
                        { combine, ids, start, keyword -> result = listOf(combine, ids, start, keyword) }, {})
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Genesis 1:1–2, 4").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Gaps remain separate passages.").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Save separately").performScrollTo().performClick().assertIsSelected()
            compose.onNodeWithText("Combine consecutive verses").performScrollTo().performClick().assertIsSelected()
        }
        compose.onNodeWithText("Favorites").performScrollTo().performClick().assertIsSelected()
        compose.onNodeWithText("First review tomorrow").performScrollTo().performClick().assertIsSelected()
        compose.onNodeWithText("Add 3 verses").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(listOf(true, listOf("a"), false, ""), result) }
    }

    @Test fun newCollectionMustFinishBeforeSaving() {
        var finish: ((Topic?) -> Unit)? = null
        compose.setContent { RemoraTheme("white") {
            MemorizeVersesSheet("Genesis", 1, listOf(1), emptyList(), { _, callback -> finish = callback }, { _, _, _, _ -> }, {})
        } }
        compose.onNodeWithText("New collection").performScrollTo().performClick()
        compose.onNodeWithText("Collection name").performTextInput("Study")
        compose.onNodeWithText("Create collection").performScrollTo().performClick()
        compose.onNodeWithText("Add verse").performScrollTo().assertIsNotEnabled()
        compose.runOnIdle { finish?.invoke(Topic("study", "Study")) }
        compose.onNodeWithText("Add verse").performScrollTo().assertIsEnabled()
    }
}
