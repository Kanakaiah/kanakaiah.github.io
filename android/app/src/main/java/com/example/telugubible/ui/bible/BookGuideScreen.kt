package com.example.telugubible.ui.bible

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import com.example.telugubible.data.commentary.CommentaryData
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.BookGuide
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.GuideBlock
import com.example.telugubible.data.model.GuideKeyVerse
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import com.example.telugubible.theme.*
import com.example.telugubible.ui.common.ChapterPlateImage
import com.example.telugubible.util.BookNameUtils
import com.example.telugubible.ui.practice.ChainDrill

// Distribution palette cycled across blocks
private val BlockDistributionColors = listOf(
    Color(0xFFF59E0B), // Amber
    Color(0xFF3B82F6), // Blue
    Color(0xFF10B981), // Emerald
    Color(0xFFF97316), // Orange
    Color(0xFF6366F1), // Indigo
    Color(0xFF64748B), // Slate
    Color(0xFFEC4899)  // Pink
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookGuideScreen(
    viewModel: BookGuideViewModel,
    bookId: Int,
    onBack: () -> Unit,
    onOpenReader: (bookId: Int, chapter: Int) -> Unit,
    onSelectBook: (Int) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    var showCommentarySheet by remember { mutableStateOf(false) }
    var showPreachersSheet by remember { mutableStateOf(false) }
    var showIndexModal by remember { mutableStateOf(false) }
    var drillBlock by remember { mutableStateOf<Triple<String, List<ChapterAnchor>, Int>?>(null) }

    LaunchedEffect(bookId) {
        viewModel.loadBookGuide(bookId)
    }

    LaunchedEffect(state.toastMessage) {
        state.toastMessage?.let { msg ->
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    val currentBook = state.book
    val books = state.books
    val bookIndex = if (currentBook != null) books.indexOfFirst { it.id == currentBook.id } else -1
    val prevBook = if (bookIndex > 0) books[bookIndex - 1] else null
    val nextBook = if (bookIndex >= 0 && bookIndex < books.size - 1) books[bookIndex + 1] else null

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        state.book?.let { b ->
                            Text(
                                text = BookNameUtils.getBookDisplayName(b, state.activeVersion).uppercase(),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary,
                                textAlign = TextAlign.Center,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        } ?: Text("Study Guide", fontSize = 18.sp, color = RemoraTextPrimary)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = RemoraTextPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showCommentarySheet = true }) {
                        Icon(
                            Icons.AutoMirrored.Filled.MenuBook,
                            contentDescription = "Commentaries",
                            tint = RemoraAccentLight
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = RemoraBackground
                )
            )
        },
        bottomBar = {
            if (state.book != null) {
                Surface(
                    color = RemoraCardBg,
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Prev Book
                        if (prevBook != null) {
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable { onSelectBook(prevBook.id) }
                                    .padding(vertical = 4.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.ChevronLeft,
                                    contentDescription = "Previous Book",
                                    tint = RemoraTextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = BookNameUtils.getBookDisplayName(prevBook, state.activeVersion),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.widthIn(max = 110.dp)
                                )
                            }
                        } else {
                            Spacer(modifier = Modifier.width(40.dp))
                        }

                        // INDEX button
                        OutlinedButton(
                            onClick = { showIndexModal = true },
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(1.dp, RemoraCardBorder),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            modifier = Modifier.height(30.dp)
                        ) {
                            Text(
                                text = "INDEX",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = RemoraTextMuted
                            )
                        }

                        // Next Book
                        if (nextBook != null) {
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable { onSelectBook(nextBook.id) }
                                    .padding(vertical = 4.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = BookNameUtils.getBookDisplayName(nextBook, state.activeVersion),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.widthIn(max = 110.dp)
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = "Next Book",
                                    tint = RemoraTextSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        } else {
                            Spacer(modifier = Modifier.width(40.dp))
                        }
                    }
                }
            }
        },
        containerColor = RemoraBackground,
        modifier = modifier.fillMaxSize()
    ) { paddingValues ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = RemoraAccent)
            }
        } else {
            val book = state.book
            val guide = state.guide

            if (book == null || guide == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Study guide unavailable", color = RemoraTextSecondary)
                }
            } else {
                val anchorGroups = remember(guide.blocks, guide.anchors, book.chapters) {
                    partitionAnchorsByBlocks(guide.blocks, guide.anchors, book.chapters)
                }

                // Calculate item index of memory sentence for smooth jumping
                val blocksItemCount = if (guide.blocks.isNotEmpty()) 1 else 0
                val anchorsCount = if (guide.anchors.isNotEmpty()) 1 + anchorGroups.size else 0
                val keyVersesCount = if (guide.keyVerses.isNotEmpty()) 1 else 0
                val memorySentenceItemIndex = 1 + blocksItemCount + anchorsCount + keyVersesCount

                LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = paddingValues.calculateTopPadding() + 8.dp,
                        bottom = paddingValues.calculateBottomPadding() + 16.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    // 1. Breadcrumbs & Narrative Architecture Caption (NO BOOK IMAGE - matching PWD)
                    item {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Breadcrumbs
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 6.dp)
                            ) {
                                Text(
                                    text = "Bible",
                                    color = RemoraAccent,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.clickable { onBack() }
                                )
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = RemoraTextMuted,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .padding(horizontal = 2.dp)
                                )
                                val testamentLabel = if (book.testament == "OT") "Old Testament" else "New Testament"
                                Text(
                                    text = testamentLabel,
                                    color = RemoraAccent,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.clickable { onBack() }
                                )
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = RemoraTextMuted,
                                    modifier = Modifier
                                        .size(16.dp)
                                        .padding(horizontal = 2.dp)
                                )
                                Text(
                                    text = BookNameUtils.getBookDisplayName(book, state.activeVersion),
                                    color = RemoraTextPrimary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            // Subtitle if available
                            val sub = guide.subtitle?.takeIf { it.isNotBlank() } ?: book.subtitle.takeIf { it.isNotBlank() }
                            if (sub != null) {
                                Text(
                                    text = sub,
                                    fontSize = 13.sp,
                                    fontStyle = FontStyle.Italic,
                                    color = RemoraAccentLight,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp)
                                )
                            }

                            // Architecture caption, formula, and jump button
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                            ) {
                                Text(
                                    text = "NARRATIVE ARCHITECTURE · ${book.chapters} CHAPTERS",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.8.sp,
                                    color = RemoraTextMuted,
                                    textAlign = TextAlign.Center
                                )

                                guide.structureFormula?.takeIf { it.isNotBlank() }?.let { formula ->
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = formula,
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraAccentLight,
                                        textAlign = TextAlign.Center
                                    )
                                }

                                guide.memorySentence?.takeIf { it.isNotBlank() }?.let {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Jump to Memory Sentence ↓",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraAccent,
                                        letterSpacing = 0.5.sp,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .clickable {
                                                coroutineScope.launch {
                                                    listState.animateScrollToItem(memorySentenceItemIndex)
                                                }
                                            }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }

                    // 2. Chapter Distribution Bar & Section Breakdown
                    if (guide.blocks.isNotEmpty()) {
                        item {
                            NarrativeArchitectureSection(
                                guide = guide,
                                totalChapters = book.chapters,
                                onSelectChapter = { ch -> onOpenReader(book.id, ch) }
                            )
                        }
                    }

                    // 3. One-Word Chapter Anchors Section
                    if (guide.anchors.isNotEmpty()) {
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "ONE-WORD CHAPTER ANCHORS",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = RemoraAccentLight
                                )

                                TextButton(
                                    onClick = { viewModel.toggleShowAllAnchors() },
                                    colors = ButtonDefaults.textButtonColors(contentColor = RemoraAccent)
                                ) {
                                    Icon(
                                        imageVector = if (state.showAllAnchors) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (state.showAllAnchors) "Hide all" else "Reveal all",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        // Anchors partitioned by blocks (or single list if no blocks)
                        val anchorGroups = partitionAnchorsByBlocks(guide.blocks, guide.anchors, book.chapters)

                        items(anchorGroups, key = { it.first }) { (groupLabel, anchorsInGroup, colorIndex) ->
                            val isCollapsed = state.collapsedBlocks.contains(colorIndex)
                            val blockColor = BlockDistributionColors[colorIndex % BlockDistributionColors.size]
                            val revealedCount = anchorsInGroup.count { state.showAllAnchors || state.revealedAnchors.contains(it.chapter) }

                            Column(modifier = Modifier.fillMaxWidth()) {
                                // Block Header
                                Surface(
                                    onClick = { viewModel.toggleBlockCollapse(colorIndex) },
                                    color = RemoraCardBg,
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, RemoraCardBorder),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp, vertical = 10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(10.dp)
                                                    .background(blockColor, shape = CircleShape)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = groupLabel,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraTextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            if (anchorsInGroup.size > 1) {
                                                val blockChain = state.blockProgress[colorIndex]
                                                val chainDue = blockChain?.isDue == true
                                                val buttonText = when {
                                                    blockChain == null -> "Drill"
                                                    chainDue -> "Chain due"
                                                    else -> "Chain ${Math.round(blockChain.lastAccuracy * 100)}%"
                                                }
                                                val buttonBg = if (chainDue) RemoraAccent.copy(alpha = 0.15f) else Color.Transparent
                                                val buttonBorder = if (chainDue) RemoraAccent.copy(alpha = 0.6f) else RemoraCardBorder
                                                val buttonTextColor = if (chainDue) RemoraAccent else RemoraTextSecondary

                                                Surface(
                                                    onClick = { drillBlock = Triple(groupLabel, anchorsInGroup, colorIndex) },
                                                    color = buttonBg,
                                                    shape = RoundedCornerShape(6.dp),
                                                    border = BorderStroke(1.dp, buttonBorder),
                                                    modifier = Modifier.padding(end = 8.dp)
                                                ) {
                                                    Text(
                                                        text = buttonText,
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = buttonTextColor,
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                    )
                                                }
                                            }

                                            Text(
                                                text = "$revealedCount/${anchorsInGroup.size}",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = RemoraTextMuted
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Icon(
                                                imageVector = if (isCollapsed) Icons.Default.ExpandMore else Icons.Default.ExpandLess,
                                                contentDescription = null,
                                                tint = RemoraTextSecondary,
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Anchor Cards
                                if (!isCollapsed) {
                                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        anchorsInGroup.forEach { anchor ->
                                            val isRevealed = state.showAllAnchors || state.revealedAnchors.contains(anchor.chapter)
                                            val gradedInterval = state.gradedAnchorsOnThisPass[anchor.chapter]

                                            ChapterAnchorCard(
                                                anchor = anchor,
                                                bookKey = book.key,
                                                isRevealed = isRevealed,
                                                gradedInterval = gradedInterval,
                                                onToggleReveal = { viewModel.toggleAnchorReveal(anchor.chapter) },
                                                onReadChapter = { onOpenReader(book.id, anchor.chapter) },
                                                onGrade = { score -> viewModel.gradeAnchor(anchor.chapter, score) }
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                        }
                    }

                    // 4. Key Verses Section
                    if (guide.keyVerses.isNotEmpty()) {
                        item {
                            KeyVersesSection(
                                keyVerses = guide.keyVerses,
                                userVerseKeys = state.userVerseKeys,
                                onAddVerse = { ref ->
                                    val kv = guide.keyVerses.firstOrNull { it.ref == ref }
                                    viewModel.addKeyVerseToLibrary(ref)
                                }
                            )
                        }
                    }

                    // 5. Memory Sentence Card
                    guide.memorySentence?.takeIf { it.isNotBlank() }?.let { memorySentence ->
                        item {
                            MemorySentenceCard(
                                memorySentence = memorySentence,
                                bookName = BookNameUtils.getBookDisplayName(book, state.activeVersion),
                                onCopy = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Memory Sentence", memorySentence.replace("**", ""))
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Memory sentence copied!", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }
                    }

                    // 6. Scholarly Commentaries & Historical Perspectives
                    item {
                        CommentariesGuideSection(
                            book = book,
                            onOpenCommentaries = { showCommentarySheet = true },
                            onOpenPreachers = { showPreachersSheet = true }
                        )
                    }
                }
            }
        }
    }

    if (showCommentarySheet && state.book != null) {
        CommentarySheet(
            bookId = state.book!!.id,
            bookNameEn = state.book!!.nameEn,
            onDismiss = { showCommentarySheet = false }
        )
    }

    if (showPreachersSheet) {
        PreachersSheet(
            onDismiss = { showPreachersSheet = false }
        )
    }

    if (showIndexModal) {
        BibleIndexModal(
            isOpen = showIndexModal,
            selectedBookId = state.book?.id ?: bookId,
            books = state.books,
            activeVersion = state.activeVersion,
            onSelectBook = { newBookId ->
                showIndexModal = false
                onSelectBook(newBookId)
            },
            onDismiss = { showIndexModal = false }
        )
    }

    drillBlock?.let { (label, anchors, blockIndex) ->
        val existingBlock = state.blockProgress[blockIndex]
        ChainDrill(
            bookId = bookId,
            blockIndex = blockIndex,
            label = label,
            anchors = anchors,
            onClose = { drillBlock = null },
            onGradeChain = { results ->
                viewModel.gradeBlockChain(blockIndex, label, results)
            },
            nextIntervalDays = existingBlock?.interval
        )
    }
}

@Composable
private fun CommentariesGuideSection(
    book: Book,
    onOpenCommentaries: () -> Unit,
    onOpenPreachers: () -> Unit
) {
    val series = CommentaryData.getSeriesForBook(book.id)
    val sections = CommentaryData.getSectionsForBook(book.id, book.nameEn)
    val entriesCount = sections.sumOf { it.entries.size }

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "SCHOLARLY COMMENTARIES & THEOLOGIANS",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = RemoraAccentLight
        )

        Spacer(modifier = Modifier.height(10.dp))

        Surface(
            shape = RoundedCornerShape(12.dp),
            color = RemoraCardBg,
            border = BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = series?.icon ?: "📜",
                        fontSize = 24.sp
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = series?.title ?: "Canonical Commentary Series",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Text(
                            text = "$entriesCount critical scholarly references & strategy notes",
                            fontSize = 12.sp,
                            color = RemoraTextSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onOpenCommentaries,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = RemoraAccent.copy(alpha = 0.2f),
                            contentColor = RemoraAccentLight
                        ),
                        border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.4f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "Browse Commentaries",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    OutlinedButton(
                        onClick = onOpenPreachers,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = RemoraTextSecondary
                        ),
                        border = BorderStroke(1.dp, RemoraCardBorderHover),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "⛪ Theologians",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}



@Composable
private fun GuideTagPill(label: String, value: String) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = RemoraChipBg,
        border = BorderStroke(1.dp, RemoraChipBorder)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$label: ",
                fontSize = 11.sp,
                color = RemoraTextMuted,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = value,
                fontSize = 11.sp,
                color = RemoraTextPrimary,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun NarrativeArchitectureSection(
    guide: BookGuide,
    totalChapters: Int,
    onSelectChapter: (Int) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "CHAPTER DISTRIBUTION",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp,
            color = RemoraTextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp)
        )

        // Segmented Distribution Bar (Matching Remora PWA)
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = RemoraCardBg,
            border = BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
        ) {
            Row(modifier = Modifier.fillMaxSize()) {
                guide.blocks.forEachIndexed { index, block ->
                    val color = BlockDistributionColors[index % BlockDistributionColors.size]
                    val parts = block.chapters.split('-', '–').mapNotNull { it.trim().toIntOrNull() }
                    val startCh = parts.firstOrNull() ?: 1
                    val endCh = parts.getOrNull(1) ?: startCh
                    val count = (endCh - startCh + 1).coerceAtLeast(1)
                    val weight = count.toFloat() / totalChapters.coerceAtLeast(1)

                    Box(
                        modifier = Modifier
                            .weight(weight.coerceAtLeast(0.05f))
                            .fillMaxHeight()
                            .background(color.copy(alpha = 0.9f))
                            .clickable { onSelectChapter(startCh) },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = block.chapters,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "${count}ch",
                                fontSize = 9.sp,
                                color = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
            }
        }

        // Ticks row below the bar showing start chapters
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp, bottom = 14.dp)
        ) {
            guide.blocks.forEachIndexed { _, block ->
                val parts = block.chapters.split('-', '–').mapNotNull { it.trim().toIntOrNull() }
                val startCh = parts.firstOrNull() ?: 1
                val endCh = parts.getOrNull(1) ?: startCh
                val count = (endCh - startCh + 1).coerceAtLeast(1)
                val weight = count.toFloat() / totalChapters.coerceAtLeast(1)

                Box(
                    modifier = Modifier.weight(weight.coerceAtLeast(0.05f)),
                    contentAlignment = Alignment.TopStart
                ) {
                    Text(
                        text = "$startCh",
                        fontSize = 10.sp,
                        color = RemoraTextMuted,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        // Section Cards (Matching PWA 72dp left cell layout)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            guide.blocks.forEachIndexed { index, block ->
                val color = BlockDistributionColors[index % BlockDistributionColors.size]
                val parts = block.chapters.split('-', '–').mapNotNull { it.trim().toIntOrNull() }
                val startCh = parts.firstOrNull() ?: 1
                val endCh = parts.getOrNull(1) ?: startCh
                val count = (endCh - startCh + 1).coerceAtLeast(1)
                val percent = (count.toFloat() / totalChapters * 100).toInt()

                Surface(
                    onClick = { onSelectChapter(startCh) },
                    shape = RoundedCornerShape(8.dp),
                    color = RemoraCardBg,
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(IntrinsicSize.Min),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Left cell with 4dp colored border and chapter count
                        Surface(
                            shape = RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp),
                            color = RemoraCardBgElevated,
                            modifier = Modifier
                                .width(72.dp)
                                .fillMaxHeight()
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .drawBehind {
                                        drawRect(
                                            color = color,
                                            topLeft = Offset.Zero,
                                            size = Size(4.dp.toPx(), size.height)
                                        )
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier.padding(vertical = 12.dp)
                                ) {
                                    Text(
                                        text = "CH",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextMuted,
                                        letterSpacing = 1.sp
                                    )
                                    Text(
                                        text = block.chapters,
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = color
                                    )
                                }
                            }
                        }

                        // Right block content
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "SECTION ${String.format("%02d", index + 1)}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = RemoraTextMuted
                                )
                                Text(
                                    text = "$percent%",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextMuted
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = block.label,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = color
                            )
                            if (block.description.isNotBlank()) {
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = block.description,
                                    fontSize = 12.sp,
                                    fontStyle = FontStyle.Italic,
                                    color = RemoraTextSecondary,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MemorySentenceCard(
    memorySentence: String,
    bookName: String,
    onCopy: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Bookmark,
                        contentDescription = null,
                        tint = RemoraAccent,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "MEMORY SENTENCE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = RemoraAccent
                    )
                }

                IconButton(
                    onClick = onCopy,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.ContentCopy,
                        contentDescription = "Copy",
                        tint = RemoraTextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Formatted markdown bold keywords
            val annotatedText = remember(memorySentence) {
                buildAnnotatedMemorySentence(memorySentence)
            }

            Text(
                text = annotatedText,
                fontSize = 14.sp,
                lineHeight = 22.sp,
                color = RemoraTextPrimary,
                fontFamily = FontFamily.Serif
            )
        }
    }
}

private fun buildAnnotatedMemorySentence(sentence: String): AnnotatedString {
    return buildAnnotatedString {
        val parts = sentence.split("**")
        parts.forEachIndexed { index, part ->
            if (index % 2 == 1) {
                // Bold keyword
                pushStyle(SpanStyle(fontWeight = FontWeight.Bold, color = RemoraAccentLight))
                append(part)
                pop()
            } else {
                append(part)
            }
        }
    }
}

@Composable
private fun KeyVersesSection(
    keyVerses: List<GuideKeyVerse>,
    userVerseKeys: Set<Triple<Int, Int, Int>>,
    onAddVerse: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "KEY VERSES",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = RemoraAccentLight,
            modifier = Modifier.padding(bottom = 10.dp)
        )

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            keyVerses.forEach { kv ->
                val parsed = remember(kv.ref) {
                    val regex = Regex("""(?:[1-3]?\s*[A-Za-z]+)?\s*(\d+)[:.](\d+)""")
                    val m = regex.find(kv.ref)
                    if (m != null) Pair(m.groupValues[1].toIntOrNull() ?: 1, m.groupValues[2].toIntOrNull() ?: 1) else Pair(1, 1)
                }
                val isAdded = userVerseKeys.contains(Triple(kv.bookId, parsed.first, parsed.second))

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = RemoraCardBg,
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = kv.ref,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )

                            if (isAdded) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = Color(0xFF22C55E).copy(alpha = 0.15f),
                                    border = BorderStroke(1.dp, Color(0xFF22C55E).copy(alpha = 0.4f))
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = null,
                                            tint = Color(0xFF22C55E),
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = "In Library",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF22C55E)
                                        )
                                    }
                                }
                            } else {
                                Button(
                                    onClick = { onAddVerse(kv.ref) },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                                    border = BorderStroke(1.dp, RemoraCardBorder),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.height(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = null,
                                        tint = RemoraAccent,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Add",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraAccent
                                    )
                                }
                            }
                        }

                        kv.theme?.takeIf { it.isNotBlank() }?.let { theme ->
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = theme,
                                fontSize = 11.sp,
                                color = RemoraAccentLight,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        val cleanKvText = remember(kv.text) {
                            kv.text
                                .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
                                .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
                                .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
                                .replace(Regex("<[^>]+>"), "")
                                .replace("&nbsp;", " ")
                                .replace("&amp;", "&")
                                .replace("&quot;", "\"")
                                .replace("&#39;", "'")
                                .trim()
                        }
                        Text(
                            text = "\"$cleanKvText\"",
                            fontSize = 14.sp,
                            fontStyle = FontStyle.Italic,
                            fontFamily = FontFamily.Serif,
                            color = RemoraTextSecondary,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChapterAnchorCard(
    anchor: ChapterAnchor,
    bookKey: String,
    isRevealed: Boolean,
    gradedInterval: Int?,
    onToggleReveal: () -> Unit,
    onReadChapter: () -> Unit,
    onGrade: (Int) -> Unit
) {
    // If graded on this pass: collapsed receipt row (Remora lines 143-167)
    if (gradedInterval != null) {
        Surface(
            onClick = onReadChapter,
            shape = RoundedCornerShape(8.dp),
            color = RemoraCardBg,
            border = BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(RemoraCardBgElevated, CircleShape)
                            .border(1.dp, RemoraCardBorder, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${anchor.chapter}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextMuted
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = anchor.word,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "next in ${gradedInterval}d",
                        fontSize = 11.sp,
                        color = RemoraTextMuted
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color(0xFF22C55E),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
        return
    }

    // Normal Chapter Anchor Card
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = RemoraCardBg,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            // Chapter Artwork Plate (Remora PWA feature)
            ChapterPlateImage(
                bookKey = bookKey,
                chapter = anchor.chapter,
                contentDescription = "Chapter ${anchor.chapter} Anchor: ${anchor.word}",
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clickable { onReadChapter() }
            )

            // Clickable card top: reveals anchor or opens reader
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        if (!isRevealed) onToggleReveal() else onReadChapter()
                    }
                    .padding(14.dp)
            ) {
                if (isRevealed) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = anchor.word.uppercase(),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            color = RemoraAccent
                        )

                        Button(
                            onClick = onReadChapter,
                            colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                            border = BorderStroke(1.dp, RemoraCardBorder),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.height(26.dp)
                        ) {
                            Text("Read Chapter", fontSize = 10.sp, color = RemoraTextSecondary)
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = anchor.scene,
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        fontFamily = FontFamily.Serif,
                        color = RemoraTextPrimary,
                        lineHeight = 18.sp
                    )

                    if (anchor.prevWord != null || anchor.nextWord != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            anchor.prevWord?.let { prev ->
                                Text(
                                    text = "after ",
                                    fontSize = 11.sp,
                                    color = RemoraTextMuted
                                )
                                Text(
                                    text = prev,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraTextSecondary
                                )
                            }
                            if (anchor.prevWord != null && anchor.nextWord != null) {
                                Text(
                                    text = " · ",
                                    fontSize = 11.sp,
                                    color = RemoraTextMuted
                                )
                            }
                            anchor.nextWord?.let { next ->
                                Text(
                                    text = "before ",
                                    fontSize = 11.sp,
                                    color = RemoraTextMuted
                                )
                                Text(
                                    text = next,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraTextSecondary
                                )
                            }
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "CHAPTER ${anchor.chapter}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            color = RemoraTextSecondary
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = RemoraCardBgElevated,
                            border = BorderStroke(1.dp, RemoraCardBorder)
                        ) {
                            Text(
                                text = "TAP TO REVEAL",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = RemoraAccentLight,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "What anchors chapter ${anchor.chapter}?",
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextMuted
                    )
                }
            }
        }
    }
}

private fun partitionAnchorsByBlocks(
    blocks: List<GuideBlock>,
    anchors: List<ChapterAnchor>,
    totalChapters: Int
): List<Triple<String, List<ChapterAnchor>, Int>> {
    if (blocks.isEmpty() || (totalChapters == 1 && blocks.size > 1)) {
        return listOf(Triple("All Chapters", anchors, 0))
    }

    return blocks.mapIndexedNotNull { index, block ->
        val parts = block.chapters.split('-', '–').mapNotNull { it.trim().toIntOrNull() }
        val start = parts.firstOrNull() ?: 1
        val end = parts.getOrNull(1) ?: start
        val inBlock = anchors.filter { it.chapter in start..end }
        if (inBlock.isNotEmpty()) {
            Triple("${block.label} · ${block.chapters}", inBlock, index)
        } else null
    }
}
