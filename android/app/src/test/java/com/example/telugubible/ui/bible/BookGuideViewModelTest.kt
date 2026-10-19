package com.example.telugubible.ui.bible

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class BookGuideViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var context: Context
    private lateinit var bibleDbHelper: BibleDatabaseHelper
    private lateinit var userDbHelper: UserDatabaseHelper
    private lateinit var repository: BibleRepository
    private lateinit var viewModel: BookGuideViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        context = ApplicationProvider.getApplicationContext()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        val prefs = context.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()

        bibleDbHelper = BibleDatabaseHelper(context)
        userDbHelper = UserDatabaseHelper(context)
        repository = BibleRepository(bibleDbHelper, userDbHelper, testDispatcher)
        viewModel = BookGuideViewModel(context as Application, repository)
    }

    @After
    fun tearDown() {
        if (::bibleDbHelper.isInitialized) bibleDbHelper.close()
        if (::userDbHelper.isInitialized) userDbHelper.close()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        Dispatchers.resetMain()
    }

    @Test
    fun testLoadBookGuide() = runTest(testDispatcher) {
        viewModel.loadBookGuide(1)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertNotNull(state.book)
        assertEquals("Genesis", state.book?.nameEn)
        assertNotNull(state.guide)
        assertEquals("genesis", state.guide?.bookKey)
        assertEquals(4, state.guide?.blocks?.size)
        assertEquals(50, state.guide?.anchors?.size)
        assertTrue(state.guide!!.keyVerses.isNotEmpty())
    }

    @Test
    fun testRevealAndCollapseToggles() = runTest(testDispatcher) {
        viewModel.loadBookGuide(1)
        advanceUntilIdle()

        // Toggle anchor 1
        assertFalse(viewModel.uiState.value.revealedAnchors.contains(1))
        viewModel.toggleAnchorReveal(1)
        assertTrue(viewModel.uiState.value.revealedAnchors.contains(1))
        viewModel.toggleAnchorReveal(1)
        assertFalse(viewModel.uiState.value.revealedAnchors.contains(1))

        // Toggle show all
        assertFalse(viewModel.uiState.value.showAllAnchors)
        viewModel.toggleShowAllAnchors()
        assertTrue(viewModel.uiState.value.showAllAnchors)

        // Toggle block collapse
        assertFalse(viewModel.uiState.value.collapsedBlocks.contains(0))
        viewModel.toggleBlockCollapse(0)
        assertTrue(viewModel.uiState.value.collapsedBlocks.contains(0))
    }

    @Test
    fun testGradeAnchor() = runTest(testDispatcher) {
        viewModel.loadBookGuide(1)
        advanceUntilIdle()

        viewModel.gradeAnchor(1, 4)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.gradedAnchorsOnThisPass[1])
        assertNotNull(state.chapterProgress[1])
        assertEquals(1, state.chapterProgress[1]?.repetition)
    }

    @Test
    fun testAddKeyVerseToLibrary() = runTest(testDispatcher) {
        viewModel.loadBookGuide(1)
        advanceUntilIdle()

        val added = viewModel.addKeyVerseToLibrary("Genesis 1:1")
        advanceUntilIdle()

        assertTrue(added)
        assertTrue(viewModel.uiState.value.userVerseKeys.contains(Triple(1, 1, 1)))
        assertEquals("Added Genesis 1:1 to your memory library!", viewModel.uiState.value.toastMessage)
    }
}
