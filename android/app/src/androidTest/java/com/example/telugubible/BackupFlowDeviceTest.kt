package com.example.telugubible

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class BackupFlowDeviceTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    @Before fun requireIsolatedApp() {
        check(InstrumentationRegistry.getInstrumentation().targetContext.packageName.endsWith(".uitest"))
        awaitNode(hasContentDescription("Settings"))
    }

    @Test fun invalidBackupIsRejectedAndValidBackupIsReviewedBeforeRestore() {
        compose.onNodeWithContentDescription("Settings").performClick()
        awaitNode(hasText("Data"))
        compose.onNodeWithText("Data").performClick()
        awaitNode(hasText("Restore from pasted JSON"))
        pasteBackup("{}")
        awaitNode(hasText("Backup unavailable"))
        compose.onNodeWithText("Close").performClick()
        pasteBackup("{\"verses\":[]}")
        awaitNode(hasText("0 saved verses · 0 collections"))
        compose.onNodeWithText("Restore backup").performScrollTo().assertIsEnabled().performClick()
        compose.waitUntil(15_000) { compose.onAllNodesWithText("Restore backup").fetchSemanticsNodes().isEmpty() }
    }

    private fun pasteBackup(json: String) {
        compose.onNodeWithText("Restore from pasted JSON").performScrollTo().performClick()
        awaitNode(hasText("Paste JSON here..."))
        compose.onNodeWithText("Paste JSON here...").performTextInput(json)
        compose.onNodeWithText("Review backup").performClick()
    }

    private fun awaitNode(matcher: SemanticsMatcher) {
        compose.waitUntil(15_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty() }
    }
}
