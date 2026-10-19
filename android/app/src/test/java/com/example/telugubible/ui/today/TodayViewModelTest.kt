package com.example.telugubible.ui.today

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
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class TodayViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var application: Application
    private lateinit var bibleDbHelper: BibleDatabaseHelper
    private lateinit var userDbHelper: UserDatabaseHelper
    private lateinit var repository: BibleRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        application = ApplicationProvider.getApplicationContext()
        application.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        application.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        val prefs = application.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE)
        prefs.edit().clear().commit()

        bibleDbHelper = BibleDatabaseHelper(application)
        userDbHelper = UserDatabaseHelper(application)
        repository = BibleRepository(bibleDbHelper, userDbHelper)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        bibleDbHelper.close()
        userDbHelper.close()
        application.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        application.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
    }

    @Test
    fun testVerseDetailModalSelectionAndPagination() = runTest(testDispatcher) {
        // Seed 3 verses
        repository.addUserVerse(1, 1, 1)
        repository.addUserVerse(1, 1, 2)
        repository.addUserVerse(1, 1, 3)
        advanceUntilIdle()

        val viewModel = TodayViewModel(application, repository)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(3, state.verses.size)
        assertNull("Initially no verse selected for detail", state.selectedVerseForDetail)

        // Select 1st verse
        viewModel.selectVerseForDetail(state.filteredVerses[0])
        advanceUntilIdle()
        assertEquals(1, viewModel.uiState.value.selectedVerseForDetail?.verse)

        // Next verse -> 2nd verse
        viewModel.selectNextVerse()
        advanceUntilIdle()
        assertEquals(2, viewModel.uiState.value.selectedVerseForDetail?.verse)

        // Next verse -> 3rd verse
        viewModel.selectNextVerse()
        advanceUntilIdle()
        assertEquals(3, viewModel.uiState.value.selectedVerseForDetail?.verse)

        // Next verse at boundary remains at 3rd verse
        viewModel.selectNextVerse()
        advanceUntilIdle()
        assertEquals(3, viewModel.uiState.value.selectedVerseForDetail?.verse)

        // Previous verse -> 2nd verse
        viewModel.selectPreviousVerse()
        advanceUntilIdle()
        assertEquals(2, viewModel.uiState.value.selectedVerseForDetail?.verse)

        // Dismiss modal
        viewModel.selectVerseForDetail(null)
        advanceUntilIdle()
        assertNull(viewModel.uiState.value.selectedVerseForDetail)
    }

    @Test
    fun testRemoveVerseClearsDetailModal() = runTest(testDispatcher) {
        repository.addUserVerse(43, 3, 16)
        advanceUntilIdle()

        val viewModel = TodayViewModel(application, repository)
        advanceUntilIdle()

        val verse = viewModel.uiState.value.filteredVerses.first()
        viewModel.selectVerseForDetail(verse)
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.selectedVerseForDetail)

        // Delete currently inspected verse
        viewModel.removeVerse(verse.id)
        advanceUntilIdle()

        assertNull("Detail modal should be closed upon deleting the verse", viewModel.uiState.value.selectedVerseForDetail)
        assertTrue(viewModel.uiState.value.verses.isEmpty())
    }
}
