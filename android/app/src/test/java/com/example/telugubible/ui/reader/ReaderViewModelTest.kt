package com.example.telugubible.ui.reader

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
class ReaderViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var application: Application
    private lateinit var bibleDbHelper: BibleDatabaseHelper
    private lateinit var userDbHelper: UserDatabaseHelper
    private lateinit var repository: BibleRepository
    private lateinit var kjvService: com.example.telugubible.data.service.KjvService
    private lateinit var viewModel: ReaderViewModel

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
        kjvService = com.example.telugubible.data.service.KjvService(testDispatcher)
        viewModel = ReaderViewModel(application, repository, kjvService)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        bibleDbHelper.close()
        userDbHelper.close()
        application.deleteDatabase(UserDatabaseHelper.USER_DB_NAME)
        application.deleteDatabase(BibleDatabaseHelper.STATIC_DB_NAME)
    }

    @Test
    fun testInitialDataLoading() = runTest {
        advanceUntilIdle()
        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertNotNull(state.currentBook)
        assertEquals(1, state.currentBook?.id)
        assertEquals("genesis", state.currentBook?.key)
        assertEquals(1, state.currentChapter)
        assertTrue(state.verses.isNotEmpty())
        assertEquals(31, state.verses.size) // Genesis 1 has 31 verses
        assertTrue("Genesis 1 has cross reference counts", state.crossRefCounts.isNotEmpty())
    }

    @Test
    fun testVerseMultiSelectionAndFormatting() = runTest {
        advanceUntilIdle()

        // Toggle selection on verse 1 and 2
        viewModel.toggleVerseSelection(1)
        viewModel.toggleVerseSelection(2)

        var state = viewModel.uiState.value
        assertEquals(2, state.selectedVerses.size)
        assertTrue(state.selectedVerses.contains(1))
        assertTrue(state.selectedVerses.contains(2))

        // Format for clipboard in English
        viewModel.setLanguage(BibleLanguage.ENGLISH)
        val formatted = viewModel.formatSelectedVersesForClipboard()
        assertTrue(formatted.contains("Genesis 1:1-2"))
        assertTrue(formatted.contains("In the beginning"))

        // Add to memory
        var addedCount = 0
        viewModel.addSelectedVersesToMemory { addedCount = it }
        advanceUntilIdle()

        assertEquals(2, addedCount)
        state = viewModel.uiState.value
        assertTrue("Selection cleared after adding to memory", state.selectedVerses.isEmpty())
        assertNotNull(state.toastMessage)

        val memoryVerses = repository.getUserMemoryVerses()
        assertEquals(2, memoryVerses.size)

        // Clear selection test
        viewModel.toggleVerseSelection(3)
        assertEquals(1, viewModel.uiState.value.selectedVerses.size)
        viewModel.clearVerseSelection()
        assertTrue(viewModel.uiState.value.selectedVerses.isEmpty())
    }

    @Test
    fun testCrossReferencesOpenAndDismiss() = runTest {
        advanceUntilIdle()

        // Genesis 1:1 has 25 cross-references
        viewModel.openCrossReferences(listOf(1))
        advanceUntilIdle()

        var state = viewModel.uiState.value
        assertEquals(listOf(1), state.crossRefSheetVerses)
        assertEquals(25, state.crossRefsForSheet.size)

        viewModel.dismissCrossReferences()
        state = viewModel.uiState.value
        assertNull(state.crossRefSheetVerses)
        assertTrue(state.crossRefsForSheet.isEmpty())
    }

    @Test
    fun testChapterNavigationAndFontScaling() = runTest {
        advanceUntilIdle()

        // Next chapter -> Genesis 2
        viewModel.nextChapter()
        advanceUntilIdle()
        assertEquals(2, viewModel.uiState.value.currentChapter)

        // Previous chapter -> Genesis 1
        viewModel.previousChapter()
        advanceUntilIdle()
        assertEquals(1, viewModel.uiState.value.currentChapter)

        // Font size scaling
        assertEquals(FontSizeScale.S, viewModel.uiState.value.fontSizeScale)
        viewModel.increaseFontSize()
        assertEquals(FontSizeScale.M, viewModel.uiState.value.fontSizeScale)
        viewModel.decreaseFontSize()
        assertEquals(FontSizeScale.S, viewModel.uiState.value.fontSizeScale)
    }

    @Test
    fun testOriginalWordsAndStrongsLookup() = runTest {
        advanceUntilIdle()

        // Seed KJV cache for Genesis 1:1
        kjvService.seedCache(
            1, 1,
            mapOf(1 to "In the beginning<S>7225</S> God<S>430</S> created<S>1254</S> the heaven<S>8064</S> and the earth.<S>776</S>")
        )

        viewModel.openOriginalWords(1)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.originalWordsVerse)
        assertFalse(state.isOriginalWordsLoading)
        assertTrue(state.originalWordsList.isNotEmpty())

        val firstWord = state.originalWordsList.firstOrNull { it.strongsId == "H7225" }
        assertNotNull(firstWord)
        assertEquals("H7225", firstWord?.strongsId)
        assertNotNull(firstWord?.entry)
        assertEquals("רֵאשִׁית", firstWord?.entry?.lemma)

        // Test direct Strong's lookup
        viewModel.lookupStrongs("H7225")
        advanceUntilIdle()
        assertEquals("H7225", viewModel.uiState.value.selectedStrongs?.id)
        assertEquals("רֵאשִׁית", viewModel.uiState.value.selectedStrongs?.lemma)

        viewModel.dismissStrongs()
        assertNull(viewModel.uiState.value.selectedStrongs)

        viewModel.dismissOriginalWords()
        assertNull(viewModel.uiState.value.originalWordsVerse)
        assertTrue(viewModel.uiState.value.originalWordsList.isEmpty())
    }

    @Test
    fun testReaderThemeAndTypography() = runTest {
        advanceUntilIdle()

        assertEquals(ReaderTheme.OBSIDIAN, viewModel.uiState.value.readerTheme)
        assertEquals(ReaderFontFamily.SERIF, viewModel.uiState.value.readerFontFamily)

        viewModel.setReaderTheme(ReaderTheme.SEPIA)
        assertEquals(ReaderTheme.SEPIA, viewModel.uiState.value.readerTheme)

        viewModel.setReaderTheme(ReaderTheme.PAPER)
        assertEquals(ReaderTheme.PAPER, viewModel.uiState.value.readerTheme)

        viewModel.setReaderFontFamily(ReaderFontFamily.SANS_SERIF)
        assertEquals(ReaderFontFamily.SANS_SERIF, viewModel.uiState.value.readerFontFamily)
    }

    @Test
    fun testAlphaModeToggle() = runTest {
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.alphaMode)
        viewModel.toggleAlphaMode()
        assertTrue(viewModel.uiState.value.alphaMode)
        viewModel.toggleAlphaMode()
        assertFalse(viewModel.uiState.value.alphaMode)
    }
}
