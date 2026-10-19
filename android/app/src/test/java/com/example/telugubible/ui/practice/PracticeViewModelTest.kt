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
        repository = BibleRepository(bibleDbHelper, userDbHelper)
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
}
