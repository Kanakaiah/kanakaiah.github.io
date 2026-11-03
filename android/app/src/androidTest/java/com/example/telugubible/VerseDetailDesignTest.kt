package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.today.VerseDetailSheet
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class VerseDetailDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun verseActionsCollectionsAndDeletionRemainDistinct() {
        val palette = mutableStateOf("white")
        var toggled = ""
        var languageChanged = false
        var practiced = false
        var deleted = false
        var closed = 0
        val verse = UserMemoryVerse(id = 42, bookId = 1, bookNameEn = "Genesis", bookNameTe = "ఆదికాండము",
            chapter = 1, verse = 1, textEn = "In the beginning.", textTe = "ఆదియందు", repetition = 2,
            interval = 3, topicIds = listOf("hope"))
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    VerseDetailSheet(verse, DisplayLanguage.ENGLISH, false, true, {}, {}, { languageChanged = true },
                        { closed++ }, { practiced = true }, onReadInChapter = {}, onDelete = { deleted = true },
                        topics = listOf(Topic("hope", "Hope")), onToggleTopic = { toggled = it })
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Genesis 1:1").assertIsDisplayed()
            compose.onNodeWithText("Practice").performScrollTo().assertIsDisplayed()
            compose.onNodeWithText("Hope").performScrollTo().assertIsSelected()
        }
        compose.onNodeWithText("Hope").performClick()
        compose.runOnIdle { assertEquals("hope", toggled) }
        compose.onNodeWithContentDescription("Change display language").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(languageChanged) }
        compose.onNodeWithText("Review details").performScrollTo().performClick()
        compose.onNodeWithText("Reviews: 2 · Interval: 3 days").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Delete verse").performScrollTo().performClick()
        compose.onNodeWithText("Cancel").performClick()
        compose.runOnIdle { assertFalse(deleted) }
        compose.onNodeWithText("Practice").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(practiced); assertEquals(1, closed) }
    }

    @Test fun boldTextIsPreservedAndMissingLanguageIsNotSubstituted() {
        val verse = mutableStateOf(UserMemoryVerse(id = 1, bookId = 1, bookNameEn = "Genesis", bookNameTe = "ఆదికాండము",
            chapter = 1, verse = 1, textEn = "In <b>the beginning</b> God created.", textTe = "ఆదియందు"))
        compose.setContent { RemoraTheme("white") {
            VerseDetailSheet(verse.value, DisplayLanguage.ENGLISH, false, false, {}, {}, {}, {}, {}, onReadInChapter = {}, onDelete = {})
        } }
        compose.onNodeWithText("In the beginning God created.").assertIsDisplayed()
        compose.runOnIdle { verse.value = verse.value.copy(textEn = null) }
        compose.onNodeWithText("English text unavailable").assertIsDisplayed()
        compose.onNodeWithText("ఆదియందు").assertDoesNotExist()
    }

    @Test fun readingNavigationAndDeleteConfirmationUseTheirOwnCallbacks() {
        var next = false
        var read = false
        var deleted = false
        var closed = 0
        val verse = UserMemoryVerse(id = 42, bookId = 1, bookNameEn = "Genesis", bookNameTe = "ఆదికాండము",
            chapter = 1, verse = 1, textEn = "In the beginning.")
        compose.setContent { RemoraTheme("white") {
            VerseDetailSheet(verse, DisplayLanguage.ENGLISH, false, true, {}, { next = true }, {}, { closed++ }, {},
                onReadInChapter = { read = true }, onDelete = { deleted = true })
        } }
        compose.onNodeWithContentDescription("Previous verse").assertIsNotEnabled()
        compose.onNodeWithContentDescription("Next verse").performClick()
        compose.onNodeWithText("Read chapter").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(next); assertTrue(read); assertEquals(1, closed) }
        compose.onNodeWithText("Delete verse").performScrollTo().performClick()
        compose.onAllNodesWithText("Delete verse").onLast().performClick()
        compose.runOnIdle { assertTrue(deleted); assertEquals(2, closed) }
    }
}
