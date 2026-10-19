package com.example.telugubible.ui.practice

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.UserMemoryVerse
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
class DailySessionViewModelTest {

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
        repository = BibleRepository(bibleDbHelper, userDbHelper, testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        if (::bibleDbHelper.isInitialized) bibleDbHelper.close()
        if (::userDbHelper.isInitialized) userDbHelper.close()
        application.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        application.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
    }

    @Test
    fun testDailySessionPlanAndExecution() = runTest(testDispatcher) {
        // Add a due memory verse
        val now = System.currentTimeMillis()
        repository.addUserVerse(bookId = 1, chapter = 1, verse = 1)
        // Force nextDueDate to be due now
        val db = userDbHelper.writableDatabase
        db.execSQL("UPDATE user_verses SET next_due_date = ${now - 10000}")

        val vm = DailySessionViewModel(application, repository)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertNotNull(state.plan)
        assertTrue(state.plan!!.items.isNotEmpty())
        assertEquals(0, state.currentIndex)

        // Reveal and grade the first item
        vm.revealAnswer()
        assertTrue(vm.uiState.value.isRevealed)

        vm.gradeCurrent(score = 4)
        advanceUntilIdle()

        assertEquals(1, vm.uiState.value.outcomes.size)
        assertEquals(4, vm.uiState.value.outcomes[0].score)
    }

    @Test
    fun testDailySessionCompletionRecordsAdherence() = runTest(testDispatcher) {
        val vm = DailySessionViewModel(application, repository)
        advanceUntilIdle()

        val totalItems = vm.uiState.value.plan?.items?.size ?: 0
        assertTrue(totalItems > 0)

        // Grade all items in the plan
        for (i in 0 until totalItems) {
            val item = vm.uiState.value.currentItem
            if (item is com.example.telugubible.util.SessionItem.Introduce) {
                vm.advanceIntroduce()
            } else {
                vm.revealAnswer()
                vm.gradeCurrent(score = 4)
            }
            advanceUntilIdle()
        }

        assertTrue(vm.uiState.value.isFinished)

        // Verify adherence recorded
        val stats = repository.getAdherenceStats()
        assertEquals(1, stats.completed)
    }

    @Test
    fun testDailySessionAbandonmentRecordsAdherence() = runTest(testDispatcher) {
        val vm = DailySessionViewModel(application, repository)
        advanceUntilIdle()

        // Advance past item 0
        vm.advanceIntroduce()
        advanceUntilIdle()

        assertEquals(1, vm.uiState.value.currentIndex)

        // Abandon session
        vm.abandonSession()
        advanceUntilIdle()

        val stats = repository.getAdherenceStats()
        assertEquals(0, stats.completed)
        assertEquals(1, stats.started)
        assertEquals(1, stats.meanAbandonAt)
    }

    @Test
    fun testSpeechAttemptInDailySession() = runTest(testDispatcher) {
        val now = System.currentTimeMillis()
        repository.addUserVerse(bookId = 1, chapter = 1, verse = 1)
        val db = userDbHelper.writableDatabase
        db.execSQL("UPDATE user_verses SET next_due_date = ${now - 10000}")

        val vm = DailySessionViewModel(application, repository)
        advanceUntilIdle()

        // Switch verse mode to SPEECH
        vm.setVerseMode(PracticeMode.SPEECH)
        assertEquals(PracticeMode.SPEECH, vm.uiState.value.activeVerseMode)

        // Record speech attempt
        vm.recordSpeechAttempt(accuracy = 85, committedText = "In the beginning God created")
        assertTrue(vm.uiState.value.isRevealed)
        assertEquals(85, vm.uiState.value.verseAccuracy)
        assertEquals(4, vm.uiState.value.gradeCeiling) // 85% is >= 75% -> ceiling 4

        vm.gradeCurrent(score = 5) // Should be capped to 4
        advanceUntilIdle()

        val logs = repository.getReviewLog()
        val speechLog = logs.firstOrNull { it.mode == "speech" }
        assertNotNull(speechLog)
        assertEquals(4, speechLog!!.score)
        assertEquals(0.85, speechLog.measuredAccuracy!!, 0.001)
    }
}

