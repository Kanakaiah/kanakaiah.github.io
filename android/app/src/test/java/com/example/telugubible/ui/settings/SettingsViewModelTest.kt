package com.example.telugubible.ui.settings

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
class SettingsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var context: Context
    private lateinit var bibleDbHelper: BibleDatabaseHelper
    private lateinit var userDbHelper: UserDatabaseHelper
    private lateinit var repository: BibleRepository
    private lateinit var viewModel: SettingsViewModel

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
        viewModel = SettingsViewModel(context as Application, repository)
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
    fun testLoadAndSaveSettings() = runTest(testDispatcher) {
        viewModel.loadSettings()
        advanceUntilIdle()

        assertEquals("black", viewModel.uiState.value.settings.theme)
        assertEquals(1.0f, viewModel.uiState.value.settings.fontSize)

        viewModel.setTheme("sepia")
        viewModel.setFontSize(1.15f)
        viewModel.setBibleVersion("IRV-TE")
        viewModel.setAnchorReveal("always")
        viewModel.setDailyChapterTarget(5)
        viewModel.setTtsEnabled(false)
        advanceUntilIdle()

        val state = viewModel.uiState.value.settings
        assertEquals("sepia", state.theme)
        assertEquals(1.15f, state.fontSize)
        assertEquals("IRV-TE", state.bibleVersion)
        assertEquals("always", state.anchorReveal)
        assertEquals(5, state.dailyChapterTarget)
        assertFalse(state.ttsEnabled)

        // Verify reloaded from repository
        val reloaded = repository.getAppSettings()
        assertEquals("sepia", reloaded.theme)
        assertEquals(1.15f, reloaded.fontSize)
        assertEquals("IRV-TE", reloaded.bibleVersion)
        assertEquals("always", reloaded.anchorReveal)
        assertEquals(5, reloaded.dailyChapterTarget)
        assertFalse(reloaded.ttsEnabled)
    }

    @Test
    fun testChapterDisplayPresets() = runTest(testDispatcher) {
        viewModel.loadSettings()
        advanceUntilIdle()

        // Clean preset
        viewModel.setChapterDisplayPreset("clean")
        advanceUntilIdle()
        var s = viewModel.uiState.value.settings
        assertFalse(s.showSectionHeadings)
        assertFalse(s.showVerseNumbers)
        assertFalse(s.showParagraphMarks)
        assertFalse(s.showCrossRefMarkers)

        // Reading preset
        viewModel.setChapterDisplayPreset("reading")
        advanceUntilIdle()
        s = viewModel.uiState.value.settings
        assertTrue(s.showSectionHeadings)
        assertTrue(s.showVerseNumbers)
        assertFalse(s.showParagraphMarks)
        assertFalse(s.showCrossRefMarkers)

        // Study preset
        viewModel.setChapterDisplayPreset("study")
        advanceUntilIdle()
        s = viewModel.uiState.value.settings
        assertTrue(s.showSectionHeadings)
        assertTrue(s.showVerseNumbers)
        assertTrue(s.showParagraphMarks)
        assertTrue(s.showCrossRefMarkers)
    }

    @Test
    fun testExportAndRestoreBackup() = runTest(testDispatcher) {
        // Add a test verse to user library
        repository.addUserVerse(1, 1, 1)
        advanceUntilIdle()

        assertEquals(1, repository.getUserMemoryVerses().size)

        var exportedJson: String? = null
        viewModel.generateBackup { json ->
            exportedJson = json
        }
        advanceUntilIdle()

        assertNotNull(exportedJson)
        val json = requireNotNull(exportedJson)
        assertTrue(json.contains("\"verses\""))
        assertTrue(json.contains("\"book_id\": 1"))

        // Clear all data
        var cleared = false
        viewModel.clearAllData {
            cleared = true
        }
        advanceUntilIdle()

        assertTrue(cleared)
        assertTrue(repository.getUserMemoryVerses().isEmpty())

        // Restore from exported backup
        var restored = false
        viewModel.restoreBackup(json) { success ->
            restored = success
        }
        advanceUntilIdle()

        assertTrue(restored)
        assertEquals(1, repository.getUserMemoryVerses().size)
        assertEquals(1, repository.getUserMemoryVerses()[0].bookId)
    }
}
