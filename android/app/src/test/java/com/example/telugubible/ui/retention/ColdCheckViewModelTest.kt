package com.example.telugubible.ui.retention

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
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [35])
class ColdCheckViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private lateinit var app: Application
    private lateinit var bible: BibleDatabaseHelper
    private lateinit var user: UserDatabaseHelper
    private lateinit var repository: BibleRepository

    @Before fun setup() {
        Dispatchers.setMain(dispatcher)
        app = ApplicationProvider.getApplicationContext()
        app.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        app.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        app.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE).edit().clear().commit()
        bible = BibleDatabaseHelper(app)
        user = UserDatabaseHelper(app)
        repository = BibleRepository(bible, user, dispatcher)
        user.addUserVerse(1, 1, 1)
        user.writableDatabase.execSQL("UPDATE user_verses SET created_at = 0")
    }
    @After fun cleanup() {
        Dispatchers.resetMain()
        bible.close(); user.close()
        app.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        app.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
    }
    private fun rowCount(table: String): Int = user.readableDatabase.rawQuery("SELECT COUNT(*) FROM $table", null).use { it.moveToFirst(); it.getInt(0) }

    @Test fun repeatedTypedWordsCannotInventMatches() {
        assertFalse(coldAnswerMatches("verse", "one two three four", "one one one one"))
        assertTrue(coldAnswerMatches("verse", "one one two three", "one one two"))
        assertFalse(coldAnswerMatches("anchor", "", ""))
        assertTrue(coldAnswerMatches("anchor", "Creation", "cre"))
    }

    @Test fun checkSavesOnceWithoutChangingReviewsOrSchedule() = runTest(dispatcher) {
        val before = user.getUserVerses().single()
        val vm = RetentionViewModel(app, repository)
        advanceUntilIdle()
        assertEquals(1, vm.uiState.value.coldCheckCandidates.size)
        vm.startColdCheck()
        vm.nextColdItem()
        assertFalse(vm.uiState.value.coldCheckSaving)
        vm.revealColdAnswer()
        vm.nextColdItem()
        vm.nextColdItem()
        assertTrue(vm.uiState.value.coldCheckSaving)
        vm.closeColdCheck()
        assertTrue(vm.uiState.value.isColdCheckActive)
        advanceUntilIdle()
        assertEquals(1, rowCount("cold_checks"))
        assertEquals(1, vm.uiState.value.coldCheckFinishedResult!!.total)
        assertTrue(repository.getReviewLog().isEmpty())
        val after = user.getUserVerses().single()
        assertEquals(before.nextDueDate, after.nextDueDate)
        assertEquals(before.attempts, after.attempts)
    }

    @Test fun failedCheckSaveShowsErrorAndDoesNotRepeat() = runTest(dispatcher) {
        val vm = RetentionViewModel(app, repository)
        advanceUntilIdle()
        user.writableDatabase.execSQL("CREATE TRIGGER fail_cold BEFORE INSERT ON cold_checks BEGIN SELECT RAISE(ABORT, 'failure'); END")
        vm.startColdCheck(); vm.revealColdAnswer(); vm.nextColdItem()
        advanceUntilIdle()
        assertNotNull(vm.uiState.value.coldCheckSaveError)
        assertFalse(vm.uiState.value.coldCheckSaving)
        vm.nextColdItem()
        advanceUntilIdle()
        assertEquals(0, rowCount("cold_checks"))
        assertTrue(repository.getReviewLog().isEmpty())
    }
}
