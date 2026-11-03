package com.example.telugubible.ui.reader

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CropFree
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.example.telugubible.data.model.BibleTranslation
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.theme.*
import com.example.telugubible.ui.bible.CommentarySheet
import com.example.telugubible.util.BookNameUtils
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

private data class VerseJump(val bookId: Int, val chapter: Int, val verse: Int)
private data class ReferenceReturnPoint(val bookId: Int, val chapter: Int, val selected: Set<Int>, val index: Int, val offset: Int, val wordStudy: ReaderUiState? = null)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChapterReaderScreen(
    viewModel: ReaderViewModel,
    onBack: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val occurrenceListState = rememberLazyListState()
    var lastOccurrenceId by remember { mutableStateOf<String?>(null) }
    val clipboardManager = LocalClipboardManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showCommentarySheet by remember { mutableStateOf(false) }
    var totalDragX by remember { mutableFloatStateOf(0f) }
    var recallRevealed by remember { mutableStateOf(false) }
    var recallStarted by remember { mutableStateOf(false) }
    var isImmersed by remember { mutableStateOf(false) }
    var immersiveChromeVisible by remember { mutableStateOf(true) }
    var pendingVerseJump by remember { mutableStateOf<VerseJump?>(null) }
    var referenceReturnPoint by remember { mutableStateOf<ReferenceReturnPoint?>(null) }
    var flashVerseTop by remember { mutableStateOf<Float?>(null) }
    var listTop by remember { mutableFloatStateOf(0f) }
    var showMemorizeSheet by remember { mutableStateOf(false) }
    var selectionBarHeightPx by remember { mutableIntStateOf(0) }

    val chromeVisible = !isImmersed || immersiveChromeVisible
    LaunchedEffect(state.occurrencesStrongs?.id) {
        val id = state.occurrencesStrongs?.id
        if (id != null && id != lastOccurrenceId) {
            occurrenceListState.scrollToItem(0)
            lastOccurrenceId = id
        }
    }
    BackHandler(enabled = isImmersed) {
        isImmersed = false
        immersiveChromeVisible = true
        viewModel.stopTts()
    }
    val returnFromReference: () -> Unit = {
        val origin = referenceReturnPoint
        referenceReturnPoint = null
        if (origin != null) {
            pendingVerseJump = null
            scope.launch {
                viewModel.restoreReadingContext(origin.bookId, origin.chapter, origin.selected)
                withFrameNanos { }
                listState.scrollToItem(origin.index, origin.offset)
                origin.wordStudy?.let { viewModel.restoreWordStudy(it) }
            }
        } else onBack?.invoke()
    }
    BackHandler(enabled = referenceReturnPoint != null && !isImmersed && state.crossRefSheetVerses == null) {
        returnFromReference()
    }

    // Scroll to top and reset recall when book or chapter changes
    LaunchedEffect(state.currentBook?.id, state.currentChapter) {
        listState.scrollToItem(0)
        recallRevealed = false
        recallStarted = false
    }

    // Show toast message if present
    LaunchedEffect(state.toastMessage) {
        state.toastMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearToast()
        }
    }

    var headerHeightPx by remember { mutableIntStateOf(0) }
    val density = LocalDensity.current
    var bottomHeightPx by remember { mutableIntStateOf(0) }
    val bottomHeightDp = with(density) { bottomHeightPx.toDp() }
    val headerHeightDp = with(density) { headerHeightPx.toDp() }
    val topContentPadding = remember(headerHeightDp) {
        if (headerHeightDp > 0.dp) headerHeightDp + 16.dp else 165.dp
    }

    // Precise reading progress calculation (0f to 1f) - tracks scroll progress smoothly
    val scrollProgress by remember {
        derivedStateOf {
            val layoutInfo = listState.layoutInfo
            val total = layoutInfo.totalItemsCount
            if (total <= 1) return@derivedStateOf 0f

            val visibleItems = layoutInfo.visibleItemsInfo
            if (visibleItems.isEmpty()) return@derivedStateOf 0f

            val first = visibleItems.first()
            val last = visibleItems.last()

            // If reached the end of the chapter
            if (last.index == total - 1) {
                val endOffset = last.offset + last.size
                if (endOffset <= layoutInfo.viewportEndOffset) return@derivedStateOf 1f
            }

            // If at the very top of the chapter
            if (first.index == 0 && listState.firstVisibleItemScrollOffset == 0) {
                return@derivedStateOf 0f
            }

            val firstItemSize = if (first.size > 0) first.size.toFloat() else 1f
            val itemOffsetFraction = (listState.firstVisibleItemScrollOffset.toFloat() / firstItemSize).coerceIn(0f, 1f)
            val frac = (first.index.toFloat() + itemOffsetFraction) / (total - 1).toFloat()
            frac.coerceIn(0f, 1f)
        }
    }

    val animatedProgress by animateFloatAsState(
        targetValue = scrollProgress,
        animationSpec = tween(durationMillis = 100, easing = LinearOutSlowInEasing),
        label = "readingProgress"
    )

    // Paragraph grouping
    val isPsalms = state.currentBook?.id == 19
    val paragraphs = remember(state.verses, state.paragraphBreaks, isPsalms, state.activeVersion) {
        ParagraphBuilder.buildParagraphs(state.verses, state.paragraphBreaks, isPsalms, state.activeVersion)
    }
    LaunchedEffect(pendingVerseJump, state.isLoading, state.currentBook?.id, state.currentChapter, paragraphs) {
        val jump = pendingVerseJump ?: return@LaunchedEffect
        if (state.isLoading || state.currentBook?.id != jump.bookId || state.currentChapter != jump.chapter) return@LaunchedEffect
        val index = paragraphs.indexOfFirst { paragraph -> paragraph.verses.any { it.verse == jump.verse } }
        if (index < 0) { pendingVerseJump = null; return@LaunchedEffect }
        flashVerseTop = null
        viewModel.setFlashVerse(jump.verse)
        listState.scrollToItem(index)
        withFrameNanos { }
        val verseTop = withTimeoutOrNull(3000) { snapshotFlow { flashVerseTop }.filterNotNull().first() }
        if (verseTop != null) {
            val desiredTop = listTop + if (chromeVisible) headerHeightPx + with(density) { 16.dp.toPx() } else with(density) { 16.dp.toPx() }
            listState.scrollBy(verseTop - desiredTop)
        }
        pendingVerseJump = null
    }

    // Book display names & navigation labels
    val currentBook = state.currentBook
    val currentChapter = state.currentChapter
    val books = state.books
    val bookIndex = if (currentBook != null) books.indexOfFirst { it.id == currentBook.id } else -1
    val bookDisplayName = currentBook?.let { BookNameUtils.getBookDisplayName(it, state.activeVersion) } ?: ""
    val shortName = currentBook?.let { BookNameUtils.getBookShortName(it, state.activeVersion) } ?: ""

    val prevLabel = when {
        currentChapter > 1 -> "$shortName ${currentChapter - 1}"
        bookIndex > 0 -> {
            val prevBook = books[bookIndex - 1]
            "${BookNameUtils.getBookShortName(prevBook, state.activeVersion)} ${prevBook.chapters}"
        }
        else -> null
    }

    val nextLabel = when {
        currentBook != null && currentChapter < currentBook.chapters -> "$shortName ${currentChapter + 1}"
        bookIndex >= 0 && bookIndex < books.size - 1 -> {
            val nextBook = books[bookIndex + 1]
            "${BookNameUtils.getBookShortName(nextBook, state.activeVersion)} 1"
        }
        else -> null
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(state.readerTheme.backgroundColor)
    ) {
        // --- 1. Main Scripture Text Body ---
        if (state.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = state.readerTheme.accentColor)
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .onGloballyPositioned { listTop = it.positionInRoot().y }
                    .pointerInput(state.currentBook?.id, state.currentChapter) {
                        detectHorizontalDragGestures(
                            onDragStart = { totalDragX = 0f },
                            onDragEnd = {
                                if (totalDragX < -140f) {
                                    viewModel.nextChapter()
                                } else if (totalDragX > 140f) {
                                    viewModel.previousChapter()
                                }
                                totalDragX = 0f
                            },
                            onDragCancel = { totalDragX = 0f },
                            onHorizontalDrag = { _, dragAmount ->
                                totalDragX += dragAmount
                            }
                        )
                    },
                contentPadding = PaddingValues(
                    top = if (chromeVisible) topContentPadding else 16.dp,
                    bottom = if (state.selectedVerses.isNotEmpty()) with(density) { selectionBarHeightPx.toDp() } + 16.dp else if (chromeVisible) bottomHeightDp + 24.dp else 24.dp
                )
            ) {
                // Typographic Paragraph Flow
                items(paragraphs, key = { it.id }) { paragraph ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        contentAlignment = Alignment.TopCenter
                    ) {
                        Box(modifier = Modifier.widthIn(max = 620.dp)) {
                            ParagraphView(
                                paragraph = paragraph,
                                selectedVerses = state.selectedVerses,
                                flashVerse = state.flashVerse,
                                memorizedVerses = state.memorizedVerses,
                                activeTtsVerse = state.activeTtsVerse,
                                otQuotes = state.otQuotes,
                                showSectionHeadings = state.showSectionHeadings,
                                showVerseNumbers = state.showVerseNumbers,
                                showParagraphMarks = state.showParagraphMarks,
                                showCrossRefMarkers = state.showCrossRefMarkers,
                                crossRefCounts = state.crossRefCounts,
                                bionicReading = state.bionicReading,
                                bionicIntensity = state.bionicIntensity,
                                lineSpacing = state.lineSpacing,
                                fontSizeScale = state.fontSizeScale,
                                readerFontFamily = state.readerFontFamily,
                                readerTheme = state.readerTheme,
                                language = state.language,
                                onVerseClick = { vNum ->
                                    viewModel.toggleVerseSelection(vNum)
                                },
                                onCrossRefClick = { vNum ->
                                    viewModel.openCrossReferences(listOf(vNum))
                                },
                                onEmptySpaceClick = {
                                    if (isImmersed) immersiveChromeVisible = !immersiveChromeVisible
                                },
                                onFlashVersePosition = { flashVerseTop = it }
                            )
                        }
                    }
                }

                // End-of-Chapter Recall Card (Remora Parity)
                if (state.currentAnchor != null && !state.isAnchorDismissed) {
                    item(key = "end_of_chapter_recall") {
                        Spacer(modifier = Modifier.height(28.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                            contentAlignment = Alignment.TopCenter
                        ) {
                            Box(modifier = Modifier.widthIn(max = 620.dp)) {
                                if (recallStarted) EndOfChapterRecallCard(
                                    bookKey = state.currentBook?.key ?: "genesis",
                                    chapter = state.currentChapter,
                                    anchor = state.currentAnchor!!,
                                    revealed = recallRevealed,
                                    isSaving = state.isChapterRecallSaving,
                                    errorMessage = state.chapterRecallError,
                                    onReveal = { recallRevealed = true },
                                    onGrade = { score ->
                                        viewModel.gradeChapterRecall(score)
                                    },
                                    onDismiss = {
                                        viewModel.dismissChapterRecall()
                                        recallRevealed = false
                                    }
                                ) else Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("End of chapter", style = MaterialTheme.typography.titleMedium)
                                    Text("Continue reading, or take a moment to recall the chapter theme.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    TextButton(onClick = { recallStarted = true }) { Text("Recall chapter theme") }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(36.dp))
                    }
                }
            }
        }

        if (chromeVisible) ReaderHeader(
            reference = "$bookDisplayName $currentChapter",
            version = BibleTranslation.getLabel(state.activeVersion),
            isSpeaking = state.isTtsSpeaking,
            onBack = { if (isImmersed) { isImmersed = false; viewModel.stopTts() } else returnFromReference() },
            onNavigator = { viewModel.toggleBookSelector(true) },
            onSettings = { viewModel.toggleSettings(true) },
            onListen = { viewModel.toggleTts() },
            onImmerse = { isImmersed = true; immersiveChromeVisible = true },
            onCommentary = { showCommentarySheet = true },
            modifier = Modifier.align(Alignment.TopCenter).onGloballyPositioned {
                headerHeightPx = it.size.height
            },
            onHideControls = if (isImmersed) ({ immersiveChromeVisible = false }) else null
        )
        if (isImmersed && !chromeVisible) {
            FilledTonalIconButton(
                onClick = { immersiveChromeVisible = true },
                modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(8.dp)
            ) { Icon(Icons.Default.Fullscreen, contentDescription = "Show reading controls") }
        }
        if (chromeVisible && state.selectedVerses.isEmpty()) {
            ReaderChapterNavigation(
                chapter = currentChapter,
                previousEnabled = prevLabel != null && !state.isLoading,
                nextEnabled = nextLabel != null && !state.isLoading,
                onPrevious = viewModel::previousChapter,
                onNext = viewModel::nextChapter,
                onNavigator = { viewModel.toggleBookSelector(true) },
                progress = animatedProgress,
                modifier = Modifier.align(Alignment.BottomCenter).onGloballyPositioned {
                    bottomHeightPx = it.size.height
                }
            )
        }

        // --- 5. Floating Multi-Verse Selection Action Bar ---
        AnimatedVisibility(
            visible = state.selectedVerses.isNotEmpty(),
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            SelectedVerseActions(
                count = state.selectedVerses.size,
                onClear = viewModel::clearVerseSelection,
                onCopy = {
                    val selectedCount = state.selectedVerses.size
                    clipboardManager.setText(AnnotatedString(viewModel.formatSelectedVersesForClipboard()))
                    scope.launch { snackbarHostState.showSnackbar("Copied $selectedCount verse(s) to clipboard") }
                    viewModel.clearVerseSelection()
                },
                onReferences = { viewModel.openCrossReferences(state.selectedVerses.sorted()) },
                onMemorize = { showMemorizeSheet = true },
                modifier = Modifier.onGloballyPositioned { selectionBarHeightPx = it.size.height }
            )
        }
        // Snackbar host
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp)
        )

        if (showMemorizeSheet && state.selectedVerses.isNotEmpty()) {
            val bookTitle = state.currentBook?.let { BookNameUtils.getBookDisplayName(it, state.activeVersion) } ?: ""
            MemorizeVersesSheet(
                book = bookTitle,
                chapter = state.currentChapter,
                selected = state.selectedVerses.sorted(),
                topics = state.topics,
                onCreateTopic = { name, result -> viewModel.createTopic(name, result) },
                onAdd = { combine, topics, startNow, keyword ->
                    viewModel.addSelectedVersesToMemory(combine, topics, startNow, keyword)
                    showMemorizeSheet = false
                },
                onDismiss = { showMemorizeSheet = false }
            )
        }
        // --- 6. Modal Sheets & Dialogs ---
        // Unified Verse Connections Sheet (→ References, ← Referenced by, Same Hebrew/Greek word)
        if (state.crossRefSheetVerses != null) {
            val bookName = state.currentBook?.nameEn ?: ""
            val ch = state.currentChapter
            val versesStr = state.crossRefSheetVerses!!.joinToString(", ")
            val label = "$bookName $ch:$versesStr"
            val booksMap = remember(state.books) { state.books.associateBy { it.id } }

            CrossReferenceSheet(
                fromRefLabel = label,
                crossReferences = state.crossRefsForSheet,
                language = state.language,
                onDismiss = { viewModel.dismissCrossReferences() },
                onNavigateToTarget = { bId, targetCh, targetVerse ->
                    if (referenceReturnPoint == null) {
                        state.currentBook?.let { book ->
                            referenceReturnPoint = ReferenceReturnPoint(book.id, state.currentChapter, state.selectedVerses, listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset)
                        }
                    }
                    viewModel.dismissCrossReferences()
                    pendingVerseJump = VerseJump(bId, targetCh, targetVerse)
                    viewModel.selectBookAndChapterById(bId, targetCh)
                },
                connectionsData = state.connectionsData,
                minVotes = state.connectionsMinVotes,
                initialSection = state.connectionsInitialSection,
                quoteTextEn = state.connectionsQuoteTextEn,
                quoteTextTe = state.connectionsQuoteTextTe,
                quoteTextTa = state.connectionsQuoteTextTa,
                activeVersion = state.activeVersion,
                booksMap = booksMap,
                wordOccurrencesMap = state.stepBibleWordOccurrences,
                onMinVotesChange = { newMin -> viewModel.setConnectionsMinVotes(newMin) },
                onSelectVid = { vid -> viewModel.openConnectionsForVid(vid) },
                onExpandWord = { wordId -> viewModel.loadStepBibleWordOccurrences(wordId) }
            )
        }

        // Dual-Column Book/Chapter Navigator
        if (state.showBookSelector) {
            PassageNavigator(
                books = state.books,
                currentBook = state.currentBook,
                currentChapter = state.currentChapter,
                activeVersion = state.activeVersion,
                onVersionChange = { v -> viewModel.setBibleVersion(v) },
                onSelect = { book, chapter ->
                    viewModel.selectBookAndChapter(book, chapter)
                },
                currentVerseNumbers = state.verses.map { it.verse },
                loadVerseNumbers = viewModel::getPassageVerseNumbers,
                onSelectVerse = { book, chapter, verse ->
                    pendingVerseJump = VerseJump(book.id, chapter, verse)
                    if (book.id != state.currentBook?.id || chapter != state.currentChapter) {
                        viewModel.selectBookAndChapter(book, chapter)
                    }
                },
                onDismiss = { viewModel.toggleBookSelector(false) }
            )
        }

        // Original Words Sheet
        if (state.originalWordsVerse != null) {
            val bookName = state.currentBook?.nameEn ?: ""
            val ch = state.currentChapter
            val v = state.originalWordsVerse!!
            OriginalWordsSheet(
                verseRefLabel = "$bookName $ch:$v",
                isOldTestament = (state.currentBook?.id ?: 1) <= 39,
                words = state.originalWordsList,
                isLoading = state.isOriginalWordsLoading,
                onSelectStrongs = { entry ->
                    viewModel.lookupStrongs(entry.id)
                },
                onViewOccurrences = { strongsId ->
                    viewModel.openOccurrences(strongsId)
                },
                onRefClick = { refId ->
                    viewModel.lookupStrongs(refId)
                },
                onDismiss = { viewModel.dismissOriginalWords() }
            )
        }

        // Settings Sheet
        if (state.showSettings) {
            SettingsSheet(
                fontSizeScale = state.fontSizeScale,
                readerFontFamily = state.readerFontFamily,
                lineSpacing = state.lineSpacing,
                readerTheme = state.readerTheme,
                bionicReading = state.bionicReading,
                bionicIntensity = state.bionicIntensity,
                showVerseNumbers = state.showVerseNumbers,
                onFontSizeChange = { viewModel.setFontSizeScale(it) },
                onFontFamilyChange = { viewModel.setReaderFontFamily(it) },
                onLineSpacingChange = { viewModel.setLineSpacing(it) },
                onThemeChange = { viewModel.setReaderTheme(it) },
                onBionicReadingChange = { viewModel.setBionicReading(it) },
                onBionicIntensityChange = { viewModel.setBionicIntensity(it) },
                onShowVerseNumbersChange = { viewModel.setShowVerseNumbers(it) },
                onReset = { viewModel.resetReadingSettings() },
                onDismiss = { viewModel.toggleSettings(false) }
            )
        }

        // Strong's Concordance Dialog
        state.selectedStrongs?.let { entry ->
            StrongsDialog(
                entry = entry,
                onViewOccurrences = { strongsId ->
                    viewModel.openOccurrences(strongsId)
                },
                onRefClick = { refId ->
                    viewModel.lookupStrongs(refId)
                },
                onDismiss = { viewModel.dismissStrongs() }
            )
        }

        // Strong's Occurrences Sheet
        state.occurrencesStrongs?.let { entry ->
            StrongsOccurrencesSheet(
                strongsEntry = entry,
                occurrences = state.occurrencesList,
                isLoading = state.isOccurrencesLoading,
                errorMessage = state.occurrencesError,
                onNavigateToVerse = { bId, chapter, verse ->
                    if (referenceReturnPoint == null) {
                        state.currentBook?.let { book ->
                            referenceReturnPoint = ReferenceReturnPoint(book.id, state.currentChapter, state.selectedVerses, listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset, state)
                        }
                    }
                    viewModel.dismissOccurrences()
                    viewModel.dismissOriginalWords()
                    viewModel.dismissStrongs()
                    pendingVerseJump = VerseJump(bId, chapter, verse)
                    viewModel.selectBookAndChapterById(bId, chapter)
                },
                onLookupOfflineVerse = { bId, chapter, verse ->
                    viewModel.getOfflineVerse(bId, chapter, verse)
                },
                onDismiss = { viewModel.dismissOccurrences() },
                listState = occurrenceListState
            )
        }

        // Commentary Sheet
        if (showCommentarySheet && state.currentBook != null) {
            CommentarySheet(
                bookId = state.currentBook!!.id,
                bookNameEn = state.currentBook!!.nameEn,
                onDismiss = { showCommentarySheet = false }
            )
        }
    }
}

