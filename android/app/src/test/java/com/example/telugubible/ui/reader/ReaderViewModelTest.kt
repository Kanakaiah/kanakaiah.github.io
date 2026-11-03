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
        kjvService = com.example.telugubible.data.service.KjvService(testDispatcher)
        repository = BibleRepository(bibleDbHelper, userDbHelper, testDispatcher, kjvService)
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
    fun legacyTeluguTranslationUsesLocalReaderWithoutRewritingPreference() = runTest {
        advanceUntilIdle()
        val original = repository.getAppSettings()
        repository.saveAppSettings(original.copy(bibleVersion = "IRV-TE"))
        val restored = ReaderViewModel(application, repository, kjvService)
        advanceUntilIdle()
        assertEquals("TELIRV", restored.uiState.value.activeVersion)
        assertEquals(BibleLanguage.TELUGU, restored.uiState.value.language)
        assertEquals("IRV-TE", repository.getAppSettings().bibleVersion)
        assertEquals(repository.getChapterVerses(1, 1, "TELIRV"), repository.getChapterVerses(1, 1, "IRV-TE"))
        assertEquals("NASB95", com.example.telugubible.data.model.BibleTranslation.normalizeCode("nasb95"))
    }

    @Test
    fun failedReadingSettingsSaveReloadsPreviousValues() = runTest {
        advanceUntilIdle()
        val before = repository.getAppSettings()
        val revision = viewModel.uiState.value.settingsRevision
        userDbHelper.writableDatabase.execSQL("CREATE TRIGGER reject_reader_settings BEFORE INSERT ON user_stats WHEN NEW.key = 'setting_fontSize' BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        viewModel.setReaderTheme(ReaderTheme.PAPER)
        advanceUntilIdle()
        assertEquals(before, repository.getAppSettings())
        assertEquals(ReaderTheme.fromKey(before.theme), viewModel.uiState.value.readerTheme)
        assertEquals(revision, viewModel.uiState.value.settingsRevision)
        assertNotNull(viewModel.uiState.value.toastMessage)
    }

    @Test
    fun savedChapterRestoresInNewReaderWithoutChangingVersion() = runTest {
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.hasSavedReadingPosition)
        viewModel.selectBookAndChapterById(43, 3)
        advanceUntilIdle()
        assertEquals("43:3", repository.getSessionState("reader_position"))
        val restored = ReaderViewModel(application, repository, kjvService)
        advanceUntilIdle()
        assertEquals(43, restored.uiState.value.currentBook?.id)
        assertEquals(3, restored.uiState.value.currentChapter)
        assertEquals(3, restored.uiState.value.verses.first().chapter)
        assertTrue(restored.uiState.value.hasSavedReadingPosition)
        assertEquals(viewModel.uiState.value.activeVersion, restored.uiState.value.activeVersion)
    }

    @Test
    fun invalidSavedPositionFallsBackAndOversizedChapterIsClamped() = runTest {
        advanceUntilIdle()
        for (value in listOf("broken", "-1:2", "1:0", "999:1")) {
            repository.setSessionState("reader_position", value)
            val restored = ReaderViewModel(application, repository, kjvService)
            advanceUntilIdle()
            assertEquals(1, restored.uiState.value.currentBook?.id)
            assertEquals(1, restored.uiState.value.currentChapter)
            assertFalse(restored.uiState.value.hasSavedReadingPosition)
        }
        repository.setSessionState("reader_position", "1:999")
        val restored = ReaderViewModel(application, repository, kjvService)
        advanceUntilIdle()
        assertEquals(50, restored.uiState.value.currentChapter)
        assertTrue(restored.uiState.value.verses.all { it.chapter == 50 })
    }

    @Test
    fun latestNavigationWinsOverInitializationAndEarlierRequests() = runTest {
        viewModel.selectBookAndChapterById(2, 2)
        viewModel.selectBookAndChapterById(43, 3)
        advanceUntilIdle()
        assertEquals(43, viewModel.uiState.value.currentBook?.id)
        assertEquals(3, viewModel.uiState.value.currentChapter)
        assertTrue(viewModel.uiState.value.books.isNotEmpty())
        assertEquals("43:3", repository.getSessionState("reader_position"))
    }

    @Test
    fun readerPalettesMatchTheAppPalettes() {
        ReaderTheme.entries.forEach { theme ->
            val palette = com.example.telugubible.theme.RemoraColors.forTheme(theme.toSettingKey())
            assertEquals(palette.background, theme.backgroundColor)
            assertEquals(palette.textPrimary, theme.textColor)
            assertEquals(palette.accent, theme.accentColor)
        }
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
    fun savingSelectionCapturesVersesAndDoesNotClearLaterSelection() = runTest {
        advanceUntilIdle()
        viewModel.toggleVerseSelection(1)
        viewModel.toggleVerseSelection(2)
        viewModel.toggleVerseSelection(4)
        viewModel.setLanguage(BibleLanguage.ENGLISH)
        assertTrue(viewModel.formatSelectedVersesForClipboard().startsWith("Genesis 1:1-2, 4\n"))
        viewModel.addSelectedVersesToMemory(combineConsecutive = true)
        viewModel.clearVerseSelection()
        viewModel.toggleVerseSelection(5)
        advanceUntilIdle()
        assertEquals(setOf(5), viewModel.uiState.value.selectedVerses)
        val saved = repository.getUserMemoryVerses().sortedBy { it.verse }
        assertEquals(listOf(1, 4), saved.map { it.verse })
        assertEquals(listOf(2, null), saved.map { it.endVerse })
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
    fun connectionNavigationUsesLatestRequestAndDismissCancelsQueuedWork() = runTest {
        advanceUntilIdle()
        val first = com.example.telugubible.util.KjvVersification.toVerseIndex(1, 1, 1)!!
        val second = com.example.telugubible.util.KjvVersification.toVerseIndex(43, 1, 1)!!
        viewModel.openConnectionsForVid(first)
        viewModel.openConnectionsForVid(second)
        advanceUntilIdle()
        assertEquals(second, viewModel.uiState.value.connectionsData?.vid)
        viewModel.openConnectionsForVid(first)
        viewModel.dismissCrossReferences()
        advanceUntilIdle()
        assertNull(viewModel.uiState.value.connectionsData)
        assertNull(viewModel.uiState.value.crossRefSheetVerses)
    }

    @Test
    fun returningToReadingContextRestoresOriginalSelection() = runTest {
        advanceUntilIdle()
        viewModel.selectBookAndChapterById(43, 1)
        advanceUntilIdle()
        viewModel.restoreReadingContext(1, 1, setOf(1, 3, 999))
        assertEquals(1, viewModel.uiState.value.currentBook?.id)
        assertEquals(1, viewModel.uiState.value.currentChapter)
        assertEquals(setOf(1, 3), viewModel.uiState.value.selectedVerses)
    }

    @Test
    fun testCrossReferencesOpenAndDismiss() = runTest {
        advanceUntilIdle()

        // Genesis 1:1 has 61 OpenBible cross-references (>= 4 votes)
        viewModel.openCrossReferences(listOf(1))
        advanceUntilIdle()

        var state = viewModel.uiState.value
        assertEquals(listOf(1), state.crossRefSheetVerses)
        assertEquals(61, state.crossRefsForSheet.size)
        org.junit.Assert.assertNotNull(state.connectionsData)
        assertEquals(61, state.connectionsData?.outgoing?.size)

        viewModel.dismissCrossReferences()
        state = viewModel.uiState.value
        assertNull(state.crossRefSheetVerses)
        assertTrue(state.crossRefsForSheet.isEmpty())
        assertNull(state.connectionsData)
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
        advanceUntilIdle()
        assertEquals(FontSizeScale.M, viewModel.uiState.value.fontSizeScale)
        assertEquals(1.28f, repository.getAppSettings().fontSize)

        viewModel.increaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.L, viewModel.uiState.value.fontSizeScale)
        assertEquals(1.60f, repository.getAppSettings().fontSize)

        viewModel.increaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.XL, viewModel.uiState.value.fontSizeScale)
        assertEquals(2.00f, repository.getAppSettings().fontSize)
        assertEquals(36f, FontSizeScale.XL.spSize)

        // Cannot increase beyond XL
        viewModel.increaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.XL, viewModel.uiState.value.fontSizeScale)

        // Decrease down to XS
        viewModel.decreaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.L, viewModel.uiState.value.fontSizeScale)
        viewModel.decreaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.M, viewModel.uiState.value.fontSizeScale)
        viewModel.decreaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.S, viewModel.uiState.value.fontSizeScale)
        viewModel.decreaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.XS, viewModel.uiState.value.fontSizeScale)
        assertEquals(15f, FontSizeScale.XS.spSize)
        assertEquals(0.82f, repository.getAppSettings().fontSize)

        // Cannot decrease below XS
        viewModel.decreaseFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.XS, viewModel.uiState.value.fontSizeScale)

        // Reset to S
        viewModel.resetFontSize()
        advanceUntilIdle()
        assertEquals(FontSizeScale.S, viewModel.uiState.value.fontSizeScale)
        assertEquals(1.00f, repository.getAppSettings().fontSize)
    }

    @Test
    fun missingTaggedVerseDoesNotGuessOriginalWords() = runTest {
        advanceUntilIdle()
        kjvService.seedCache(1, 1, mapOf(1 to "beginning<S>7225</S>"))
        viewModel.openOriginalWords(2)
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.isOriginalWordsLoading)
        assertTrue(viewModel.uiState.value.originalWordsList.isEmpty())
    }

    @Test
    fun dismissingOriginalWordsInvalidatesPendingLoad() = runTest {
        advanceUntilIdle()
        kjvService.seedCache(1, 1, mapOf(1 to "beginning<S>7225</S>"))
        viewModel.openOriginalWords(1)
        viewModel.dismissOriginalWords()
        advanceUntilIdle()
        assertNull(viewModel.uiState.value.originalWordsVerse)
        assertTrue(viewModel.uiState.value.originalWordsList.isEmpty())
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
    fun readerThemeIsPublishedAfterPersistenceAndSyncDoesNotRepublish() = runTest {
        advanceUntilIdle()
        val revision = viewModel.uiState.value.settingsRevision
        viewModel.setReaderTheme(ReaderTheme.SEPIA)
        assertEquals(revision, viewModel.uiState.value.settingsRevision)
        advanceUntilIdle()
        assertEquals("sepia", repository.getAppSettings().theme)
        assertEquals(revision + 1, viewModel.uiState.value.settingsRevision)
        viewModel.syncSettings()
        advanceUntilIdle()
        assertEquals(revision + 1, viewModel.uiState.value.settingsRevision)
    }

    @Test
    fun testReaderThemeAndTypography() = runTest {
        advanceUntilIdle()

        assertEquals(ReaderTheme.OBSIDIAN, viewModel.uiState.value.readerTheme)
        assertEquals(ReaderFontFamily.MERRIWEATHER, viewModel.uiState.value.readerFontFamily)

        viewModel.setReaderTheme(ReaderTheme.SEPIA)
        assertEquals(ReaderTheme.SEPIA, viewModel.uiState.value.readerTheme)

        viewModel.setReaderTheme(ReaderTheme.PAPER)
        assertEquals(ReaderTheme.PAPER, viewModel.uiState.value.readerTheme)

        viewModel.setReaderFontFamily(ReaderFontFamily.INTER)
        assertEquals(ReaderFontFamily.INTER, viewModel.uiState.value.readerFontFamily)
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

    @Test
    fun testOccurrencesLookupAndOfflineVerse() = runTest {
        advanceUntilIdle()

        // Seed KjvService occurrences
        val occurrences = listOf(
            com.example.telugubible.data.model.StrongsOccurrence(
                bookId = 1,
                bookName = "Genesis",
                chapter = 1,
                verse = 1,
                rawText = "In the beginning<S><mark>7225</mark></S> God created",
                cleanText = "In the beginning God created",
                highlightedWords = listOf("beginning"),
                highlightRanges = listOf(7..15)
            )
        )
        kjvService.seedOccurrencesCache("H7225", occurrences)

        // Open occurrences for H7225
        viewModel.openOccurrences("H7225")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isOccurrencesLoading)
        assertNotNull(state.occurrencesStrongs)
        assertEquals("H7225", state.occurrencesStrongs?.id)
        assertEquals(1, state.occurrencesList.size)
        assertEquals("Genesis", state.occurrencesList[0].bookName)
        assertEquals("beginning", state.occurrencesList[0].highlightedWords[0])

        // Verify offline verse retrieval
        val verse = viewModel.getOfflineVerse(1, 1, 1)
        assertNotNull(verse)
        assertEquals(1, verse?.bookId)
        assertEquals(1, verse?.chapter)
        assertEquals(1, verse?.verse)
        assertNotNull(verse?.textTe)
        assertNotNull(verse?.textEn)

        // Dismiss occurrences
        viewModel.dismissOccurrences()
        assertNull(viewModel.uiState.value.occurrencesStrongs)
        assertTrue(viewModel.uiState.value.occurrencesList.isEmpty())
    }

    @Test
    fun chapterRecallSaveFailureShowsErrorWithoutRecordingProgress() = runTest {
        advanceUntilIdle()
        userDbHelper.writableDatabase.execSQL("CREATE TRIGGER reject_anchor BEFORE INSERT ON review_log WHEN NEW.item_kind = 'anchor' BEGIN SELECT RAISE(ABORT, 'injected failure'); END")
        viewModel.gradeChapterRecall(4)
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.value.chapterRecallError)
        assertFalse(viewModel.uiState.value.isChapterRecallSaving)
        assertFalse(viewModel.uiState.value.isAnchorDismissed)
        assertTrue(userDbHelper.getChapterProgress(1).isEmpty())
    }

    @Test
    fun chapterRecallDismissDoesNotGradeAndRepeatedTapsSaveOnce() = runTest {
        advanceUntilIdle()
        viewModel.dismissChapterRecall()
        assertTrue(userDbHelper.getChapterProgress(1).isEmpty())
        viewModel.selectBookAndChapterById(1, 1)
        advanceUntilIdle()
        viewModel.gradeChapterRecall(4)
        viewModel.gradeChapterRecall(4)
        assertTrue(viewModel.uiState.value.isChapterRecallSaving)
        advanceUntilIdle()
        assertEquals(1, userDbHelper.getChapterProgress(1)[1]?.attempts)
        assertFalse(viewModel.uiState.value.isChapterRecallSaving)
    }

    @Test
    fun testChapterRecallGradingAndDismissal() = runTest {
        advanceUntilIdle()

        // Set book to Genesis (1), Chapter 1
        viewModel.selectBookAndChapterById(1, 1)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.currentBook?.id)
        assertEquals(1, state.currentChapter)
        assertFalse(state.isAnchorDismissed)

        // Grade chapter recall with score 4 (Good)
        viewModel.gradeChapterRecall(4)
        advanceUntilIdle()

        val updatedProgress = userDbHelper.getChapterProgress(1)[1]
        assertNotNull(updatedProgress)
        assertEquals(1, updatedProgress?.attempts)

        // Dismiss recall
        viewModel.dismissChapterRecall()
        assertTrue(viewModel.uiState.value.isAnchorDismissed)

        // Changing chapter resets dismissed status
        viewModel.selectBookAndChapterById(1, 2)
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.isAnchorDismissed)
    }

    @Test
    fun testBibleVersionSwitching() = runTest {
        advanceUntilIdle()

        // Default or initial version
        assertEquals("LSB", viewModel.uiState.value.activeVersion)

        // Switch to TELIRV (Telugu)
        viewModel.setBibleVersion("TELIRV")
        advanceUntilIdle()

        assertEquals("TELIRV", viewModel.uiState.value.activeVersion)
        assertEquals(BibleLanguage.TELUGU, viewModel.uiState.value.language)

        // Switch to TBSI (Tamil)
        viewModel.setBibleVersion("TBSI")
        advanceUntilIdle()

        assertEquals("TBSI", viewModel.uiState.value.activeVersion)
        assertEquals(BibleLanguage.TAMIL, viewModel.uiState.value.language)

        // Switch to ESV
        viewModel.setBibleVersion("ESV")
        advanceUntilIdle()

        assertEquals("ESV", viewModel.uiState.value.activeVersion)
        assertEquals(BibleLanguage.ENGLISH, viewModel.uiState.value.language)
    }

    @Test
    fun testAnchorRevealAndSceneToggle() = runTest {
        advanceUntilIdle()

        // Genesis 1 has anchor "LIGHT"
        assertNotNull(viewModel.uiState.value.currentAnchor)
        assertEquals("LIGHT", viewModel.uiState.value.currentAnchor?.word)

        // Initially in 'tap' mode, anchor word is hidden
        assertFalse(viewModel.uiState.value.anchorWordRevealed)
        assertFalse(viewModel.uiState.value.showAnchorScene)

        // Reveal anchor word
        viewModel.revealAnchorWord()
        assertTrue(viewModel.uiState.value.anchorWordRevealed)
        assertTrue(viewModel.uiState.value.showAnchorScene)

        // Toggle scene off
        viewModel.toggleAnchorScene()
        assertTrue(viewModel.uiState.value.anchorWordRevealed)
        assertFalse(viewModel.uiState.value.showAnchorScene)

        // Toggle scene back on
        viewModel.toggleAnchorScene()
        assertTrue(viewModel.uiState.value.showAnchorScene)
    }

    @Test
    fun testReadingOptionsToggle() = runTest {
        advanceUntilIdle()

        // Default settings
        assertTrue(viewModel.uiState.value.showSectionHeadings)
        assertFalse(viewModel.uiState.value.bionicReading)

        // Toggle bionic reading
        viewModel.toggleReadingOption("bionicReading")
        advanceUntilIdle()
        assertTrue(viewModel.uiState.value.bionicReading)

        // Toggle section headings
        viewModel.toggleReadingOption("showSectionHeadings")
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.showSectionHeadings)

        // Toggle options menu visibility
        viewModel.toggleReadingOptions(true)
        assertTrue(viewModel.uiState.value.showReadingOptions)
        viewModel.toggleReadingOptions(false)
        assertFalse(viewModel.uiState.value.showReadingOptions)
    }

    @Test
    fun testFlashVerse() = runTest {
        advanceUntilIdle()
        assertNull(viewModel.uiState.value.flashVerse)

        viewModel.setFlashVerse(5)
        assertEquals(5, viewModel.uiState.value.flashVerse)

        viewModel.setFlashVerse(null)
        assertNull(viewModel.uiState.value.flashVerse)
    }
}
