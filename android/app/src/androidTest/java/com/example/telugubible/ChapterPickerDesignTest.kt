package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.today.ChapterThemeBookPickerContent
import com.example.telugubible.util.BookMasteryCounts
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class ChapterPickerDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val genesis = Book(1,"genesis","Genesis","ఆదికాండము",null,"OT","Law",50)
    private val matthew = Book(40,"matthew","Matthew","మత్తయి",null,"NT","Gospels",28)

    @Test fun filtersSearchProgressAndSelect() {
        var selected = 0
        compose.setContent { RemoraTheme("white") {
            ChapterThemeBookPickerContent(listOf(genesis,matthew),
                mapOf(1 to BookMasteryCounts(1,50,38,0,0,12,4,24.0)),mapOf(1 to 4),"LSB",{}, { selected=it })
        } }
        compose.onNodeWithText("12 of 50 chapters learned").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("4 due").assertExists()
        compose.onNodeWithText("New Testament").performScrollTo().performClick()
        compose.onNodeWithText("Matthew").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Search all books").performScrollTo().performTextInput("Genesis")
        compose.onNodeWithText("Searching the whole Bible").assertExists()
        compose.onNode(hasText("Genesis") and hasText("Practice chapters")).performScrollTo().performClick()
        compose.runOnIdle { assertEquals(1,selected) }
        compose.onNodeWithContentDescription("Clear search").performScrollTo().performClick()
        compose.onNodeWithText("Matthew").performScrollTo().assertExists()
    }
}
