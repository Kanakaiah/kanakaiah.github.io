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
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class BibleBrowserViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private lateinit var context: Context
    private lateinit var bible: BibleDatabaseHelper
    private lateinit var user: UserDatabaseHelper
    private lateinit var viewModel: BibleBrowserViewModel

    @Before fun setup() {
        Dispatchers.setMain(dispatcher)
        context = ApplicationProvider.getApplicationContext()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        context.getSharedPreferences("user_db_prefs", Context.MODE_PRIVATE).edit().clear().commit()
        bible = BibleDatabaseHelper(context)
        user = UserDatabaseHelper(context)
        viewModel = BibleBrowserViewModel(context as Application, BibleRepository(bible, user, dispatcher))
    }

    @After fun cleanup() {
        bible.close(); user.close()
        context.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        context.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
        Dispatchers.resetMain()
    }

    @Test fun filtersAndWholeBibleSearch() = runTest(dispatcher) {
        advanceUntilIdle()
        assertEquals(66, viewModel.uiState.value.filteredBooks.size)
        viewModel.setTestament("NT")
        assertEquals(27, viewModel.uiState.value.filteredBooks.size)
        viewModel.setSearchQuery("Genesis")
        assertEquals(listOf("Genesis"), viewModel.uiState.value.filteredBooks.map { it.nameEn })
        viewModel.setSearchQuery("")
        assertEquals(27, viewModel.uiState.value.filteredBooks.size)
        viewModel.setTestament("OT")
        assertEquals(39, viewModel.uiState.value.filteredBooks.size)
    }

    @Test fun searchEnteredWhileLoadingIsPreserved() = runTest(dispatcher) {
        viewModel.setSearchQuery("Genesis")
        advanceUntilIdle()
        assertEquals(listOf("Genesis"), viewModel.uiState.value.filteredBooks.map { it.nameEn })
    }
}
