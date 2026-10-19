package com.example.telugubible.ui.practice

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
class ThemeDrillViewModelTest {

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
    fun testThemeDrillPoolScopes() = runTest(testDispatcher) {
        val vm = ThemeDrillViewModel(application, repository)
        advanceUntilIdle()

        // By default scope = ALL -> 66 books
        assertEquals(ThemeScope.ALL, vm.uiState.value.scope)
        assertEquals(66, vm.uiState.value.queue.size)
        assertEquals(1, vm.uiState.value.queue[0].book.id)
        assertEquals("Genesis", vm.uiState.value.queue[0].book.nameEn)
        assertEquals("GARDEN", vm.uiState.value.queue[0].book.themeWord)

        // Switch to OT -> 39 books
        vm.setScope(ThemeScope.OT)
        advanceUntilIdle()
        assertEquals(ThemeScope.OT, vm.uiState.value.scope)
        assertEquals(39, vm.uiState.value.queue.size)
        assertEquals(39, vm.uiState.value.queue.last().book.id) // Malachi

        // Switch to NT -> 27 books
        vm.setScope(ThemeScope.NT)
        advanceUntilIdle()
        assertEquals(ThemeScope.NT, vm.uiState.value.scope)
        assertEquals(27, vm.uiState.value.queue.size)
        assertEquals(40, vm.uiState.value.queue[0].book.id) // Matthew
        assertEquals(66, vm.uiState.value.queue.last().book.id) // Revelation
    }

    @Test
    fun testThemeDrillRevealAndGrade() = runTest(testDispatcher) {
        val vm = ThemeDrillViewModel(application, repository)
        advanceUntilIdle()

        // Initially unrevealed
        assertFalse(vm.uiState.value.isRevealed)
        assertEquals(0, vm.uiState.value.currentIndex)

        // Reveal answer
        vm.revealAnswer()
        assertTrue(vm.uiState.value.isRevealed)

        // Grade book 1 (Genesis) with score 5 (Easy)
        vm.gradeCurrent(score = 5)
        advanceUntilIdle()

        // Moved to index 1 (Exodus) and unrevealed
        assertEquals(1, vm.uiState.value.currentIndex)
        assertFalse(vm.uiState.value.isRevealed)
        assertEquals(2, vm.uiState.value.currentItem?.book?.id)

        // Verify theme_progress in database
        val progress = repository.getThemeProgress(1)
        assertNotNull(progress)
        assertEquals(1, progress?.repetition)
        assertEquals(1, progress?.interval)
        assertEquals(5, progress?.lastScore)

        // Check audit log
        val auditLog = userDbHelper.getReviewLog()
        val themeEntry = auditLog.find { it.itemKind == "theme" && it.itemId == "1" }
        assertNotNull(themeEntry)
        assertEquals(5, themeEntry?.score)
    }

    @Test
    fun testThemeDrillSkip() = runTest(testDispatcher) {
        val vm = ThemeDrillViewModel(application, repository)
        advanceUntilIdle()

        assertEquals(0, vm.uiState.value.currentIndex)
        vm.skipToNext()
        assertEquals(1, vm.uiState.value.currentIndex)
        assertEquals(2, vm.uiState.value.currentItem?.book?.id)
    }

    @Test
    fun testDueBooksPrioritizationAndMastery() = runTest(testDispatcher) {
        // Mark Book 40 (Matthew) as due in the past
        val now = System.currentTimeMillis()
        userDbHelper.gradeThemeProgress(40, score = 4) // rep 1, due tomorrow
        // Force nextDueDate to 1 hour ago
        val db = userDbHelper.writableDatabase
        db.execSQL("UPDATE theme_progress SET next_due_date = ${now - 3600000} WHERE book_id = 40")

        val vm = ThemeDrillViewModel(application, repository)
        advanceUntilIdle()

        // Book 40 (due) should be placed at the very front of the queue ahead of fresh Book 1
        val state = vm.uiState.value
        assertEquals(40, state.queue[0].book.id)
        assertEquals("Matthew", state.queue[0].book.nameEn)
    }
}
