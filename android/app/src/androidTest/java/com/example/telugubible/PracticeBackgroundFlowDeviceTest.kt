package com.example.telugubible

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import androidx.lifecycle.Lifecycle
import com.example.telugubible.util.BackgroundListenService
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test

class PracticeBackgroundFlowDeviceTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun practiceAdvancesWhileBackgroundedAndReturnsToTheCurrentVerse() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        check(context.packageName.endsWith(".uitest"))
        compose.waitUntil(15_000) { compose.onAllNodesWithText("Start practice").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Start practice").performClick()
        compose.waitUntil(15_000) { compose.onAllNodesWithText("Mode:", substring = true).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Mode:", substring = true).performClick()
        compose.onNode(hasText("Listen") and hasClickAction()).performClick()
        compose.onNodeWithText("Listening options").performScrollTo().performClick()
        repeat(4) {
            if (compose.onAllNodesWithText("Repeat 1×").fetchSemanticsNodes().isEmpty()) {
                compose.onNodeWithText("Repeat ", substring = true).performScrollTo().performClick()
            }
        }
        compose.onNodeWithContentDescription("Play verse").performScrollTo().performClick()
        try {
            val first = runBlocking { withTimeout(10_000) { BackgroundListenService.state.first { it.playing && it.source == "practice" } } }
            compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
            runBlocking { withTimeout(30_000) { BackgroundListenService.state.first { it.playing && it.index > first.index } } }
            compose.runOnUiThread { BackgroundListenService.stop(context) }
            val stopped = runBlocking { withTimeout(5_000) { BackgroundListenService.state.first { !it.playing } } }
            compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
            compose.waitUntil(15_000) {
                compose.onAllNodes(hasText("${stopped.index + 1} of ", substring = true)).fetchSemanticsNodes().isNotEmpty()
            }
        } finally {
            compose.runOnUiThread { BackgroundListenService.stop(context) }
        }
    }
}
