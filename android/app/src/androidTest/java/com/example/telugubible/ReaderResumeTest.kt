package com.example.telugubible

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test

/** Run after AppBaselineTest, a force-stop, and a fresh app launch. */
class ReaderResumeTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Test fun savedChapterSurvivesProcessRestart() {
        check(InstrumentationRegistry.getInstrumentation().targetContext.packageName.endsWith(".uitest"))
        compose.waitUntil(60_000) { compose.onAllNodesWithText("Continue reading").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Genesis 2").performScrollTo().performClick()
        compose.waitUntil(60_000) { compose.onAllNodesWithText("Genesis 2").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Genesis 2").assertIsDisplayed()
    }
}
