package com.example.telugubible.ui.practice

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.DisplayLanguage
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
class PracticeViewModelTest {

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
    fun testSessionRestorationAcrossProcessDeath() = runTest(testDispatcher) {
        // Seed 3 memory verses
        repository.addUserVerse(1, 1, 1)
        repository.addUserVerse(1, 1, 2)
        repository.addUserVerse(1, 1, 3)
        advanceUntilIdle()

        // 1st ViewModel instance (Session 1)
        var vm1 = PracticeViewModel(application, repository)
        advanceUntilIdle()

        assertEquals(3, vm1.uiState.value.verses.size)
        assertEquals(0, vm1.uiState.value.currentIndex)
        assertFalse(vm1.uiState.value.isRevealed)

        // User toggles language and reveals card 0
        vm1.setDisplayLanguage(DisplayLanguage.TELUGU)
        vm1.revealVerse()
        advanceUntilIdle()

        assertTrue(vm1.uiState.value.isRevealed)
        assertEquals(DisplayLanguage.TELUGU, vm1.uiState.value.displayLanguage)

        // User grades card 0 (advances to card 1)
        vm1.gradeCurrent(score = 4)
        advanceUntilIdle()

        assertEquals(1, vm1.uiState.value.currentIndex)
        assertFalse(vm1.uiState.value.isRevealed)

        // SIMULATE PROCESS DEATH:
        // vm1 is garbage collected, app restarts, new vm2 is instantiated
        val vm2 = PracticeViewModel(application, repository)
        advanceUntilIdle()

        // Assert session was restored!
        assertEquals("Should restore index 1 after process death", 1, vm2.uiState.value.currentIndex)
        assertEquals(3, vm2.uiState.value.verses.size)
        assertFalse(vm2.uiState.value.isRevealed)
        assertEquals(DisplayLanguage.TELUGU, vm2.uiState.value.displayLanguage)

        // Grade card 1 (advances to 2)
        vm2.gradeCurrent(score = 5)
        advanceUntilIdle()
        assertEquals(2, vm2.uiState.value.currentIndex)

        // Grade card 2 (session finishes)
        vm2.gradeCurrent(score = 4)
        advanceUntilIdle()

        assertTrue(vm2.uiState.value.isFinished)

        // Now if another ViewModel starts, session state is cleared, starts clean
        val vm3 = PracticeViewModel(application, repository)
        advanceUntilIdle()
        assertEquals(0, vm3.uiState.value.currentIndex)
    }

    @Test
    fun testTypingModeAttemptAndObjectiveLogging() = runTest(testDispatcher) {
        // Seed a memory verse
        repository.addUserVerse(1, 1, 1)
        advanceUntilIdle()

        val vm = PracticeViewModel(application, repository)
        advanceUntilIdle()

        // Switch to TYPING mode
        vm.setPracticeMode(PracticeMode.TYPING)
        advanceUntilIdle()

        assertEquals(PracticeMode.TYPING, vm.uiState.value.activeMode)
        assertFalse(vm.uiState.value.isRevealed)
        assertNull(vm.uiState.value.modeAccuracy)

        // User completes typing and taps Check
        vm.recordAttempt(accuracy = 92, committed = "In the beginning God created heaven and earth")
        advanceUntilIdle()

        assertTrue(vm.uiState.value.isRevealed)
        assertEquals(92, vm.uiState.value.modeAccuracy)
        assertEquals("In the beginning God created heaven and earth", vm.uiState.value.modeCommitted)

        // User submits grade
        vm.gradeCurrent(score = 4)
        advanceUntilIdle()

        // Verify review log accurately captures typing drill mode, cue level 3, and 0.92 accuracy
        val logs = repository.getReviewLog()
        assertEquals(1, logs.size)
        val log = logs[0]
        assertEquals("typing", log.mode)
        assertEquals(3, log.cueLevel)
        assertEquals(0.92, log.measuredAccuracy!!, 0.001)
    }

    @Test
    fun testModeSwitchingResetsAttemptState() = runTest(testDispatcher) {
        repository.addUserVerse(1, 1, 1)
        advanceUntilIdle()

        val vm = PracticeViewModel(application, repository)
        advanceUntilIdle()

        vm.setPracticeMode(PracticeMode.TYPING)
        vm.recordAttempt(accuracy = 85, committed = "some text")
        advanceUntilIdle()

        assertTrue(vm.uiState.value.isRevealed)
        assertEquals(85, vm.uiState.value.modeAccuracy)

        // Switching to FLASHCARD should reset reveal and accuracy state
        vm.setPracticeMode(PracticeMode.FLASHCARD)
        advanceUntilIdle()

        assertEquals(PracticeMode.FLASHCARD, vm.uiState.value.activeMode)
        assertFalse(vm.uiState.value.isRevealed)
        assertNull(vm.uiState.value.modeAccuracy)
        assertNull(vm.uiState.value.modeCommitted)
    }
}
