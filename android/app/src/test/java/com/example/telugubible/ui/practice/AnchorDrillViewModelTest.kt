package com.example.telugubible.ui.practice

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.util.AnchorDirection
import com.example.telugubible.util.AnchorVerdict
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
class AnchorDrillViewModelTest {

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
    fun failedAnchorGradeDoesNotAdvanceOrRecordReview() = runTest(testDispatcher) {
        val vm = AnchorDrillViewModel(application, repository)
        advanceUntilIdle()
        vm.selectBook(1)
        advanceUntilIdle()
        vm.reveal()
        userDbHelper.writableDatabase.execSQL("CREATE TRIGGER reject_anchor_review BEFORE INSERT ON review_log WHEN NEW.item_kind = 'anchor' BEGIN SELECT RAISE(ABORT, 'injected failure'); END")
        vm.gradeCurrent(4)
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.gradingError)
        assertEquals(0, vm.uiState.value.currentIndex)
        assertTrue(repository.getReviewLog().isEmpty())
        assertTrue(userDbHelper.getChapterProgress(1).isEmpty())
    }

    @Test
    fun duplicateGradeRecordsOnlyOneAnchorReview() = runTest(testDispatcher) {
        val vm = AnchorDrillViewModel(application, repository)
        advanceUntilIdle()
        vm.reveal()
        vm.gradeCurrent(3)
        vm.gradeCurrent(5)
        assertTrue(vm.uiState.value.isGrading)
        advanceUntilIdle()
        assertEquals(1, vm.uiState.value.currentIndex)
        assertEquals(1, repository.getReviewLog().size)
        assertEquals(3, repository.getReviewLog().single().score)
        assertFalse(vm.uiState.value.isGrading)
    }

    @Test
    fun selectedBookSupersedesInitialLoad() = runTest(testDispatcher) {
        val vm = AnchorDrillViewModel(application, repository)
        vm.loadData(2)
        advanceUntilIdle()
        assertEquals(2, vm.uiState.value.selectedBookId)
        assertTrue(vm.uiState.value.queue.isNotEmpty())
        assertTrue(vm.uiState.value.queue.all { it.bookId == 2 })
    }

    @Test
    fun testAnchorDrillQueueLoading() = runTest(testDispatcher) {
        val vm = AnchorDrillViewModel(application, repository)
        advanceUntilIdle()

        // Select Genesis (bookId = 1)
        vm.selectBook(1)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertFalse(state.isLoading)
        assertEquals(50, state.queue.size)
        assertEquals(1, state.queue[0].chapter)
        assertEquals("LIGHT", state.queue[0].word)
        assertEquals("Genesis", state.queue[0].bookName)
    }

    @Test
    fun testAnchorDrillCheckAnswerExactAndNear() = runTest(testDispatcher) {
        val vm = AnchorDrillViewModel(application, repository)
        advanceUntilIdle()

        vm.selectBook(1)
        advanceUntilIdle()

        // Direction: N2W (Chapter 1 -> "LIGHT")
        vm.setDirection(AnchorDirection.N2W)
        vm.onInputChange("light")
        vm.checkAnswer()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state.isRevealed)
        assertNotNull(state.judgement)
        assertEquals(AnchorVerdict.CORRECT, state.judgement?.verdict)
        assertEquals(4, state.judgement?.score)
    }

    @Test
    fun testAnchorDrillGradeAndAdvancement() = runTest(testDispatcher) {
        val vm = AnchorDrillViewModel(application, repository)
        advanceUntilIdle()

        vm.selectBook(1)
        advanceUntilIdle()

        assertEquals(0, vm.uiState.value.currentIndex)

        // Grade chapter 1
        vm.gradeCurrent(score = 4)
        advanceUntilIdle()

        assertEquals(1, vm.uiState.value.currentIndex)
        assertEquals(2, vm.uiState.value.currentItem?.chapter)

        // Verify chapter_progress in database
        val progress = repository.getChapterProgress(1)
        assertNotNull(progress[1])
        assertEquals(1, progress[1]?.repetition)
        assertEquals(1, progress[1]?.interval)
    }
}
