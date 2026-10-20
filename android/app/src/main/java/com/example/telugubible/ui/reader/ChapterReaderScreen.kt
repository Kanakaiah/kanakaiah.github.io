package com.example.telugubible.ui.reader

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.ui.input.pointer.pointerInput
import com.example.telugubible.data.model.BibleTranslation
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.theme.*
import com.example.telugubible.ui.bible.CommentarySheet
import com.example.telugubible.util.BookNameUtils
import com.example.telugubible.util.StrongsParser
import androidx.compose.ui.graphics.asImageBitmap
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChapterReaderScreen(
    viewModel: ReaderViewModel,
    onBack: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    val clipboardManager = LocalClipboardManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showCommentarySheet by remember { mutableStateOf(false) }
    var totalDragX by remember { mutableFloatStateOf(0f) }
    var recallRevealed by remember { mutableStateOf(false) }

    // Scroll to top when book or chapter changes
    LaunchedEffect(state.currentBook?.id, state.currentChapter) {
        listState.scrollToItem(0)
        recallRevealed = false
    }

    // Show toast message if present
    LaunchedEffect(state.toastMessage) {
        state.toastMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearToast()
        }
    }

    Scaffold(
        containerColor = state.readerTheme.backgroundColor,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = state.readerTheme.textColor
                            )
                        }
                    }
                },
                title = {
                    val bookTitle = state.currentBook?.let { BookNameUtils.getBookDisplayName(it, state.activeVersion) } ?: ""
                    Surface(
                        onClick = { viewModel.toggleBookSelector(true) },
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.Start) {
                                Text(
                                    text = "$bookTitle ${state.currentChapter}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = state.readerTheme.textColor
                                )
                                Text(
                                    text = if (state.alphaMode) "KJV + Original Words" else "${BibleTranslation.getLabel(state.activeVersion)} Translation",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = state.readerTheme.accentColor
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(text = "▼", fontSize = 10.sp, color = state.readerTheme.accentColor)
                        }
                    }
                },
                actions = {
                    // Quick Version Selector Button
                    Surface(
                        onClick = { viewModel.toggleBookSelector(true) },
                        shape = RoundedCornerShape(8.dp),
                        color = state.readerTheme.accentColor.copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.35f)),
                        modifier = Modifier.height(34.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 8.dp)) {
                            Text(
                                text = BibleTranslation.getLabel(state.activeVersion),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = state.readerTheme.accentColor
                            )
                        }
                    }

                    // Alpha Study Mode Button
                    IconButton(onClick = { viewModel.toggleAlphaMode() }) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (state.alphaMode) state.readerTheme.accentColor else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "α",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (state.alphaMode) Color.White else state.readerTheme.textColor
                                )
                            }
                        }
                    }

                    // TTS Audio Playback Button
                    IconButton(onClick = { viewModel.toggleTts() }) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (state.isTtsSpeaking) RemoraGold else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (state.isTtsSpeaking) Icons.Default.Stop else Icons.Default.VolumeUp,
                                    contentDescription = "Read Aloud",
                                    tint = if (state.isTtsSpeaking) Color.Black else state.readerTheme.textColor,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    // Typography / Settings Button
                    IconButton(onClick = { viewModel.toggleSettings(true) }) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = state.fontSizeScale.label,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    }

                    // Commentary Series Button
                    IconButton(onClick = { showCommentarySheet = true }) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "📜",
                                    fontSize = 16.sp
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = state.readerTheme.cardColor
                )
            )
        },
        bottomBar = {
            if (state.selectedVerses.isEmpty()) {
                // Regular Chapter Navigation Bar
                Surface(
                    tonalElevation = 4.dp,
                    shadowElevation = 8.dp,
                    color = state.readerTheme.cardColor
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        FilledTonalButton(
                            onClick = { viewModel.previousChapter() },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("← Previous")
                        }

                        Text(
                            text = "Ch ${state.currentChapter} / ${state.currentBook?.chapters ?: 1}",
                            style = MaterialTheme.typography.labelMedium,
                            color = state.readerTheme.secondaryTextColor
                        )

                        Button(
                            onClick = { viewModel.nextChapter() },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Next →")
                        }
                    }
                }
            } else {
                // Multi-Selection Floating Action Bar (Remora Parity)
                Surface(
                    tonalElevation = 8.dp,
                    shadowElevation = 12.dp,
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    color = state.readerTheme.cardColor,
                    border = BorderStroke(1.dp, RemoraGold.copy(alpha = 0.3f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { viewModel.clearVerseSelection() }) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Clear selection",
                                    tint = state.readerTheme.secondaryTextColor
                                )
                            }
                            Text(
                                text = "${state.selectedVerses.size} selected",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = state.readerTheme.textColor
                            )
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Original Words Button (if 1 verse selected)
                            if (state.selectedVerses.size == 1) {
                                FilledTonalButton(
                                    onClick = {
                                        viewModel.openOriginalWords(state.selectedVerses.first())
                                    },
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text("α Words", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }

                            // Copy Button
                            FilledTonalButton(
                                onClick = {
                                    val text = viewModel.formatSelectedVersesForClipboard()
                                    clipboardManager.setText(AnnotatedString(text))
                                    scope.launch {
                                        snackbarHostState.showSnackbar("Copied ${state.selectedVerses.size} verse(s) to clipboard")
                                    }
                                    viewModel.clearVerseSelection()
                                },
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Copy", fontSize = 12.sp)
                            }

                            // Refs Button (Open Cross References)
                            FilledTonalButton(
                                onClick = {
                                    viewModel.openCrossReferences(state.selectedVerses.sorted())
                                },
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.MenuBook, contentDescription = "Refs", modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Refs", fontSize = 12.sp)
                            }

                            // Memorize Button
                            Button(
                                onClick = {
                                    viewModel.addSelectedVersesToMemory()
                                },
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = RemoraGold, contentColor = Color.Black),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Add to Memory", modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Memorize", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val baseFontSize = 18.sp * state.fontSizeScale.multiplier
            val baseLineHeight = baseFontSize * 1.6f

            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 16.dp)
                    .pointerInput(state.currentBook?.id, state.currentChapter) {
                        detectHorizontalDragGestures(
                            onDragStart = { totalDragX = 0f },
                            onDragEnd = {
                                if (totalDragX < -150f) {
                                    viewModel.nextChapter()
                                } else if (totalDragX > 150f) {
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
                contentPadding = PaddingValues(top = 12.dp, bottom = 48.dp)
            ) {
                // Chapter Illustration Card
                item(key = "header_illustration") {
                    val bookKey = state.currentBook?.key ?: "genesis"
                    val imageUrl = "https://kanakaiah.github.io/chapters/$bookKey/ch${state.currentChapter}.jpg"

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 20.dp)
                    ) {
                        AsyncNativeImage(
                            url = imageUrl,
                            contentDescription = "Chapter Illustration",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clip(RoundedCornerShape(16.dp))
                        )
                    }
                }

                // Verses List
                items(state.verses, key = { it.id }) { verse ->
                    val isParagraphStart = verse.verse in state.paragraphBreaks && verse.verse > 1
                    val isSelected = verse.verse in state.selectedVerses
                    val isSpeaking = state.activeTtsVerse == verse.verse
                    val hasCrossRefs = (state.crossRefCounts[verse.verse] ?: 0) > 0
                    val isOtQuote = verse.verse in state.otQuotes

                    val verseText = if (state.language == BibleLanguage.TELUGU) {
                        verse.textTe ?: verse.textEn ?: ""
                    } else {
                        verse.textEn ?: verse.textTe ?: ""
                    }

                    if (isParagraphStart) {
                        Spacer(modifier = Modifier.height(14.dp))
                    }

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = when {
                            isSelected -> state.readerTheme.accentColor.copy(alpha = 0.16f)
                            isSpeaking -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                            else -> Color.Transparent
                        },
                        border = when {
                            isSelected -> BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.5f))
                            isSpeaking -> BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.6f))
                            else -> null
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp)
                            .clickable { viewModel.toggleVerseSelection(verse.verse) }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Top
                            ) {
                                val annotatedText = buildAnnotatedString {
                                    // Verse Number
                                    withStyle(
                                        SpanStyle(
                                            fontSize = (baseFontSize.value * 0.65f).sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) state.readerTheme.accentColor else state.readerTheme.accentColor,
                                            baselineShift = BaselineShift.Superscript
                                        )
                                    ) {
                                        append("${verse.verse} ")
                                    }

                                    // Cross-Reference Indicator
                                    if (hasCrossRefs) {
                                        withStyle(
                                            SpanStyle(
                                                fontSize = (baseFontSize.value * 0.60f).sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraGold,
                                                baselineShift = BaselineShift.Superscript
                                            )
                                        ) {
                                            append("✻ ")
                                        }
                                    }

                                    // OT Quote Indicator
                                    if (isOtQuote) {
                                        withStyle(
                                            SpanStyle(
                                                fontSize = (baseFontSize.value * 0.55f).sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Color(0xFFEF5350),
                                                baselineShift = BaselineShift.Superscript
                                            )
                                        ) {
                                            append("[OT] ")
                                        }
                                    }

                                    append(verseText)
                                }

                                Text(
                                    text = annotatedText,
                                    fontSize = baseFontSize,
                                    lineHeight = baseLineHeight,
                                    fontFamily = state.readerFontFamily.fontFamily,
                                    color = state.readerTheme.textColor,
                                    modifier = Modifier.weight(1f)
                                )

                                // Quick individual xref tap button
                                if (hasCrossRefs) {
                                    IconButton(
                                        onClick = { viewModel.openCrossReferences(listOf(verse.verse)) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Text(
                                            text = "✻",
                                            color = RemoraGold,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }

                            // Alpha Mode Original Word Chips
                            if (state.alphaMode) {
                                val taggedKjv = state.kjvChapterVerses[verse.verse]
                                if (!taggedKjv.isNullOrBlank()) {
                                    val parsed = StrongsParser.parseTaggedText(taggedKjv, (state.currentBook?.id ?: 1) <= 39)
                                    val wordsWithStrongs = parsed.filter { !it.second.isNullOrBlank() }
                                    if (wordsWithStrongs.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        LazyRow(
                                            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            items(wordsWithStrongs) { (token, sId) ->
                                                Surface(
                                                    shape = RoundedCornerShape(6.dp),
                                                    color = state.readerTheme.accentColor.copy(alpha = 0.15f),
                                                    border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.35f)),
                                                    modifier = Modifier.clickable { sId?.let { viewModel.lookupStrongs(it) } }
                                                ) {
                                                    Text(
                                                        text = "${sId ?: ""} $token".trim(),
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = state.readerTheme.accentColor,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // End-of-Chapter Recall Card (Remora Parity)
                if (state.currentAnchor != null && !state.isAnchorDismissed) {
                    item(key = "end_of_chapter_recall") {
                        Spacer(modifier = Modifier.height(24.dp))
                        EndOfChapterRecallCard(
                            bookKey = state.currentBook?.key ?: "genesis",
                            chapter = state.currentChapter,
                            anchor = state.currentAnchor!!,
                            revealed = recallRevealed,
                            onReveal = { recallRevealed = true },
                            onGrade = { score ->
                                viewModel.gradeChapterRecall(score)
                                recallRevealed = false
                            },
                            onDismiss = {
                                viewModel.dismissChapterRecall()
                                recallRevealed = false
                            },
                            theme = state.readerTheme
                        )
                        Spacer(modifier = Modifier.height(32.dp))
                    }
                }
            }
        }

        // Cross Reference Modal Sheet
        if (state.crossRefSheetVerses != null) {
            val bookName = state.currentBook?.nameEn ?: ""
            val ch = state.currentChapter
            val versesStr = state.crossRefSheetVerses!!.joinToString(", ")
            val label = "$bookName $ch:$versesStr"

            CrossReferenceSheet(
                fromRefLabel = label,
                crossReferences = state.crossRefsForSheet,
                language = state.language,
                onDismiss = { viewModel.dismissCrossReferences() },
                onNavigateToTarget = { bookId, targetCh, verse ->
                    viewModel.dismissCrossReferences()
                    viewModel.selectBookAndChapterById(bookId, targetCh)
                }
            )
        }

        // Book and Chapter selector navigator ("Go to...")
        if (state.showBookSelector) {
            DualColumnNavigator(
                books = state.books,
                currentBook = state.currentBook,
                currentChapter = state.currentChapter,
                activeVersion = state.activeVersion,
                onVersionChange = { v -> viewModel.setBibleVersion(v) },
                onSelect = { book, chapter ->
                    viewModel.selectBookAndChapter(book, chapter)
                },
                onDismiss = { viewModel.toggleBookSelector(false) }
            )
        }

        // Original Words Modal Sheet
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

        // Settings sheet
        if (state.showSettings) {
            SettingsSheet(
                fontSizeScale = state.fontSizeScale,
                language = state.language,
                readerTheme = state.readerTheme,
                readerFontFamily = state.readerFontFamily,
                onIncreaseFontSize = { viewModel.increaseFontSize() },
                onDecreaseFontSize = { viewModel.decreaseFontSize() },
                onResetFontSize = { viewModel.resetFontSize() },
                onLanguageChange = { viewModel.setLanguage(it) },
                onThemeChange = { viewModel.setReaderTheme(it) },
                onFontFamilyChange = { viewModel.setReaderFontFamily(it) },
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
                onNavigateToVerse = { bookId, chapter, verse ->
                    viewModel.dismissOccurrences()
                    viewModel.dismissOriginalWords()
                    viewModel.dismissStrongs()
                    viewModel.selectBookAndChapterById(bookId, chapter)
                    scope.launch {
                        listState.animateScrollToItem((verse - 1).coerceAtLeast(0))
                    }
                },
                onLookupOfflineVerse = { bookId, chapter, verse ->
                    viewModel.getOfflineVerse(bookId, chapter, verse)
                },
                onDismiss = { viewModel.dismissOccurrences() }
            )
        }

        // Scholarly Commentary Sheet
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
    contentScale: ContentScale = ContentScale.Crop
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
private fun EndOfChapterRecallCard(
    bookKey: String,
    chapter: Int,
    anchor: ChapterAnchor,
    revealed: Boolean,
    onReveal: () -> Unit,
    onGrade: (Int) -> Unit,
    onDismiss: () -> Unit,
    theme: ReaderTheme,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = theme.cardColor,
        border = BorderStroke(1.dp, RemoraCardBorder),
        tonalElevation = 4.dp,
        shadowElevation = 8.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header: "WHAT ANCHORS THIS CHAPTER?" + Close (X)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "WHAT ANCHORS THIS CHAPTER?",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = theme.accentColor,
                        letterSpacing = 1.2.sp
                    )
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Dismiss",
                        tint = theme.secondaryTextColor,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Body: Thumbnail + Content
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                val imageUrl = "https://kanakaiah.github.io/chapters/$bookKey/ch$chapter.jpg"
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(RemoraCardBorder)
                        .border(1.dp, RemoraCardBorder, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncNativeImage(
                        url = imageUrl,
                        contentDescription = "Chapter $chapter",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .blur(if (revealed) 0.dp else 12.dp)
                    )
                    if (!revealed) {
                        Text(
                            text = "$chapter",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = theme.textColor.copy(alpha = 0.6f)
                        )
                    }
                }

                if (!revealed) {
                    OutlinedButton(
                        onClick = onReveal,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = Color.Transparent,
                            contentColor = theme.secondaryTextColor
                        )
                    ) {
                        Text(
                            text = "Tap to reveal",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                    }
                } else {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = anchor.word,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = theme.accentColor
                        )
                        if (anchor.scene.isNotBlank()) {
                            Text(
                                text = anchor.scene,
                                fontSize = 12.sp,
                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                color = theme.secondaryTextColor,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            // 4 Grading buttons when revealed
            if (revealed) {
                Spacer(modifier = Modifier.height(14.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val grades = listOf(
                        Triple(1, "Blank", GradeBlank),
                        Triple(3, "Hard", GradeHard),
                        Triple(4, "Good", GradeGood),
                        Triple(5, "Easy", GradeEasy)
                    )
                    grades.forEach { (score, label, color) ->
                        Button(
                            onClick = { onGrade(score) },
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = color.copy(alpha = 0.14f),
                                contentColor = color
                            ),
                            border = BorderStroke(1.dp, color.copy(alpha = 0.35f)),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
