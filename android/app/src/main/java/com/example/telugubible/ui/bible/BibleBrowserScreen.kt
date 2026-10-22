package com.example.telugubible.ui.bible

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookNameUtils
import com.example.telugubible.ui.common.BookCoverImage

@Composable
fun BibleBrowserScreen(
    viewModel: BibleBrowserViewModel,
    onOpenBook: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    var showIndexModal by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // Search Bar
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Search books, themes, keywords...", color = RemoraTextMuted, fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = RemoraTextMuted) },
                trailingIcon = {
                    if (state.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = RemoraTextMuted)
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = RemoraCardBg,
                    unfocusedContainerColor = RemoraCardBg,
                    focusedTextColor = RemoraTextPrimary,
                    unfocusedTextColor = RemoraTextPrimary,
                    focusedBorderColor = RemoraAccent,
                    unfocusedBorderColor = RemoraCardBorder
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Testament Links & Section Filter - only shown when not actively searching
            if (state.searchQuery.isBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 2.dp)
                ) {
                    Text(
                        text = "Old Testament (39)",
                        fontSize = 14.sp,
                        fontWeight = if (state.currentTestament == "OT") FontWeight.Bold else FontWeight.Normal,
                        color = if (state.currentTestament == "OT") RemoraAccentLight else RemoraTextSecondary,
                        modifier = Modifier
                            .clickable { viewModel.setTestament("OT") }
                            .padding(vertical = 4.dp)
                    )

                    Text(
                        text = "•",
                        color = RemoraCardBorderHover,
                        fontSize = 12.sp
                    )

                    Text(
                        text = "New Testament (27)",
                        fontSize = 14.sp,
                        fontWeight = if (state.currentTestament == "NT") FontWeight.Bold else FontWeight.Normal,
                        color = if (state.currentTestament == "NT") RemoraAccentLight else RemoraTextSecondary,
                        modifier = Modifier
                            .clickable { viewModel.setTestament("NT") }
                            .padding(vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Section Filter Chips
                val sections = if (state.currentTestament == "OT") {
                    listOf("All", "Pentateuch", "Historical", "Poetry", "Major Prophets", "Minor Prophets")
                } else {
                    listOf("All", "Gospels", "History", "Pauline Epistles", "General Epistles", "Apocalyptic")
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(sections) { sec ->
                        val isSelected = state.currentSection == sec
                        Surface(
                            onClick = { viewModel.setSection(sec) },
                            shape = RoundedCornerShape(18.dp),
                            color = if (isSelected) RemoraAccent.copy(alpha = 0.2f) else RemoraCardBg,
                            border = BorderStroke(
                                1.dp,
                                if (isSelected) RemoraAccent else RemoraCardBorder
                            )
                        ) {
                            Text(
                                text = sec,
                                fontSize = 13.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) RemoraAccentLight else RemoraTextSecondary,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
            }

            // Books Grid
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = RemoraAccent)
                }
            } else if (state.filteredBooks.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No books found matching \"${state.searchQuery}\"", color = RemoraTextSecondary)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(bottom = 80.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(state.filteredBooks, key = { it.id }) { book ->
                        RemoraBookCard(
                            book = book,
                            activeVersion = state.activeVersion,
                            onClick = { onOpenBook(book.id) }
                        )
                    }
                }
            }
        }

        // Bottom Navigation Bar matching Remora PWA Guides.tsx lines 1004-1052
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
            color = RemoraCardBg,
            border = BorderStroke(1.dp, RemoraCardBorder)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // OT Button
                TextButton(
                    onClick = { viewModel.setTestament("OT") },
                    enabled = state.currentTestament != "OT"
                ) {
                    Icon(
                        Icons.Default.ChevronLeft,
                        contentDescription = "Old Testament",
                        tint = if (state.currentTestament != "OT") RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.4f),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Old Testament",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (state.currentTestament != "OT") RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.4f)
                    )
                }

                // INDEX Button
                OutlinedButton(
                    onClick = { showIndexModal = true },
                    shape = RoundedCornerShape(6.dp),
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
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

                // NT Button
                TextButton(
                    onClick = { viewModel.setTestament("NT") },
                    enabled = state.currentTestament != "NT"
                ) {
                    Text(
                        text = "New Testament",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (state.currentTestament != "NT") RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.4f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = "New Testament",
                        tint = if (state.currentTestament != "NT") RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.4f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }

    if (showIndexModal) {
        BibleIndexModal(
            isOpen = showIndexModal,
            selectedBookId = null,
            books = state.allBooks,
            activeVersion = state.activeVersion,
            onSelectBook = { bookId ->
                showIndexModal = false
                onOpenBook(bookId)
            },
            onDismiss = { showIndexModal = false }
        )
    }
}

@Composable
private fun RemoraBookCard(
    book: Book,
    activeVersion: String = "LSB",
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            // Book Cover Image Plate (Aspect Ratio 16:9, matching chapter plate images)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
            ) {
                BookCoverImage(
                    bookKey = book.key,
                    contentDescription = book.nameEn,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Caption Section
            Column(modifier = Modifier.padding(12.dp)) {
                // Meta Line: KEYWORD · THEMEWORD · CHAPTERS
                val meta = buildString {
                    if (book.keyWord.isNotBlank()) append("${book.keyWord} · ")
                    if (book.themeWord.isNotBlank()) append("${book.themeWord} · ")
                    append("${book.chapters} chs")
                }
                Text(
                    text = meta.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = RemoraAccentLight
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Title: English & Telugu Name
                Text(
                    text = BookNameUtils.getBookDisplayName(book, activeVersion),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary,
                    maxLines = 1
                )

                if (book.subtitle.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = book.subtitle,
                        fontSize = 11.sp,
                        fontStyle = FontStyle.Italic,
                        lineHeight = 15.sp,
                        color = RemoraTextSecondary,
                        maxLines = 2
                    )
                }
            }

            // Hairline Accent Rule at bottom
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(RemoraAccent.copy(alpha = 0.5f))
            )
        }
    }
}
