package com.example.telugubible.ui.retention

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.ColdCheckCandidate
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class RetentionViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var context: Context
    private lateinit var bibleDbHelper: BibleDatabaseHelper
    private lateinit var userDbHelper: UserDatabaseHelper
    private lateinit var repository: BibleRepository
    private lateinit var viewModel: RetentionViewModel

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
        viewModel = RetentionViewModel(context as Application, repository)
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
    fun testInitialEmptyAnalyticsState() = runTest {
        advanceUntilIdle()
        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(0, state.headline.attempts)
        assertNull(state.headline.rate)
        assertEquals(0, state.leeches.size)
    }

    @Test
    fun testRetentionAnalyticsWithReviews() = runTest {
        userDbHelper.addUserVerse(1, 1, 1)
        val verse = userDbHelper.getUserVerses().first()

        // 5 successful grades
        for (i in 1..5) {
            userDbHelper.gradeUserVerse(verse.id, score = 4, cueLevel = 0)
        }

        viewModel.loadAnalytics()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(4, state.headline.attempts) // 1st was interval 0, next 4 had interval > 0
        assertEquals(1, state.activeDaysCount)
    }

    @Test
    fun testSetIntervalScale() = runTest {
        advanceUntilIdle()
        assertEquals(1.0, viewModel.uiState.value.intervalScale, 0.001)

        viewModel.setIntervalScale(0.85)
        advanceUntilIdle()

        assertEquals(0.85, viewModel.uiState.value.intervalScale, 0.001)
        val persisted = userDbHelper.getAppSettings()
        assertEquals(0.85, persisted.intervalScale, 0.001)
    }

    @Test
    fun testColdCheckInteractiveWorkflow() = runTest {
        advanceUntilIdle()
        // Provide mock candidates to test interactive flow
        val candidates = listOf(
            ColdCheckCandidate("anchor:1:1", "anchor", "Genesis 1", "Creation", 45),
            ColdCheckCandidate("verse:1", "verse", "Genesis 1:1", "In the beginning", 35)
        )

        // Inject candidates into state
        val loadField = viewModel.javaClass.getDeclaredField("_uiState")
        loadField.isAccessible = true
        val flow = loadField.get(viewModel) as kotlinx.coroutines.flow.MutableStateFlow<com.example.telugubible.data.model.RetentionUiState>
        flow.value = flow.value.copy(coldCheckCandidates = candidates, coldAvailableCount = candidates.size)

        viewModel.startColdCheck()
        val startState = viewModel.uiState.value
        assertTrue(startState.isColdCheckActive)
        assertEquals(0, startState.activeColdIndex)
        assertFalse(startState.coldCheckRevealed)

        // Type answer for item 1
        viewModel.updateColdAnswer("Creation")
        viewModel.revealColdAnswer()
        assertTrue(viewModel.uiState.value.coldCheckRevealed)
        assertTrue(viewModel.uiState.value.coldCheckCorrectKeys.contains("anchor:1:1"))

        // Next item
        viewModel.nextColdItem()
        assertEquals(1, viewModel.uiState.value.activeColdIndex)
        assertFalse(viewModel.uiState.value.coldCheckRevealed)

        // Type answer for item 2
        viewModel.updateColdAnswer("In the beginning God created")
        viewModel.revealColdAnswer()
        assertTrue(viewModel.uiState.value.coldCheckRevealed)

        // Finish
        viewModel.nextColdItem()
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.coldCheckFinishedResult)
        assertEquals(2, viewModel.uiState.value.coldCheckFinishedResult?.correct)

        viewModel.closeColdCheck()
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.isColdCheckActive)
    }
}
