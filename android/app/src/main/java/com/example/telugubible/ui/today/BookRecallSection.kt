package com.example.telugubible.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.*

@Composable
fun BookRecallSection(
    books: List<Book>,
    dueChaptersByBook: Map<Int, Int>,
    secureThemesCount: Int,
    dueThemesCount: Int,
    onBookClick: (Int) -> Unit,
    onFocusBookPractice: (Int) -> Unit,
    onThemesClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val booksById = books.associateBy { it.id }
    val dueBookIds = dueChaptersByBook.keys.sortedByDescending { dueChaptersByBook[it] ?: 0 }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 1. Overdue Chapter Anchors (Book Recall)
        if (dueBookIds.isNotEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Bookmark,
                        contentDescription = null,
                        tint = RemoraAccent,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "BOOK RECALL",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        color = RemoraAccent
                    )
                }

                // Cards for top due books
                dueBookIds.take(5).forEach { bookId ->
                    val book = booksById[bookId] ?: return@forEach
                    val dueCount = dueChaptersByBook[bookId] ?: 0

                    Surface(
                        onClick = { onBookClick(bookId) },
                        shape = RoundedCornerShape(8.dp),
                        color = RemoraCardBg,
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = book.nameEn,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = RemoraTextPrimary
                                )
                                Text(
                                    text = "$dueCount chapter ${if (dueCount == 1) "anchor" else "anchors"} due",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraGold
                                )
                            }
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                tint = RemoraTextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                // "Focus on one" pills if multiple books are due
                if (dueBookIds.size > 1) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "FOCUS ON ONE:",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            color = RemoraTextMuted
                        )
                        dueBookIds.forEach { bookId ->
                            val book = booksById[bookId] ?: return@forEach
                            Surface(
                                onClick = { onFocusBookPractice(bookId) },
                                shape = RoundedCornerShape(12.dp),
                                color = RemoraCardBgElevated,
                                border = BorderStroke(1.dp, RemoraCardBorderHover)
                            ) {
                                Text(
                                    text = book.nameEn,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = RemoraTextSecondary,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Book Themes Card (66-Card Deck)
        Surface(
            onClick = onThemesClick,
            shape = RoundedCornerShape(10.dp),
            color = RemoraCardBg,
            border = BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                        border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.35f)),
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Style,
                                contentDescription = null,
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Column {
                        Text(
                            text = "Book Themes",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Text(
                            text = if (secureThemesCount == 0 && dueThemesCount == 0) {
                                "One word per book — start the 66-card deck"
                            } else {
                                "$secureThemesCount of 66 secure" + if (dueThemesCount > 0) " · $dueThemesCount due" else ""
                            },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (dueThemesCount > 0) RemoraAccent else RemoraTextSecondary
                        )
                    }
                }

                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    tint = RemoraTextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
