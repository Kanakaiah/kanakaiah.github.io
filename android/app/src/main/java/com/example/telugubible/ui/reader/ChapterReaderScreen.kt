package com.example.telugubible.ui.reader

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.ui.input.pointer.pointerInput
import com.example.telugubible.theme.RemoraAccent
import com.example.telugubible.theme.RemoraAccentLight
import com.example.telugubible.theme.RemoraGold
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.theme.RemoraTextSecondary
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
    var totalDragX by remember { mutableFloatStateOf(0f) }

    // Scroll to top when book or chapter changes
    LaunchedEffect(state.currentBook?.id, state.currentChapter) {
        listState.scrollToItem(0)
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
                    val bookTitle = if (state.language == BibleLanguage.TELUGU) {
                        state.currentBook?.nameTe ?: ""
                    } else {
                        state.currentBook?.nameEn ?: ""
                    }
                    Surface(
                        onClick = { viewModel.toggleBookSelector(true) },
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "$bookTitle ${state.currentChapter}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = state.readerTheme.textColor
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "▼", fontSize = 11.sp, color = state.readerTheme.accentColor)
                        }
                    }
                },
                actions = {
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

        // Book and Chapter selector sheet
        if (state.showBookSelector) {
            BookSelectorSheet(
                books = state.books,
                currentBook = state.currentBook,
                onDismiss = { viewModel.toggleBookSelector(false) },
                onSelect = { book, chapter ->
                    viewModel.selectBookAndChapter(book, chapter)
                }
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
                onDismiss = { viewModel.dismissStrongs() }
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
