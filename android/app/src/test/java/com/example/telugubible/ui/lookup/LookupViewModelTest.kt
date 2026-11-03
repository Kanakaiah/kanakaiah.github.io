package com.example.telugubible.ui.lookup

import android.app.Application
import androidx.test.core.app.ApplicationProvider
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
class LookupViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    @Before fun setup() { Dispatchers.setMain(dispatcher) }
    @After fun cleanup() { Dispatchers.resetMain() }

    @Test fun clearingQueuedSearchDoesNotRepopulateResults() = runTest(dispatcher) {
        val model = LookupViewModel(ApplicationProvider.getApplicationContext<Application>())
        model.setQuery("Genesis 1:1")
        model.performSearch()
        model.setQuery("")
        advanceUntilIdle()
        assertFalse(model.uiState.value.isSearching)
        assertFalse(model.uiState.value.hasSearched)
        assertTrue(model.uiState.value.verseResults.isEmpty())
        assertNull(model.uiState.value.searchError)
    }

    @Test fun changingQueryInvalidatesQueuedSearch() = runTest(dispatcher) {
        val model = LookupViewModel(ApplicationProvider.getApplicationContext<Application>())
        model.setQuery("Genesis 1:1")
        model.performSearch()
        model.setQuery("John 1:1")
        advanceUntilIdle()
        assertEquals("John 1:1", model.uiState.value.query)
        assertFalse(model.uiState.value.hasSearched)
        assertFalse(model.uiState.value.isSearching)
        assertTrue(model.uiState.value.verseResults.isEmpty())
    }
}