@Composable
fun AsyncNativeImage(
    url: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    alignment: androidx.compose.ui.Alignment = androidx.compose.ui.Alignment.TopCenter
) {
    var imageBitmap by remember(url) { mutableStateOf<androidx.compose.ui.graphics.ImageBitmap?>(null) }

    LaunchedEffect(url) {
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.instanceFollowRedirects = true
                conn.connect()
                if (conn.responseCode == 200) {
                    val stream = conn.inputStream
                    val dec = android.graphics.BitmapFactory.decodeStream(stream)
                    if (dec != null) {
                        imageBitmap = dec.asImageBitmap()
                    }
                }
            } catch (_: Exception) {
                // Silently fallback to placeholder box
            }
        }
    }

    if (imageBitmap != null) {
        androidx.compose.foundation.Image(
            bitmap = imageBitmap!!,
            contentDescription = contentDescription,
            contentScale = contentScale,
            alignment = alignment,
            modifier = modifier
        )
    } else {
        Box(
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "✝",
                fontSize = 28.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
            )
        }
    }
}

@Composable
internal fun EndOfChapterRecallCard(
    bookKey: String,
    chapter: Int,
    anchor: ChapterAnchor,
    revealed: Boolean,
    isSaving: Boolean,
    errorMessage: String?,
    onReveal: () -> Unit,
    onGrade: (Int) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Recall this chapter", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss, enabled = !isSaving) { Icon(Icons.Default.Close, contentDescription = "Dismiss chapter recall") }
            }
            if (!revealed) {
                Text("What is the theme of chapter $chapter?", style = MaterialTheme.typography.bodyLarge)
                FilledTonalButton(onClick = onReveal, modifier = Modifier.fillMaxWidth()) { Text("Show answer") }
            } else {
                Text(anchor.word, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                if (anchor.scene.isNotBlank()) Text(anchor.scene, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                AsyncNativeImage(
                    url = "https://kanakaiah.github.io/chapters/$bookKey/ch$chapter.jpg",
                    contentDescription = "Chapter illustration",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().heightIn(max = 180.dp).aspectRatio(2f).clip(MaterialTheme.shapes.medium).testTag("chapter-recall-illustration")
                )
                Text("Marking this recalled records a successful recall in your chapter progress.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (errorMessage != null) Text(errorMessage, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
                Button(onClick = { onGrade(4) }, enabled = !isSaving && errorMessage == null, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text(if (isSaving) "Saving…" else "Mark recalled")
                }
                TextButton(onClick = onDismiss, enabled = !isSaving) { Text("Not now") }
            }
        }
    }
}
