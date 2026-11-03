package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.reader.PassageNavigator
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class PassageNavigatorTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun searchChapterVerseAndTranslationHaveDistinctActions() {
        val genesis = Book(1, "genesis", "Genesis", "ఆదికాండము", null, "OT", "Law", 50)
        val exodus = Book(2, "exodus", "Exodus", "నిర్గమకాండము", null, "OT", "Law", 40)
        var selectedChapter = 0
        var selectedVerse = 0
        var selectedBook = 0
        var selectedVersion = ""
        compose.setContent {
            RemoraTheme("white") {
                PassageNavigator(listOf(genesis, exodus), genesis, 1, "LSB",
                    { selectedVersion = it }, { _, chapter -> selectedChapter = chapter }, {},
                    listOf(1, 2, 3), { _, _, _ -> listOf(1, 2, 3) },
                    { chosenBook, chapter, verse -> selectedBook = chosenBook.id; selectedChapter = chapter; selectedVerse = verse })
            }
        }
        compose.onNodeWithText("Find a book").performTextInput("Exodus")
        compose.onNodeWithContentDescription("Choose Exodus").performClick()
        compose.onNodeWithText("2", useUnmergedTree = true).performClick()
        compose.onNodeWithContentDescription("Verse 3").performClick()
        compose.runOnIdle { assertEquals(2, selectedBook); assertEquals(2, selectedChapter); assertEquals(3, selectedVerse) }
        compose.onNodeWithText("Translation", useUnmergedTree = true).performClick()
        compose.onNodeWithText("WEB (World English)").performScrollTo().performClick()
        compose.runOnIdle { assertEquals("WEB", selectedVersion) }
    }
}
