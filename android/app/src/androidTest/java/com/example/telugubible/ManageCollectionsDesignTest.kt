package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.today.ManageCollectionsContent
import com.example.telugubible.ui.today.CollectionVersesSheet
import com.example.telugubible.ui.today.CollectionCardItem
import com.example.telugubible.ui.today.AddVerseSheet
import com.example.telugubible.ui.today.NewCollectionDialog
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class ManageCollectionsDesignTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun createRenameAndDeleteRequireExplicitAction() {
        val palette = mutableStateOf("white")
        var created = ""
        var renamed = ""
        var deleted = ""
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    ManageCollectionsContent(listOf(Topic("hope", "Hope")), {}, { created = it },
                        { id, name -> renamed = "$id:$name" }, { deleted = it }, Modifier.width(320.dp))
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            compose.onNodeWithContentDescription("Edit Hope").assertIsDisplayed()
            compose.onNodeWithContentDescription("Delete Hope").assertIsDisplayed()
        }
        compose.onNodeWithText("New collection name").performTextInput("  HOPE  ")
        compose.onNodeWithText("A collection with this name already exists.").assertIsDisplayed()
        compose.onNodeWithText("Add collection").assertIsNotEnabled()
        compose.onNodeWithText("New collection name").performTextClearance()
        compose.onNodeWithText("New collection name").performTextInput("  Prayer  ")
        compose.onNodeWithText("Add collection").performClick()
        compose.runOnIdle { assertEquals("Prayer", created) }
        compose.onNodeWithContentDescription("Edit Hope").performClick()
        compose.onNodeWithText("Collection name").performTextClearance()
        compose.onNodeWithText("Collection name").performTextInput("Mercy")
        compose.onNodeWithText("Save").performClick()
        compose.runOnIdle { assertEquals("hope:Mercy", renamed) }
        compose.onNodeWithContentDescription("Delete Hope").performClick()
        compose.onNodeWithText("This also permanently deletes verses that belong only to this collection. Verses in other collections are kept.").assertIsDisplayed()
        compose.onNodeWithText("Cancel").performClick()
        compose.runOnIdle { assertEquals("", deleted) }
        compose.onNodeWithContentDescription("Delete Hope").performClick()
        compose.onNodeWithText("Delete collection").performClick()
        compose.runOnIdle { assertEquals("hope", deleted) }
    }

    @Test fun collectionAndVerseDeletionRequireConfirmation() {
        var collectionDeletes = 0
        var removedVerse = 0L
        val verse = UserMemoryVerse(id = 42L, bookId = 1, bookNameEn = "Genesis", bookNameTe = "ఆదికాండము",
            chapter = 1, verse = 1, textEn = "In the beginning.")
        compose.setContent { RemoraTheme("white") {
            CollectionVersesSheet(CollectionCardItem("hope", "Hope", 1, 1, 0), listOf(verse),
                DisplayLanguage.ENGLISH, true, {}, {}, {}, { collectionDeletes++ }, {}, { removedVerse = it })
        } }
        compose.onNodeWithContentDescription("Delete collection").performClick()
        compose.onNodeWithText("Cancel").performClick()
        compose.runOnIdle { assertEquals(0, collectionDeletes) }
        compose.onNodeWithContentDescription("Delete collection").performClick()
        compose.onNodeWithText("Delete collection").performClick()
        compose.runOnIdle { assertEquals(1, collectionDeletes) }
        compose.onNodeWithContentDescription("Remove verse").performClick()
        compose.onNodeWithText("This deletes the saved verse from your library and all its collections.").assertIsDisplayed()
        compose.onNodeWithText("Cancel").performClick()
        compose.runOnIdle { assertEquals(0L, removedVerse) }
        compose.onNodeWithContentDescription("Remove verse").performClick()
        compose.onNodeWithText("Delete verse").performClick()
        compose.runOnIdle { assertEquals(42L, removedVerse) }
    }

    @Test fun collectionContentsExposeDistinctActions() {
        var opened = 0L
        var reviewed = false
        var addOpened = false
        val verse = UserMemoryVerse(id = 42L, bookId = 1, bookNameEn = "Genesis", bookNameTe = "ఆదికాండము",
            chapter = 1, verse = 1, textEn = "In the beginning.")
        compose.setContent { RemoraTheme("white") {
            CollectionVersesSheet(CollectionCardItem("hope", "Hope", 1, 1, 0), listOf(verse),
                DisplayLanguage.ENGLISH, true, {}, { reviewed = true }, { addOpened = true }, {}, { opened = it.id }, {})
        } }
        compose.onNode(hasText("Genesis 1:1") and hasClickAction()).performClick()
        compose.onNodeWithText("Practice").performClick()
        compose.onNodeWithText("Add verses").performClick()
        compose.runOnIdle { assertEquals(42L, opened); assertTrue(reviewed); assertTrue(addOpened) }
    }

    @Test fun addVerseFromCollectionKeepsItsAssignment() {
        var assigned: List<String>? = null
        var addedReference = ""
        compose.setContent { RemoraTheme("white") {
            AddVerseSheet(books = emptyList(), topics = listOf(Topic("hope", "Hope")), searchResults = emptyList(),
                isSearching = false, onDismiss = {}, onAddSingleVerse = { _, _, _, _, _ -> },
                onAddIndividually = { _, _ -> }, onAddManualVerse = { reference, ids -> addedReference = reference; assigned = ids },
                onAddCollection = { _, _ -> }, onSearchVerses = { _, _ -> }, onNavigateToGuides = {},
                initialTopicIds = setOf("hope"))
        } }
        compose.onNodeWithText("Hope").assertIsSelected()
        compose.onNodeWithText("Translation Version").assertDoesNotExist()
        compose.onNodeWithText("Verse Text").assertDoesNotExist()
        compose.onNodeWithText("Reference").performScrollTo().performTextInput("Genesis 1:1")
        compose.waitUntil(10_000) { compose.onAllNodesWithTag("add-verse-compact-header").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("manual-entry-list").performScrollToIndex(2)
        compose.waitForIdle()
        compose.onNodeWithText("Add Verse").assertIsDisplayed().assertIsEnabled().performClick()
        compose.runOnIdle { assertEquals("Genesis 1:1", addedReference); assertEquals(listOf("hope"), assigned) }
    }

    @Test fun longCollectionNameAndActionsFitAtLargeTextInEveryTheme() {
        val palette = mutableStateOf("white")
        val longName = "Encouragement and strength for difficult days"
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 1.5f)) {
                RemoraTheme(palette.value) {
                    CollectionVersesSheet(CollectionCardItem("long", longName, 0, 0, 0), emptyList(),
                        DisplayLanguage.ENGLISH, true, {}, {}, {}, {}, {}, {})
                }
            }
        }
        for (theme in listOf("white", "black", "dark", "sepia")) {
            compose.runOnIdle { palette.value = theme }
            val layouts = mutableListOf<TextLayoutResult>()
            compose.onNodeWithText(longName).performSemanticsAction(SemanticsActions.GetTextLayoutResult) { it(layouts) }
            val layout = layouts.single()
            assertFalse((0 until layout.lineCount).any { layout.isLineEllipsized(it) || layout.getLineRight(it) > layout.size.width + 1f })
            compose.onNodeWithText("Practice").assertIsDisplayed()
            compose.onNodeWithText("Add verses").assertIsDisplayed()
            compose.onNodeWithText("No verses in this collection yet.").assertIsDisplayed()
        }
    }

    @Test fun newCollectionValidatesNamesAndSupportsSuggestions() {
        var created = ""
        var preset = ""
        var dismissed = 0
        compose.setContent { RemoraTheme("white") {
            NewCollectionDialog(listOf(PresetCollection("top_100", "Top 100", "", 100)), listOf("Hope"),
                { dismissed++ }, { created = it }, { preset = it })
        } }
        compose.onNodeWithText("Create collection").assertIsNotEnabled()
        compose.onNodeWithText("Collection name").performTextInput("  hope ")
        compose.onNodeWithText("A collection with this name already exists.").assertExists()
        compose.onNodeWithText("Create collection").assertIsNotEnabled()
        compose.onNodeWithText("Collection name").performTextClearance()
        compose.onNodeWithText("Collection name").performTextInput("  Prayer  ")
        compose.onNodeWithText("Create collection").performClick()
        compose.runOnIdle { assertEquals("Prayer", created); assertEquals(1, dismissed) }
        compose.onNodeWithText("Use a suggested collection").performClick()
        compose.onNodeWithText("Top 100").performScrollTo().performClick()
        compose.runOnIdle { assertEquals("top_100", preset); assertEquals(2, dismissed) }
    }
}
