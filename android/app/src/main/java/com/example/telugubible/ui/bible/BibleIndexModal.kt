package com.example.telugubible.ui.bible

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
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
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookNameUtils
import kotlin.math.max

/**
 * Full two-column Bible book index modal.
 * Matches Remora PWA's BibleIndexModal (src/screens/Guides.tsx lines 259-369).
 * Shows Old Testament (39 books) on the left, New Testament (27 books) on the right,
 * with division color dots, book short names, and theme words.
 */
@Composable
fun BibleIndexModal(
    isOpen: Boolean,
    selectedBookId: Int?,
    books: List<Book>,
    activeVersion: String,
    onSelectBook: (Int) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (!isOpen) return

    val otBooks = remember(books) {
        books.filter { it.testament.equals("OT", ignoreCase = true) }
    }
    val ntBooks = remember(books) {
        books.filter { it.testament.equals("NT", ignoreCase = true) }
    }
    val maxRows = remember(otBooks, ntBooks) {
        max(otBooks.size, ntBooks.size)
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(RemoraBackground)
                .systemBarsPadding()
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
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close Bible index",
                            tint = RemoraTextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Text(
                        text = "Bible Books",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                        color = RemoraTextPrimary
                    )

                    // Spacer to balance the close button
                    Spacer(modifier = Modifier.size(36.dp))
                }

                HorizontalDivider(
                    thickness = 1.dp,
                    color = RemoraCardBorder
                )

                // Column Headers: Old Testament (left) & New Testament (right)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "OLD TESTAMENT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = RemoraTextMuted,
                        textAlign = TextAlign.End,
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 12.dp)
                    )
                    Text(
                        text = "NEW TESTAMENT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = RemoraTextMuted,
                        textAlign = TextAlign.Start,
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 12.dp)
                    )
                }

                // Scrollable 2-Column Grid of 66 Books
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                    contentPadding = PaddingValues(bottom = 32.dp)
                ) {
                    items(maxRows) { index ->
                        val otBook = otBooks.getOrNull(index)
                        val ntBook = ntBooks.getOrNull(index)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Left Cell: Old Testament Book
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 4.dp)
                            ) {
                                if (otBook != null) {
                                    val isSelected = otBook.id == selectedBookId
                                    val divisionColor = BookNameUtils.getDivisionColor(otBook.section)
                                    val bookName = BookNameUtils.getBookDisplayName(otBook, activeVersion)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(topStart = 8.dp, bottomStart = 8.dp, topEnd = 4.dp, bottomEnd = 4.dp))
                                            .background(if (isSelected) RemoraAccent.copy(alpha = 0.15f) else Color.Transparent)
                                            .clickable {
                                                onSelectBook(otBook.id)
                                                onDismiss()
                                            }
                                            .padding(horizontal = 8.dp, vertical = 6.dp),
                                        horizontalArrangement = Arrangement.End,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        // Division dot
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .clip(CircleShape)
                                                .background(divisionColor)
                                        )

                                        Spacer(modifier = Modifier.width(6.dp))

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                text = bookName,
                                                fontSize = 14.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) RemoraAccentLight else RemoraTextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            if (otBook.themeWord.isNotBlank()) {
                                                Text(
                                                    text = otBook.themeWord,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Normal,
                                                    color = divisionColor.copy(alpha = 0.85f),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // Center divider subtle dot
                            Box(
                                modifier = Modifier
                                    .size(2.dp)
                                    .clip(CircleShape)
                                    .background(RemoraCardBorder)
                            )

                            // Right Cell: New Testament Book
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 4.dp)
                            ) {
                                if (ntBook != null) {
                                    val isSelected = ntBook.id == selectedBookId
                                    val divisionColor = BookNameUtils.getDivisionColor(ntBook.section)
                                    val bookName = BookNameUtils.getBookDisplayName(ntBook, activeVersion)

                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(topEnd = 8.dp, bottomEnd = 8.dp, topStart = 4.dp, bottomStart = 4.dp))
                                            .background(if (isSelected) RemoraAccent.copy(alpha = 0.15f) else Color.Transparent)
                                            .clickable {
                                                onSelectBook(ntBook.id)
                                                onDismiss()
                                            }
                                            .padding(horizontal = 8.dp, vertical = 6.dp),
                                        horizontalArrangement = Arrangement.Start,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(horizontalAlignment = Alignment.Start) {
                                            Text(
                                                text = bookName,
                                                fontSize = 14.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) RemoraAccentLight else RemoraTextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            if (ntBook.themeWord.isNotBlank()) {
                                                Text(
                                                    text = ntBook.themeWord,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Normal,
                                                    color = divisionColor.copy(alpha = 0.85f),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.width(6.dp))

                                        // Division dot
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
                }
            }
        }
    }
}
