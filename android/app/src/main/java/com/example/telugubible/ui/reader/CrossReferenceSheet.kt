package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.data.model.StepBibleWord
import com.example.telugubible.data.model.StepBibleWordOccurrence
import com.example.telugubible.data.model.VerseConnectionsData
import com.example.telugubible.theme.RemoraGold
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.theme.RemoraTextSecondary
import com.example.telugubible.util.GenreInfo
import com.example.telugubible.util.KjvVersification

private const val INITIAL_VISIBLE_REFS = 40
private const val INITIAL_VISIBLE_WORDS = 6

private data class BookRefGroup(
    val bookId: Int,
    val bookName: String,
    val genre: GenreInfo,
    val items: List<CrossReference>
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CrossReferenceSheet(
    fromRefLabel: String,
    crossReferences: List<CrossReference>,
    language: BibleLanguage,
    onDismiss: () -> Unit,
    onNavigateToTarget: (bookId: Int, chapter: Int, verse: Int) -> Unit,
    connectionsData: VerseConnectionsData? = null,
    minVotes: Int = 4,
    initialSection: String? = null,
    quoteTextEn: String? = null,
    quoteTextTe: String? = null,
    activeVersion: String = "LSB",
    booksMap: Map<Int, Book> = emptyMap(),
    wordOccurrencesMap: Map<Int, List<StepBibleWordOccurrence>> = emptyMap(),
    onMinVotesChange: (Int) -> Unit = {},
    onSelectVid: (Int) -> Unit = {},
    onExpandWord: (Int) -> Unit = {}
) {
    val clipboardManager = LocalClipboardManager.current
    val currentVid = connectionsData?.vid ?: 0
    val coord = remember(currentVid) { KjvVersification.fromVerseIndex(currentVid) }
    val outgoing = connectionsData?.outgoing ?: crossReferences
    val incoming = connectionsData?.incoming ?: emptyList()
    val originalWords = connectionsData?.originalWords ?: emptyList()

    val isTelugu = language == BibleLanguage.TELUGU
    val displayTitle = remember(currentVid, fromRefLabel, isTelugu, booksMap) {
        if (connectionsData != null) {
            KjvVersification.formatVerseIndexRange(currentVid, currentVid, booksMap, isTelugu)
        } else {
            fromRefLabel
        }
    }

    var genreBreakdownOpen by remember(currentVid) { mutableStateOf(false) }
    var outgoingOpen by remember(currentVid) { mutableStateOf(true) }
    var incomingOpen by remember(currentVid) { mutableStateOf(true) }
    var sameWordOpen by remember(currentVid, initialSection) { mutableStateOf(true) }
    var showAllOutgoing by remember(currentVid, minVotes) { mutableStateOf(false) }
    var showAllIncoming by remember(currentVid, minVotes) { mutableStateOf(false) }
    var showAllWords by remember(currentVid) { mutableStateOf(false) }
    var expandedWordId by remember(currentVid) { mutableStateOf<Int?>(null) }

    // Genre breakdown counts across outgoing + incoming
    val genreCounts = remember(outgoing, incoming) {
        val counts = IntArray(KjvVersification.GENRES.size)
        for (ref in outgoing) {
            val bId = ref.toBookId ?: KjvVersification.fromVerseIndex(ref.otherStartVid).bookId
            counts[KjvVersification.getGenreForBookId(bId).ordinal]++
        }
        for (ref in incoming) {
            val bId = ref.toBookId ?: KjvVersification.fromVerseIndex(ref.otherStartVid).bookId
            counts[KjvVersification.getGenreForBookId(bId).ordinal]++
        }
        counts
    }
    val totalConnections = outgoing.size + incoming.size

    val quoteRaw = if (isTelugu) {
        quoteTextTe ?: quoteTextEn ?: ""
    } else {
        quoteTextEn ?: quoteTextTe ?: ""
    }
    val cleanQuote = remember(quoteRaw) { parseScriptureText(quoteRaw) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.88f)
                .navigationBarsPadding()
        ) {
            // ── Sticky Top Header ─────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        // Genre dot + Genre · Testament eyebrow
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Color(coord.genre.colorHex))
                            )
                            Text(
                                text = "${coord.genre.label} · ${if (coord.isOldTestament) "Old Testament" else "New Testament"}".uppercase(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.8.sp,
                                color = RemoraTextSecondary
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = displayTitle,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = RemoraGold.copy(alpha = 0.14f),
                                border = BorderStroke(1.dp, RemoraGold.copy(alpha = 0.35f))
                            ) {
                                Text(
                                    text = activeVersion.uppercase(),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraGold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Action Buttons: Vote filter + Prev/Next verse + Close
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (minVotes > 0) RemoraGold.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            border = BorderStroke(
                                1.dp,
                                if (minVotes > 0) RemoraGold.copy(alpha = 0.45f) else RemoraTextSecondary.copy(alpha = 0.25f)
                            ),
                            modifier = Modifier.clickable {
                                onMinVotesChange(if (minVotes > 0) 0 else 4)
                            }
                        ) {
                            Text(
                                text = if (minVotes > 0) "≥ 4 votes" else "All votes",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (minVotes > 0) RemoraGold else RemoraTextSecondary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }

                        IconButton(
                            onClick = { if (currentVid > 0) onSelectVid(currentVid - 1) },
                            enabled = currentVid > 0,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronLeft,
                                contentDescription = "Previous verse",
                                tint = if (currentVid > 0) RemoraTextPrimary else RemoraTextSecondary.copy(alpha = 0.3f)
                            )
                        }

                        IconButton(
                            onClick = {
                                if (currentVid < KjvVersification.TOTAL_VERSES - 1) {
                                    onSelectVid(currentVid + 1)
                                }
                            },
                            enabled = currentVid < KjvVersification.TOTAL_VERSES - 1,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = "Next verse",
                                tint = if (currentVid < KjvVersification.TOTAL_VERSES - 1) RemoraTextPrimary else RemoraTextSecondary.copy(alpha = 0.3f)
                            )
                        }

                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = RemoraTextSecondary
                            )
                        }
                    }
                }
            }

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f),
                modifier = Modifier.padding(top = 8.dp)
            )

            // ── Scrollable Body ───────────────────────────────────────────
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                // 1. Focused Verse Quote Box + "Read in context"
                item(key = "quote_box") {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
                            .padding(horizontal = 20.dp, vertical = 14.dp)
                    ) {
                        if (cleanQuote.isNotBlank()) {
                            Text(
                                text = cleanQuote,
                                fontSize = 18.sp,
                                lineHeight = 27.sp,
                                fontStyle = FontStyle.Italic,
                                fontFamily = FontFamily.Serif,
                                color = RemoraTextPrimary
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(
                                onClick = {
                                    clipboardManager.setText(AnnotatedString("$displayTitle — $cleanQuote"))
                                },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ContentCopy,
                                    contentDescription = "Copy verse",
                                    modifier = Modifier.size(14.dp),
                                    tint = RemoraTextSecondary
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Copy verse", fontSize = 12.sp, color = RemoraTextSecondary)
                            }

                            FilledTonalButton(
                                onClick = {
                                    onNavigateToTarget(coord.bookId, coord.chapter, coord.verse)
                                },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MenuBook,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Read in context",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                }

                // 2. Collapsible "Connects to" Genre Breakdown Bar & Strip
                if (totalConnections > 0) {
                    item(key = "genre_breakdown") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { genreBreakdownOpen = !genreBreakdownOpen }
                                .padding(horizontal = 20.dp, vertical = 12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = if (genreBreakdownOpen) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight,
                                        contentDescription = null,
                                        tint = RemoraTextSecondary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "CONNECTS TO",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.8.sp,
                                        color = RemoraTextSecondary
                                    )
                                }
                                Text(
                                    text = "$totalConnections total",
                                    fontSize = 11.sp,
                                    color = RemoraTextSecondary
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Proportional Stacked Color Bar
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp))
                            ) {
                                KjvVersification.GENRES.forEach { g ->
                                    val c = genreCounts[g.ordinal]
                                    if (c > 0) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxHeight()
                                                .weight(c.toFloat() / totalConnections.toFloat())
                                                .background(Color(g.colorHex))
                                        )
                                    }
                                }
                            }

                            if (genreBreakdownOpen) {
                                Spacer(modifier = Modifier.height(10.dp))
                                val maxGenreCount = (genreCounts.maxOrNull() ?: 1).coerceAtLeast(1)
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    KjvVersification.GENRES.forEach { g ->
                                        val c = genreCounts[g.ordinal]
                                        if (c > 0) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Text(
                                                    text = g.label,
                                                    fontSize = 12.sp,
                                                    color = RemoraTextSecondary,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    modifier = Modifier.width(110.dp)
                                                )
                                                Box(
                                                    modifier = Modifier
                                                        .weight(1f)
                                                        .height(6.dp)
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .fillMaxHeight()
                                                            .fillMaxWidth(
                                                                (c.toFloat() / maxGenreCount.toFloat()).coerceIn(0.04f, 1f)
                                                            )
                                                            .clip(RoundedCornerShape(3.dp))
                                                            .background(Color(g.colorHex))
                                                    )
                                                }
                                                Text(
                                                    text = "$c",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = RemoraTextPrimary,
                                                    textAlign = TextAlign.End,
                                                    modifier = Modifier.width(28.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                    }
                }

                // 3. Section: → References (Outgoing)
                item(key = "outgoing_section") {
                    ConnectionDirectionSection(
                        arrow = "→",
                        title = "References",
                        subtitle = "where this passage points",
                        items = outgoing,
                        isOpen = outgoingOpen,
                        onToggleOpen = { outgoingOpen = !outgoingOpen },
                        showAll = showAllOutgoing,
                        onShowAll = { showAllOutgoing = true },
                        language = language,
                        booksMap = booksMap,
                        onSelectRef = { ref ->
                            if (connectionsData != null && ref.otherStartVid in 0 until KjvVersification.TOTAL_VERSES) {
                                onSelectVid(ref.otherStartVid)
                            } else if (ref.toBookId != null && ref.toChapter != null) {
                                onNavigateToTarget(ref.toBookId, ref.toChapter, ref.toVerse ?: 1)
                            }
                        },
                        onJumpToChapter = { ref ->
                            if (ref.toBookId != null && ref.toChapter != null) {
                                onNavigateToTarget(ref.toBookId, ref.toChapter, ref.toVerse ?: 1)
                            }
                        }
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                }

                // 4. Section: ← Referenced by (Incoming)
                item(key = "incoming_section") {
                    ConnectionDirectionSection(
                        arrow = "←",
                        title = "Referenced by",
                        subtitle = "passages that point here",
                        items = incoming,
                        isOpen = incomingOpen,
                        onToggleOpen = { incomingOpen = !incomingOpen },
                        showAll = showAllIncoming,
                        onShowAll = { showAllIncoming = true },
                        language = language,
                        booksMap = booksMap,
                        onSelectRef = { ref ->
                            if (connectionsData != null && ref.otherStartVid in 0 until KjvVersification.TOTAL_VERSES) {
                                onSelectVid(ref.otherStartVid)
                            } else if (ref.toBookId != null && ref.toChapter != null) {
                                onNavigateToTarget(ref.toBookId, ref.toChapter, ref.toVerse ?: 1)
                            }
                        },
                        onJumpToChapter = { ref ->
                            if (ref.toBookId != null && ref.toChapter != null) {
                                onNavigateToTarget(ref.toBookId, ref.toChapter, ref.toVerse ?: 1)
                            }
                        }
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                }

                // 5. Section: Same Hebrew / Greek word
                item(key = "same_word_section") {
                    SameOriginalWordSection(
                        isOldTestament = coord.isOldTestament,
                        currentVid = currentVid,
                        words = originalWords,
                        isOpen = sameWordOpen,
                        onToggleOpen = { sameWordOpen = !sameWordOpen },
                        showAll = showAllWords,
                        onShowAll = { showAllWords = true },
                        expandedWordId = expandedWordId,
                        onToggleWord = { wordId ->
                            if (expandedWordId == wordId) {
                                expandedWordId = null
                            } else {
                                expandedWordId = wordId
                                onExpandWord(wordId)
                            }
                        },
                        wordOccurrencesMap = wordOccurrencesMap,
                        language = language,
                        onSelectOccurrence = { occ ->
                            onSelectVid(occ.vid)
                        },
                        onJumpToOccurrence = { occ ->
                            onNavigateToTarget(occ.bookId, occ.chapter, occ.verse)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun ConnectionDirectionSection(
    arrow: String,
    title: String,
    subtitle: String,
    items: List<CrossReference>,
    isOpen: Boolean,
    onToggleOpen: () -> Unit,
    showAll: Boolean,
    onShowAll: () -> Unit,
    language: BibleLanguage,
    booksMap: Map<Int, Book>,
    onSelectRef: (CrossReference) -> Unit,
    onJumpToChapter: (CrossReference) -> Unit
) {
    val visibleItems = remember(items, showAll) {
        if (showAll || items.size <= INITIAL_VISIBLE_REFS) items else items.take(INITIAL_VISIBLE_REFS)
    }
    val groups = remember(visibleItems, language, booksMap) {
        groupRefsByBook(visibleItems, language == BibleLanguage.TELUGU, booksMap)
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        // Section Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onToggleOpen() }
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = if (isOpen) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight,
                    contentDescription = null,
                    tint = RemoraTextSecondary,
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = arrow,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraGold
                )
                Text(
                    text = title.uppercase(),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = RemoraTextPrimary
                )
                Text(
                    text = subtitle,
                    fontSize = 13.sp,
                    color = RemoraTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
            ) {
                Text(
                    text = "${items.size}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextSecondary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }

        if (isOpen) {
            if (items.isEmpty()) {
                Text(
                    text = "None recorded.",
                    fontSize = 13.sp,
                    fontStyle = FontStyle.Italic,
                    color = RemoraTextSecondary,
                    modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 14.dp)
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .padding(bottom = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    groups.forEach { group ->
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            // Book Group Header
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(9.dp)
                                        .clip(CircleShape)
                                        .background(Color(group.genre.colorHex))
                                )
                                Text(
                                    text = group.bookName.uppercase(),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 0.7.sp,
                                    color = RemoraTextSecondary
                                )
                                Text(
                                    text = "${group.items.size}",
                                    fontSize = 13.sp,
                                    color = RemoraTextSecondary.copy(alpha = 0.7f)
                                )
                            }

                            // Connections inside this book
                            group.items.forEach { ref ->
                                val rawText = if (language == BibleLanguage.TELUGU) {
                                    ref.targetTextTe ?: ref.targetTextEn ?: ""
                                } else {
                                    ref.targetTextEn ?: ref.targetTextTe ?: ""
                                }
                                val annotatedText = remember(rawText) { parseScriptureText(rawText) }

                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onSelectRef(ref) }
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                Text(
                                                    text = ref.toRef,
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = RemoraGold
                                                )
                                                if (!ref.landingNote.isNullOrBlank()) {
                                                    Text(
                                                        text = ref.landingNote,
                                                        fontSize = 13.sp,
                                                        color = RemoraTextSecondary
                                                    )
                                                }
                                            }

                                            if (annotatedText.isNotBlank()) {
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = annotatedText,
                                                    fontSize = 17.sp,
                                                    lineHeight = 25.sp,
                                                    color = RemoraTextPrimary
                                                )
                                            }
                                        }

                                        if (ref.toBookId != null && ref.toChapter != null) {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            IconButton(
                                                onClick = { onJumpToChapter(ref) },
                                                modifier = Modifier.size(28.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                                    contentDescription = "Jump to chapter",
                                                    tint = RemoraTextSecondary,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (!showAll && items.size > INITIAL_VISIBLE_REFS) {
                        OutlinedButton(
                            onClick = onShowAll,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Show all ${items.size}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SameOriginalWordSection(
    isOldTestament: Boolean,
    currentVid: Int,
    words: List<StepBibleWord>,
    isOpen: Boolean,
    onToggleOpen: () -> Unit,
    showAll: Boolean,
    onShowAll: () -> Unit,
    expandedWordId: Int?,
    onToggleWord: (Int) -> Unit,
    wordOccurrencesMap: Map<Int, List<StepBibleWordOccurrence>>,
    language: BibleLanguage,
    onSelectOccurrence: (StepBibleWordOccurrence) -> Unit,
    onJumpToOccurrence: (StepBibleWordOccurrence) -> Unit
) {
    val languageLabel = if (isOldTestament) "Hebrew" else "Greek"
    val visibleWords = remember(words, showAll) {
        if (showAll || words.size <= INITIAL_VISIBLE_WORDS) words else words.take(INITIAL_VISIBLE_WORDS)
    }
    val hiddenCount = words.size - visibleWords.size

    Column(modifier = Modifier.fillMaxWidth()) {
        // Section Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onToggleOpen() }
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = if (isOpen) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight,
                    contentDescription = null,
                    tint = RemoraTextSecondary,
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "Same $languageLabel word".uppercase(),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = RemoraTextPrimary
                )
                Text(
                    text = "where else it is used",
                    fontSize = 13.sp,
                    color = RemoraTextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
            ) {
                Text(
                    text = "${words.size}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextSecondary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }

        if (isOpen) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (words.isEmpty()) {
                    Text(
                        text = "No words in this verse occur 100 or fewer times in the Bible.",
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                } else {
                    visibleWords.forEach { entry ->
                        val isExpanded = expandedWordId == entry.id
                        val occurrences = wordOccurrencesMap[entry.id]

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (isExpanded) {
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                            },
                            border = BorderStroke(
                                1.dp,
                                if (isExpanded) RemoraGold.copy(alpha = 0.45f) else Color.Transparent
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                // Word Summary Row
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onToggleWord(entry.id) }
                                        .padding(12.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text(
                                                text = entry.lemma,
                                                fontSize = 20.sp,
                                                fontFamily = FontFamily.Serif,
                                                fontWeight = FontWeight.SemiBold,
                                                color = RemoraTextPrimary
                                            )
                                            if (entry.transliteration.isNotBlank()) {
                                                Text(
                                                    text = entry.transliteration,
                                                    fontSize = 15.sp,
                                                    fontStyle = FontStyle.Italic,
                                                    color = RemoraTextSecondary
                                                )
                                            }
                                            Text(
                                                text = entry.strongs,
                                                fontSize = 13.sp,
                                                fontFamily = FontFamily.Monospace,
                                                color = RemoraTextSecondary.copy(alpha = 0.75f)
                                            )
                                        }

                                        Text(
                                            text = "${entry.verseCount} ${if (entry.verseCount == 1) "verse" else "verses"}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = RemoraGold
                                        )
                                    }

                                    if (entry.gloss.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "“${entry.gloss}”",
                                            fontSize = 15.sp,
                                            color = RemoraTextSecondary
                                        )
                                    }
                                }

                                // Expanded Occurrences List
                                if (isExpanded) {
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                                    if (occurrences == null) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = RemoraGold
                                            )
                                        }
                                    } else {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            occurrences.forEach { occ ->
                                                val isHere = occ.vid == currentVid
                                                val occCoord = KjvVersification.fromVerseIndex(occ.vid)
                                                val rawTxt = if (language == BibleLanguage.TELUGU) {
                                                    occ.textTe ?: occ.textEn ?: ""
                                                } else {
                                                    occ.textEn ?: occ.textTe ?: ""
                                                }
                                                val cleanTxt = remember(rawTxt) { parseScriptureText(rawTxt) }

                                                Row(
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(
                                                            if (isHere) RemoraGold.copy(alpha = 0.12f)
                                                            else MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)
                                                        )
                                                        .clickable(enabled = !isHere) {
                                                            onSelectOccurrence(occ)
                                                        }
                                                        .padding(10.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.Top
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Row(
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                        ) {
                                                            Box(
                                                                modifier = Modifier
                                                                    .size(7.dp)
                                                                    .clip(CircleShape)
                                                                    .background(Color(occCoord.genre.colorHex))
                                                            )
                                                            Text(
                                                                text = occ.refLabel,
                                                                fontSize = 15.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = RemoraGold
                                                            )
                                                            if (isHere) {
                                                                Text(
                                                                    text = "(this verse)",
                                                                    fontSize = 13.sp,
                                                                    color = RemoraTextSecondary
                                                                )
                                                            }
                                                        }
                                                        if (cleanTxt.isNotBlank()) {
                                                            Spacer(modifier = Modifier.height(5.dp))
                                                            Text(
                                                                text = cleanTxt,
                                                                fontSize = 16.sp,
                                                                lineHeight = 24.sp,
                                                                color = RemoraTextPrimary
                                                            )
                                                        }
                                                    }

                                                    if (!isHere) {
                                                        IconButton(
                                                            onClick = { onJumpToOccurrence(occ) },
                                                            modifier = Modifier.size(26.dp)
                                                        ) {
                                                            Icon(
                                                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                                                contentDescription = "Jump to verse",
                                                                tint = RemoraTextSecondary,
                                                                modifier = Modifier.size(15.dp)
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

                    if (!showAll && hiddenCount > 0) {
                        OutlinedButton(
                            onClick = onShowAll,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Show $hiddenCount more ${if (hiddenCount == 1) "word" else "words"}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Sorted rarest-first · Words appearing in more than 100 verses are omitted · Data: STEP Bible (CC BY 4.0) & OpenBible.info (CC BY 4.0)",
                    fontSize = 11.sp,
                    lineHeight = 15.sp,
                    color = RemoraTextSecondary.copy(alpha = 0.75f)
                )
            }
        }
    }
}

private fun groupRefsByBook(
    items: List<CrossReference>,
    isTelugu: Boolean,
    booksMap: Map<Int, Book>
): List<BookRefGroup> {
    val map = LinkedHashMap<Int, MutableList<CrossReference>>()
    for (ref in items) {
        val bookId = ref.toBookId ?: KjvVersification.fromVerseIndex(ref.otherStartVid).bookId
        map.getOrPut(bookId) { mutableListOf() }.add(ref)
    }
    return map.entries.map { (bookId, list) ->
        val bookObj = booksMap[bookId]
        val defaultName = KjvVersification.BOOK_NAMES_EN.getOrElse(bookId - 1) { "Book $bookId" }
        val bookName = if (isTelugu) {
            bookObj?.nameTe?.takeIf { it.isNotBlank() } ?: defaultName
        } else {
            bookObj?.nameEn?.takeIf { it.isNotBlank() } ?: defaultName
        }
        BookRefGroup(
            bookId = bookId,
            bookName = bookName,
            genre = KjvVersification.getGenreForBookId(bookId),
            items = list
        )
    }
}

private fun parseScriptureText(raw: String): AnnotatedString {
    val clean = raw
        .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .trim()

    val italicRegex = Regex("<i\\b[^>]*>([\\s\\S]*?)</i>", RegexOption.IGNORE_CASE)
    return buildAnnotatedString {
        var lastIdx = 0
        for (m in italicRegex.findAll(clean)) {
            val normal = clean.substring(lastIdx, m.range.first).replace(Regex("<[^>]+>"), "")
            append(normal)
            withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                val italicText = m.groupValues[1].replace(Regex("<[^>]+>"), "")
                append(italicText)
            }
            lastIdx = m.range.last + 1
        }
        if (lastIdx < clean.length) {
            val remaining = clean.substring(lastIdx).replace(Regex("<[^>]+>"), "")
            append(remaining)
        }
    }
}
