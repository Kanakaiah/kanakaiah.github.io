package com.example.telugubible.ui.reader

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.telugubible.data.model.BibleTranslation
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookNameUtils
import kotlin.math.max

@Composable
fun DualColumnNavigator(
    books: List<Book>,
    currentBook: Book?,
    currentChapter: Int,
    activeVersion: String,
    onVersionChange: (String) -> Unit,
    onSelect: (Book, Int) -> Unit,
    onDismiss: () -> Unit
) {
    val otBooks = remember(books) { books.filter { it.testament == "OT" } }
    val ntBooks = remember(books) { books.filter { it.testament == "NT" } }
    val maxRows = remember(otBooks, ntBooks) { max(otBooks.size, ntBooks.size) }

    var expandedBookId by remember { mutableIntStateOf(currentBook?.id ?: 1) }
    var showVersionMenu by remember { mutableStateOf(false) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding(),
            color = RemoraBackground
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top App Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss, modifier = Modifier.size(36.dp)) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close navigator",
                            tint = RemoraTextSecondary
                        )
                    }

                    Text(
                        text = "Go to...",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        letterSpacing = 0.5.sp
                    )

                    // Version Picker Pill
                    Box {
                        Surface(
                            onClick = { showVersionMenu = true },
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = BibleTranslation.getLabel(activeVersion),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccentLight
                                )
                                Icon(
                                    imageVector = Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = RemoraTextSecondary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = showVersionMenu,
                            onDismissRequest = { showVersionMenu = false },
                            modifier = Modifier
                                .background(RemoraCardBgElevated)
                                .border(1.dp, RemoraCardBorder, RoundedCornerShape(8.dp))
                        ) {
                            BibleTranslation.ALL.forEach { translation ->
                                val isSelected = translation.code.equals(activeVersion, ignoreCase = true)
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = translation.fullLabel,
                                                fontSize = 13.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                                color = if (isSelected) RemoraAccentLight else RemoraTextPrimary
                                            )
                                            if (isSelected) {
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = null,
                                                    tint = RemoraAccentLight,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                    },
                                    onClick = {
                                        onVersionChange(translation.code)
                                        showVersionMenu = false
                                    }
                                )
                            }
                        }
                    }
                }

                HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)

                // Column Headers
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "OLD TESTAMENT (${otBooks.size})",
                        modifier = Modifier.weight(1f).padding(end = 12.dp),
                        textAlign = TextAlign.End,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraTextMuted,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "NEW TESTAMENT (${ntBooks.size})",
                        modifier = Modifier.weight(1f).padding(start = 12.dp),
                        textAlign = TextAlign.Start,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraTextMuted,
                        letterSpacing = 1.sp
                    )
                }

                // Dual-Column List with Inline Chapter Expansion
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp),
                    contentPadding = PaddingValues(bottom = 32.dp)
                ) {
                    items(maxRows) { rowIndex ->
                        val ot = otBooks.getOrNull(rowIndex)
                        val nt = ntBooks.getOrNull(rowIndex)

                        val isOtExpanded = ot != null && ot.id == expandedBookId
                        val isNtExpanded = nt != null && nt.id == expandedBookId
                        val expandedBook = if (isOtExpanded) ot else if (isNtExpanded) nt else null

                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Row containing OT and NT book items
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 1.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // OT Book (Left Column, Right-Aligned)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(end = 4.dp)
                                ) {
                                    if (ot != null) {
                                        val isCurrentBook = ot.id == currentBook?.id
                                        val isSelected = ot.id == expandedBookId
                                        val divisionColor = BookNameUtils.getDivisionColor(ot.section)
                                        val shortName = BookNameUtils.getBookShortName(ot, activeVersion)

                                        Surface(
                                            onClick = {
                                                expandedBookId = if (expandedBookId == ot.id) 0 else ot.id
                                            },
                                            shape = RoundedCornerShape(topStart = 6.dp, bottomStart = 6.dp, topEnd = 10.dp, bottomEnd = 10.dp),
                                            color = if (isSelected) RemoraAccent.copy(alpha = 0.15f) else Color.Transparent,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                                horizontalArrangement = Arrangement.End,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(6.dp)
                                                        .clip(CircleShape)
                                                        .background(divisionColor)
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column(horizontalAlignment = Alignment.End) {
                                                    Text(
                                                        text = shortName,
                                                        fontSize = 14.sp,
                                                        fontWeight = if (isSelected || isCurrentBook) FontWeight.Bold else FontWeight.Medium,
                                                        color = if (isSelected) RemoraAccentLight else if (isCurrentBook) RemoraTextPrimary else RemoraTextSecondary,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    if (ot.themeWord.isNotBlank()) {
                                                        Text(
                                                            text = ot.themeWord.uppercase(),
                                                            fontSize = 9.sp,
                                                            fontWeight = FontWeight.SemiBold,
                                                            color = divisionColor.copy(alpha = 0.85f),
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // NT Book (Right Column, Left-Aligned)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(start = 4.dp)
                                ) {
                                    if (nt != null) {
                                        val isCurrentBook = nt.id == currentBook?.id
                                        val isSelected = nt.id == expandedBookId
                                        val divisionColor = BookNameUtils.getDivisionColor(nt.section)
                                        val shortName = BookNameUtils.getBookShortName(nt, activeVersion)

                                        Surface(
                                            onClick = {
                                                expandedBookId = if (expandedBookId == nt.id) 0 else nt.id
                                            },
                                            shape = RoundedCornerShape(topStart = 10.dp, bottomStart = 10.dp, topEnd = 6.dp, bottomEnd = 6.dp),
                                            color = if (isSelected) RemoraAccent.copy(alpha = 0.15f) else Color.Transparent,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                                horizontalArrangement = Arrangement.Start,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(horizontalAlignment = Alignment.Start) {
                                                    Text(
                                                        text = shortName,
                                                        fontSize = 14.sp,
                                                        fontWeight = if (isSelected || isCurrentBook) FontWeight.Bold else FontWeight.Medium,
                                                        color = if (isSelected) RemoraAccentLight else if (isCurrentBook) RemoraTextPrimary else RemoraTextSecondary,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    if (nt.themeWord.isNotBlank()) {
                                                        Text(
                                                            text = nt.themeWord.uppercase(),
                                                            fontSize = 9.sp,
                                                            fontWeight = FontWeight.SemiBold,
                                                            color = divisionColor.copy(alpha = 0.85f),
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                    }
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Box(
                                                    modifier = Modifier
                                                        .size(6.dp)
                                                        .clip(CircleShape)
                                                        .background(divisionColor)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // Full-Width Inline Chapter Grid
                            AnimatedVisibility(
                                visible = expandedBook != null,
                                enter = expandVertically(),
                                exit = shrinkVertically()
                            ) {
                                if (expandedBook != null) {
                                    InlineChapterGrid(
                                        book = expandedBook,
                                        isCurrentBook = expandedBook.id == currentBook?.id,
                                        currentChapter = currentChapter,
                                        activeVersion = activeVersion,
                                        onSelectChapter = { ch ->
                                            onSelect(expandedBook, ch)
                                            onDismiss()
                                        }
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

@Composable
private fun InlineChapterGrid(
    book: Book,
    isCurrentBook: Boolean,
    currentChapter: Int,
    activeVersion: String,
    onSelectChapter: (Int) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp, horizontal = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 320.dp)
                    .align(Alignment.CenterHorizontally),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${BookNameUtils.getBookDisplayName(book, activeVersion)} (${book.chapters} CHAPTERS)".uppercase(),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraAccentLight,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = book.section.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextMuted,
                    letterSpacing = 0.5.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 7-Column Chapter Grid constrained to max 320.dp (matches PWA max-w-xs mx-auto)
            Column(
                modifier = Modifier
                    .widthIn(max = 320.dp)
                    .align(Alignment.CenterHorizontally),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                val total = book.chapters
                val rows = (total + 6) / 7
                for (r in 0 until rows) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        for (c in 0 until 7) {
                            val ch = r * 7 + c + 1
                            if (ch <= total) {
                                val isCurrent = isCurrentBook && ch == currentChapter
                                Surface(
                                    onClick = { onSelectChapter(ch) },
                                    shape = RoundedCornerShape(6.dp),
                                    color = if (isCurrent) RemoraAccent else RemoraCardBgElevated,
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isCurrent) RemoraAccent else RemoraCardBorderHover
                                    ),
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        Text(
                                            text = ch.toString(),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isCurrent) Color.White else RemoraTextPrimary
                                        )
                                    }
                                }
                            } else {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                    if (r < rows - 1) {
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }
            }
        }
    }
}
