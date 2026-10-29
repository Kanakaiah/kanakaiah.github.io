package com.example.telugubible.ui.reader

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
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
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.example.telugubible.ui.practice.ImmersedReader
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalDensity
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
    var showMemorizeSheet by remember { mutableStateOf(false) }
    var selectedTopicIds by remember { mutableStateOf(setOf<String>()) }
    var isAddingGroup by remember { mutableStateOf(false) }
    var newGroupName by remember { mutableStateOf("") }
    var asOnePassage by remember { mutableStateOf(true) }
    var memoryHookText by remember { mutableStateOf("") }
    var startLearningNow by remember { mutableStateOf(true) }

    // Header and bottom bar stay visible matching book page (no auto-hide)
    val chromeVisible = true

    // Scroll to top and reset recall when book or chapter changes
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

    var headerHeightPx by remember { mutableIntStateOf(0) }
    val density = LocalDensity.current
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
    val paragraphs = remember(state.verses, state.paragraphBreaks, isPsalms) {
        ParagraphBuilder.buildParagraphs(state.verses, state.paragraphBreaks, isPsalms)
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

    var immersedVerseIndex by remember { mutableStateOf<Int?>(null) }

    if (immersedVerseIndex != null && state.verses.isNotEmpty()) {
        val safeIndex = (immersedVerseIndex ?: 0).coerceIn(0, state.verses.size - 1)

        LaunchedEffect(state.activeTtsVerse) {
            val activeVerse = state.activeTtsVerse
            if (activeVerse != null) {
                val targetIdx = state.verses.indexOfFirst { it.verse == activeVerse }
                if (targetIdx >= 0) {
                    immersedVerseIndex = targetIdx
                }
            }
        }

        val v = state.verses[safeIndex]
        val userVerse = com.example.telugubible.data.model.UserMemoryVerse(
            id = v.id,
            bookId = v.bookId,
            chapter = v.chapter,
            verse = v.verse,
            textEn = v.textEn,
            textTe = v.textTe,
            bookNameEn = currentBook?.nameEn ?: "Book",
            bookNameTe = currentBook?.nameTe ?: "Book"
        )
        ImmersedReader(
            verse = userVerse,
            index = safeIndex,
            total = state.verses.size,
            onPrev = {
                if (safeIndex > 0) immersedVerseIndex = safeIndex - 1
            },
            onNext = {
                if (safeIndex < state.verses.size - 1) immersedVerseIndex = safeIndex + 1
            },
            onExit = {
                viewModel.stopTts()
                immersedVerseIndex = null
            },
            isAutoPlaying = state.isTtsSpeaking,
            onToggleAutoPlay = { viewModel.toggleTts() },
            isEnglish = state.language == BibleLanguage.ENGLISH,
            bionicReading = state.bionicReading,
            recallMasking = false,
            serifTypography = state.readerFontFamily == ReaderFontFamily.MERRIWEATHER
        )
        return
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(state.readerTheme.backgroundColor)
    ) {
        // --- 0. Pinned Reading Progress Bar (Always visible at bottom, matching ImmersedReader) ---
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(3.5.dp)
                .background(state.readerTheme.accentColor.copy(alpha = 0.18f))
                .zIndex(100f)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = animatedProgress.coerceIn(0f, 1f))
                    .background(state.readerTheme.accentColor)
            )
        }

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
                    top = topContentPadding,
                    bottom = if (chromeVisible || state.selectedVerses.isNotEmpty()) 100.dp else 48.dp
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
                                    // Sticky chrome matching book page — do not auto-hide
                                }
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
                            }
                        }
                        Spacer(modifier = Modifier.height(36.dp))
                    }
                }
            }
        }

        // --- 2. Top Header (Auto-Hiding Chrome) ---
        AnimatedVisibility(
            visible = chromeVisible,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .zIndex(50f)
        ) {
            Surface(
                color = state.readerTheme.cardColor.copy(alpha = 0.96f),
                border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.12f)),
                shadowElevation = 6.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .onGloballyPositioned { coordinates ->
                        val h = coordinates.size.height
                        if (h > 0 && h != headerHeightPx) {
                            headerHeightPx = h
                        }
                    }
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(top = 4.dp, bottom = 12.dp)
                ) {
                    // Left: Back button
                    IconButton(
                        onClick = { onBack?.invoke() },
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(start = 4.dp, top = 2.dp)
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Go back",
                            tint = state.readerTheme.textColor
                        )
                    }

                    // Right: Reading Options & Immerse Reader Buttons
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(end = 4.dp, top = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Reading Options (Type) Button
                        IconButton(
                            onClick = { viewModel.toggleReadingOptions() },
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.TextFields,
                                contentDescription = "Reading Options",
                                tint = if (state.showReadingOptions) state.readerTheme.accentColor else state.readerTheme.textColor,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // Immerse Reader Button
                        IconButton(
                            onClick = { immersedVerseIndex = 0 },
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Fullscreen,
                                contentDescription = "Immerse Reading",
                                tint = state.readerTheme.textColor,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // Center: Chapter Title + Translation Badge on the same row
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 76.dp, vertical = 2.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "$bookDisplayName $currentChapter".uppercase(),
                                style = MaterialTheme.typography.headlineLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 26.sp,
                                    lineHeight = 32.sp,
                                    fontFamily = state.readerFontFamily.fontFamily,
                                    letterSpacing = (-0.02).sp
                                ),
                                color = state.readerTheme.textColor,
                                textAlign = TextAlign.Center,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )

                            // Translation Badge on the same row as the book name
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = state.readerTheme.accentColor.copy(alpha = 0.14f),
                                border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.35f)),
                                modifier = Modifier.clickable { viewModel.toggleBookSelector(true) }
                            ) {
                                Text(
                                    text = BibleTranslation.getLabel(state.activeVersion).uppercase(),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = state.readerTheme.accentColor,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // --- 3. Reading Options Dropdown Popover ---
        if (state.showReadingOptions) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clickable { viewModel.toggleReadingOptions(false) },
                contentAlignment = Alignment.TopEnd
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = state.readerTheme.cardColor,
                    border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.25f)),
                    shadowElevation = 16.dp,
                    modifier = Modifier
                        .padding(top = if (headerHeightDp > 0.dp) headerHeightDp + 6.dp else 120.dp, end = 16.dp)
                        .width(280.dp)
                        .clickable(enabled = false) {}
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Text Size Controls
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Text Size", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = state.readerTheme.textColor)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                OutlinedButton(
                                    onClick = { viewModel.decreaseFontSize() },
                                    enabled = state.fontSizeScale != FontSizeScale.XS,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                    modifier = Modifier.height(28.dp)
                                ) {
                                    Text(
                                        "-",
                                        fontWeight = FontWeight.Bold,
                                        color = if (state.fontSizeScale != FontSizeScale.XS) state.readerTheme.textColor else state.readerTheme.secondaryTextColor.copy(alpha = 0.35f)
                                    )
                                }
                                Text(
                                    text = state.fontSizeScale.label,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = state.readerTheme.textColor,
                                    modifier = Modifier.padding(horizontal = 10.dp)
                                )
                                OutlinedButton(
                                    onClick = { viewModel.increaseFontSize() },
                                    enabled = state.fontSizeScale != FontSizeScale.XL,
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                    modifier = Modifier.height(28.dp)
                                ) {
                                    Text(
                                        "+",
                                        fontWeight = FontWeight.Bold,
                                        color = if (state.fontSizeScale != FontSizeScale.XL) state.readerTheme.textColor else state.readerTheme.secondaryTextColor.copy(alpha = 0.35f)
                                    )
                                }
                            }
                        }

                        HorizontalDivider(color = state.readerTheme.accentColor.copy(alpha = 0.15f))

                        // Theme Palette Selector
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Theme", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = state.readerTheme.textColor)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                ReaderTheme.entries.forEach { themeOpt ->
                                    val isSelected = state.readerTheme == themeOpt
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = themeOpt.backgroundColor,
                                        border = BorderStroke(
                                            width = if (isSelected) 2.dp else 1.dp,
                                            color = if (isSelected) themeOpt.accentColor else state.readerTheme.secondaryTextColor.copy(alpha = 0.35f)
                                        ),
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(34.dp)
                                            .clickable { viewModel.setReaderTheme(themeOpt) }
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = themeOpt.label,
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = themeOpt.textColor
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        HorizontalDivider(color = state.readerTheme.accentColor.copy(alpha = 0.15f))

                        // Font Family
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Font", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = state.readerTheme.textColor)
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = state.readerTheme.cardColor,
                                border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.25f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(2.dp),
                                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    ReaderFontFamily.values().forEach { font ->
                                        val isSelected = state.readerFontFamily == font
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(if (isSelected) state.readerTheme.accentColor else Color.Transparent)
                                                .clickable { viewModel.setReaderFontFamily(font) }
                                                .padding(horizontal = 8.dp, vertical = 5.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = font.label,
                                                fontSize = 11.sp,
                                                fontFamily = font.fontFamily,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) Color.White else state.readerTheme.secondaryTextColor
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        HorizontalDivider(color = state.readerTheme.accentColor.copy(alpha = 0.15f))

                        // Bionic Reading Toggle
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Bionic Reading", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = state.readerTheme.textColor)
                                Text("Bold first letters", fontSize = 10.sp, color = state.readerTheme.secondaryTextColor)
                            }
                            Switch(
                                checked = state.bionicReading,
                                onCheckedChange = { viewModel.toggleReadingOption("bionicReading") },
                                colors = SwitchDefaults.colors(checkedThumbColor = state.readerTheme.accentColor)
                            )
                        }

                        HorizontalDivider(color = state.readerTheme.accentColor.copy(alpha = 0.15f))

                        // Display Toggles: Section Headings
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Section Headings", fontSize = 12.sp, color = state.readerTheme.textColor)
                            Checkbox(
                                checked = state.showSectionHeadings,
                                onCheckedChange = { viewModel.toggleReadingOption("showSectionHeadings") },
                                colors = CheckboxDefaults.colors(checkedColor = state.readerTheme.accentColor)
                            )
                        }

                        // Display Toggles: Verse Numbers
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Verse Numbers", fontSize = 12.sp, color = state.readerTheme.textColor)
                            Checkbox(
                                checked = state.showVerseNumbers,
                                onCheckedChange = { viewModel.toggleReadingOption("showVerseNumbers") },
                                colors = CheckboxDefaults.colors(checkedColor = state.readerTheme.accentColor)
                            )
                        }

                        // Display Toggles: Paragraph Marks ¶
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Paragraph Marks (¶)", fontSize = 12.sp, color = state.readerTheme.textColor)
                            Checkbox(
                                checked = state.showParagraphMarks,
                                onCheckedChange = { viewModel.toggleReadingOption("showParagraphMarks") },
                                colors = CheckboxDefaults.colors(checkedColor = state.readerTheme.accentColor)
                            )
                        }

                        // Display Toggles: Cross-Reference Markers ✻
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Cross-Ref Markers (✻)", fontSize = 12.sp, color = state.readerTheme.textColor)
                            Checkbox(
                                checked = state.showCrossRefMarkers,
                                onCheckedChange = { viewModel.toggleReadingOption("showCrossRefMarkers") },
                                colors = CheckboxDefaults.colors(checkedColor = state.readerTheme.accentColor)
                            )
                        }
                    }
                }
            }
        }

        // --- 4. Bottom Chapter Navigation Bar (Remora Parity) ---
        AnimatedVisibility(
            visible = chromeVisible && state.selectedVerses.isEmpty(),
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Surface(
                color = state.readerTheme.cardColor.copy(alpha = 0.96f),
                border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.12f)),
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Previous Chapter Button
                    TextButton(
                        onClick = { viewModel.previousChapter() },
                        enabled = prevLabel != null,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Previous", modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = prevLabel?.uppercase() ?: "START",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (prevLabel != null) state.readerTheme.textColor else state.readerTheme.secondaryTextColor.copy(alpha = 0.4f),
                            letterSpacing = 0.5.sp
                        )
                    }

                    // Center Navigator Pill (CH N ▾)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = state.readerTheme.cardColor,
                        border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.35f)),
                        modifier = Modifier.clickable { viewModel.toggleBookSelector(true) }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "CH $currentChapter",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = state.readerTheme.textColor,
                                letterSpacing = 0.5.sp
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = "Open Navigator",
                                tint = state.readerTheme.accentColor,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    // Next Chapter Button
                    TextButton(
                        onClick = { viewModel.nextChapter() },
                        enabled = nextLabel != null,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = nextLabel?.uppercase() ?: "END",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (nextLabel != null) state.readerTheme.textColor else state.readerTheme.secondaryTextColor.copy(alpha = 0.4f),
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(Icons.Default.ChevronRight, contentDescription = "Next", modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // --- 5. Floating Multi-Verse Selection Action Bar ---
        AnimatedVisibility(
            visible = state.selectedVerses.isNotEmpty(),
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Surface(
                tonalElevation = 8.dp,
                shadowElevation = 14.dp,
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                color = state.readerTheme.cardColor,
                border = BorderStroke(1.dp, state.readerTheme.accentColor.copy(alpha = 0.35f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { viewModel.clearVerseSelection() }) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear selection",
                                tint = state.readerTheme.secondaryTextColor,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Text(
                            text = "${state.selectedVerses.size} selected",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = state.readerTheme.textColor
                        )
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
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
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Copy", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Copy", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        }

                        // Refs Button
                        FilledTonalButton(
                            onClick = {
                                viewModel.openCrossReferences(state.selectedVerses.sorted())
                            },
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.MenuBook, contentDescription = "Refs", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Refs", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        }

                        // Memorize Button
                        Button(
                            onClick = {
                                showMemorizeSheet = true
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = RemoraGold, contentColor = Color.Black),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add to Memory", modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Memorize", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Snackbar host
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp)
        )

        // Memorize Verses Modal Sheet (Matching Mockup: Add to memory)
        if (showMemorizeSheet && state.selectedVerses.isNotEmpty()) {
            val sortedSelected = remember(state.selectedVerses) { state.selectedVerses.sorted() }
            val bookTitle = state.currentBook?.let { BookNameUtils.getBookDisplayName(it, state.activeVersion) } ?: ""
            val formattedRef = remember(sortedSelected, bookTitle, state.currentChapter) {
                if (sortedSelected.size > 1) {
                    "$bookTitle ${state.currentChapter}:${sortedSelected.first()}–${sortedSelected.last()}"
                } else if (sortedSelected.isNotEmpty()) {
                    "$bookTitle ${state.currentChapter}:${sortedSelected.first()}"
                } else ""
            }

            ModalBottomSheet(
                onDismissRequest = {
                    showMemorizeSheet = false
                    isAddingGroup = false
                    newGroupName = ""
                },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = Color(0xFF14120E),
                tonalElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 22.dp)
                        .padding(top = 4.dp, bottom = 36.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp)
                ) {
                    // Header: "Add to memory" + Reference
                    Column {
                        Text(
                            text = "Add to memory",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Serif,
                            color = RemoraTextPrimary,
                            letterSpacing = (-0.3).sp
                        )
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            text = formattedRef,
                            fontSize = 14.5.sp,
                            color = RemoraTextSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    // Segmented Mode Selector: As one passage vs As N verses
                    if (sortedSelected.size > 1) {
                        Surface(
                            shape = RoundedCornerShape(26.dp),
                            color = Color(0xFF1E1B17),
                            border = BorderStroke(1.dp, Color(0xFF332D24)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                        ) {
                            Row(modifier = Modifier.fillMaxSize()) {
                                Surface(
                                    onClick = { asOnePassage = true },
                                    shape = RoundedCornerShape(26.dp),
                                    color = if (asOnePassage) RemoraAccent else Color.Transparent,
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = "As one passage",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (asOnePassage) Color(0xFF14120E) else RemoraTextSecondary
                                        )
                                    }
                                }

                                Surface(
                                    onClick = { asOnePassage = false },
                                    shape = RoundedCornerShape(26.dp),
                                    color = if (!asOnePassage) RemoraAccent else Color.Transparent,
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = "As ${sortedSelected.size} verses",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (!asOnePassage) Color(0xFF14120E) else RemoraTextSecondary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Section 1: COLLECTIONS
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "COLLECTIONS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = RemoraTextMuted
                        )

                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            state.topics.forEach { topic ->
                                val isSelected = selectedTopicIds.contains(topic.id)
                                Surface(
                                    onClick = {
                                        selectedTopicIds = if (isSelected) {
                                            selectedTopicIds - topic.id
                                        } else {
                                            selectedTopicIds + topic.id
                                        }
                                    },
                                    shape = RoundedCornerShape(22.dp),
                                    color = Color(0xFF1E1B17),
                                    border = BorderStroke(1.dp, if (isSelected) RemoraAccent else Color(0xFF332D24))
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(18.dp)
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(if (isSelected) RemoraAccent else Color.Transparent)
                                                .border(
                                                    width = 1.dp,
                                                    color = if (isSelected) RemoraAccent else Color(0xFF6E6455),
                                                    shape = RoundedCornerShape(4.dp)
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (isSelected) {
                                                Icon(
                                                    Icons.Default.Check,
                                                    contentDescription = null,
                                                    tint = Color(0xFF14120E),
                                                    modifier = Modifier.size(13.dp)
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(9.dp))
                                        Text(
                                            text = topic.name,
                                            fontSize = 13.5.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) RemoraTextPrimary else RemoraTextSecondary
                                        )
                                    }
                                }
                            }

                            // New collection pill button
                            if (isAddingGroup) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .height(38.dp)
                                        .background(RemoraCardBgElevated, RoundedCornerShape(22.dp))
                                        .border(1.dp, RemoraAccent, RoundedCornerShape(22.dp))
                                        .padding(horizontal = 12.dp)
                                ) {
                                    BasicTextField(
                                        value = newGroupName,
                                        onValueChange = { newGroupName = it },
                                        singleLine = true,
                                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                            imeAction = androidx.compose.ui.text.input.ImeAction.Done
                                        ),
                                        keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                                            onDone = {
                                                val trimmed = newGroupName.trim()
                                                if (trimmed.isNotBlank()) {
                                                    viewModel.createTopic(trimmed) { created ->
                                                        selectedTopicIds = selectedTopicIds + created.id
                                                    }
                                                    newGroupName = ""
                                                    isAddingGroup = false
                                                }
                                            }
                                        ),
                                        textStyle = androidx.compose.ui.text.TextStyle(
                                            color = RemoraTextPrimary,
                                            fontSize = 13.sp
                                        ),
                                        modifier = Modifier.width(95.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    IconButton(
                                        onClick = {
                                            val trimmed = newGroupName.trim()
                                            if (trimmed.isNotBlank()) {
                                                viewModel.createTopic(trimmed) { created ->
                                                    selectedTopicIds = selectedTopicIds + created.id
                                                }
                                                newGroupName = ""
                                                isAddingGroup = false
                                            }
                                        },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(Icons.Default.Check, contentDescription = "Save", tint = RemoraAccent, modifier = Modifier.size(16.dp))
                                    }
                                }
                            } else {
                                Surface(
                                    onClick = { isAddingGroup = true },
                                    shape = RoundedCornerShape(22.dp),
                                    color = Color.Transparent,
                                    border = BorderStroke(1.dp, Color(0xFF5A4D3B)),
                                    modifier = Modifier.height(38.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 14.dp)
                                    ) {
                                        Text(
                                            text = "New collection",
                                            fontSize = 13.5.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = RemoraAccent
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Section 2: KEYWORD (YOUR MEMORY HOOK)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "KEYWORD (YOUR MEMORY HOOK)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                            color = RemoraTextMuted
                        )
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFF181512),
                            border = BorderStroke(1.dp, Color(0xFF332D24)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            BasicTextField(
                                value = memoryHookText,
                                onValueChange = { memoryHookText = it },
                                singleLine = true,
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    color = RemoraTextPrimary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium
                                ),
                                decorationBox = { innerTextField ->
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp, vertical = 14.dp)
                                    ) {
                                        if (memoryHookText.isEmpty()) {
                                            Text(
                                                text = "e.g. Forever",
                                                color = RemoraTextMuted.copy(alpha = 0.5f),
                                                fontSize = 15.sp
                                            )
                                        }
                                        innerTextField()
                                    }
                                }
                            )
                        }
                    }

                    // Section 3: Radio Options
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        // Start learning now
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { startLearningNow = true }
                                .padding(vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(22.dp)
                                    .border(
                                        width = 2.dp,
                                        color = if (startLearningNow) RemoraAccent else Color(0xFF7A7062),
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (startLearningNow) {
                                    Box(
                                        modifier = Modifier
                                            .size(11.dp)
                                            .background(RemoraAccent, CircleShape)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Text(
                                text = "Start learning now",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium,
                                color = RemoraTextPrimary
                            )
                        }

                        // First review tomorrow
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { startLearningNow = false }
                                .padding(vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(22.dp)
                                    .border(
                                        width = 2.dp,
                                        color = if (!startLearningNow) RemoraAccent else Color(0xFF7A7062),
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (!startLearningNow) {
                                    Box(
                                        modifier = Modifier
                                            .size(11.dp)
                                            .background(RemoraAccent, CircleShape)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Text(
                                text = "First review tomorrow",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium,
                                color = RemoraTextPrimary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Section 4: Primary Action Button (Matching Mockup: "Add 2 verses" / "Add passage")
                    Button(
                        onClick = {
                            viewModel.addSelectedVersesToMemory(
                                combineConsecutive = if (sortedSelected.size > 1) asOnePassage else false,
                                topicIds = selectedTopicIds.toList(),
                                startLearningNow = startLearningNow,
                                keyword = memoryHookText
                            )
                            showMemorizeSheet = false
                        },
                        shape = RoundedCornerShape(18.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = RemoraAccent,
                            contentColor = Color(0xFF14120E)
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Text(
                            text = when {
                                sortedSelected.size <= 1 -> "Add verse"
                                asOnePassage -> "Add passage"
                                else -> "Add ${sortedSelected.size} verses"
                            },
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF14120E)
                        )
                    }
                }
            }
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
                    viewModel.dismissCrossReferences()
                    viewModel.selectBookAndChapterById(bId, targetCh)
                    viewModel.setFlashVerse(targetVerse)
                },
                connectionsData = state.connectionsData,
                minVotes = state.connectionsMinVotes,
                initialSection = state.connectionsInitialSection,
                quoteTextEn = state.connectionsQuoteTextEn,
                quoteTextTe = state.connectionsQuoteTextTe,
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
                onNavigateToVerse = { bId, chapter, verse ->
                    viewModel.dismissOccurrences()
                    viewModel.dismissOriginalWords()
                    viewModel.dismissStrongs()
                    viewModel.selectBookAndChapterById(bId, chapter)
                    scope.launch {
                        listState.animateScrollToItem((verse - 1).coerceAtLeast(0))
                    }
                },
                onLookupOfflineVerse = { bId, chapter, verse ->
                    viewModel.getOfflineVerse(bId, chapter, verse)
                },
                onDismiss = { viewModel.dismissOccurrences() }
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "WHAT ANCHORS THIS CHAPTER?",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = theme.accentColor,
                    letterSpacing = 1.sp
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

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val imageUrl = "https://kanakaiah.github.io/chapters/$bookKey/ch$chapter.jpg"
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    AsyncNativeImage(
                        url = imageUrl,
                        contentDescription = "Chapter Anchor Image",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .then(if (!revealed) Modifier.blur(8.dp) else Modifier)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                if (!revealed) {
                    OutlinedButton(
                        onClick = onReveal,
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier
                            .weight(1f)
                            .height(52.dp)
                    ) {
                        Text(
                            text = "Tap to reveal",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = theme.textColor
                        )
                    }
                } else {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = anchor.word,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = theme.accentColor
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = anchor.scene,
                            style = MaterialTheme.typography.bodySmall,
                            fontStyle = FontStyle.Italic,
                            color = theme.secondaryTextColor,
                            lineHeight = 16.sp
                        )
                    }
                }
            }

            if (revealed) {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { onGrade(4) },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text("Got It", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
