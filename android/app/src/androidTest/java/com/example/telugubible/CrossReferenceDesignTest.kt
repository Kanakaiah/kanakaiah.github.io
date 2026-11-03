package com.example.telugubible.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.data.model.VerseConnectionsData
import com.example.telugubible.data.model.StepBibleWord
import com.example.telugubible.data.model.StepBibleWordOccurrence
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.util.KjvVersification
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class CrossReferenceDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val source = KjvVersification.toVerseIndex(1, 1, 1)!!
    private val target = KjvVersification.toVerseIndex(43, 1, 1)!!
    private val reference = CrossReference(fromBookId = 1, fromChapter = 1, fromVerse = 1, toRef = "John 1:1", toBookId = 43, toChapter = 1, toVerse = 1, targetTextEn = "In the beginning was the Word", otherStartVid = target)

    @Test fun linkedVerseCanReturnAndReadInContextAcrossThemes() {
        val palette = mutableStateOf("white")
        val vid = mutableIntStateOf(source)
        var navigated: Triple<Int, Int, Int>? = null
        var filter = 4
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    val data = if (vid.intValue == source) VerseConnectionsData(source, 1, 1, 1, outgoing = listOf(reference)) else VerseConnectionsData(target, 43, 1, 1)
                    CrossReferenceSheet("Genesis 1:1", data.outgoing, BibleLanguage.ENGLISH, {}, { b, c, v -> navigated = Triple(b, c, v) }, connectionsData = data,
                        quoteTextEn = "In the beginning", onMinVotesChange = { filter = it }, onSelectVid = { vid.intValue = it })
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithText("Cross references").assertIsDisplayed()
            compose.onNodeWithText("→ References").performScrollTo().performClick()
            compose.onNodeWithText("John 1:1").assertDoesNotExist()
            compose.onNodeWithText("→ References").performScrollTo().performClick()
            compose.onNodeWithText("John 1:1").performScrollTo().performClick()
            compose.runOnIdle { assertEquals(target, vid.intValue) }
            compose.onNodeWithText("Back to previous verse").performClick()
            compose.runOnIdle { assertEquals(source, vid.intValue) }
        }
        compose.onAllNodesWithText("Read in context").onLast().performScrollTo().performClick()
        compose.runOnIdle { assertEquals(Triple(43, 1, 1), navigated) }
        compose.onNodeWithText("At least 4 votes").performClick()
        compose.runOnIdle { assertEquals(0, filter) }
    }

    @Test fun absentConnectionDoesNotOfferInventedSourceDestination() {
        compose.setContent { RemoraTheme("white") { CrossReferenceSheet("Unknown reference", emptyList(), BibleLanguage.ENGLISH, {}, { _, _, _ -> }) } }
        compose.onNodeWithText("Read in context").assertDoesNotExist()
        compose.onAllNodesWithText("None recorded.").assertCountEquals(2)
    }

    @Test fun originalWordExpandsAndOpensItsOccurrence() {
        val word = StepBibleWord(7, "H7225", "רֵאשִׁית", "reshith", "beginning", 4)
        val occurrence = StepBibleWordOccurrence(target, 43, 1, 1, "John 1:1", "In the beginning", null)
        var expanded = 0
        var selected = -1
        compose.setContent { RemoraTheme("white") {
            CrossReferenceSheet("Genesis 1:1", emptyList(), BibleLanguage.ENGLISH, {}, { _, _, _ -> },
                connectionsData = VerseConnectionsData(source, 1, 1, 1, originalWords = listOf(word)),
                wordOccurrencesMap = mapOf(7 to listOf(occurrence)), onExpandWord = { expanded = it }, onSelectVid = { selected = it })
        } }
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("רֵאשִׁית"))
        compose.onNodeWithText("רֵאשִׁית").performScrollTo().performClick()
        compose.onNodeWithText("John 1:1").performScrollTo().performClick()
        compose.runOnIdle { assertEquals(7, expanded); assertEquals(target, selected) }
    }
}
