package com.example.telugubible.ui.bible

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
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
    onChromeVisibilityChange: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    var showIndexModal by remember { mutableStateOf(false) }
    var isChromeVisible by remember { mutableStateOf(true) }
    val listState = rememberLazyListState()

    fun updateChromeVisibility(visible: Boolean) {
        if (isChromeVisible != visible) {
            isChromeVisible = visible
            onChromeVisibilityChange?.invoke(visible)
        }
    }

    // Always keep chrome visible if search is active
    LaunchedEffect(state.searchQuery) {
        if (state.searchQuery.isNotBlank()) {
            updateChromeVisibility(true)
        }
    }

    // Auto-hide when scrolling down, auto-show when scrolling up
    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (state.searchQuery.isNotBlank()) return Offset.Zero

                val delta = available.y
                if (delta < -12f) {
                    // Scrolling down -> hide chrome
                    updateChromeVisibility(false)
                } else if (delta > 12f) {
                    // Scrolling up -> show chrome
                    updateChromeVisibility(true)
                }
                return Offset.Zero
            }
        }
    }

    // Always show chrome when scrolled to top
    LaunchedEffect(listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset) {
        if (listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset < 15) {
            updateChromeVisibility(true)
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
            .nestedScroll(nestedScrollConnection)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            // Auto-hiding Top Chrome: Search Bar & Section Chips
            AnimatedVisibility(
                visible = isChromeVisible || state.searchQuery.isNotBlank(),
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Column {
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

                    Spacer(modifier = Modifier.height(10.dp))

                    // Section Filter Chips (OT/NT link row removed as requested)
                    if (state.searchQuery.isBlank()) {
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

                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
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
                LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(bottom = 80.dp),
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
        AnimatedVisibility(
            visible = isChromeVisible || state.searchQuery.isNotBlank(),
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
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
            // Book Cover Image Plate (Aspect Ratio 4:3, matching 4:3 artwork)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
            ) {
                BookCoverImage(
                    bookKey = book.key,
                    contentDescription = book.nameEn,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Caption Section
            Column(modifier = Modifier.padding(14.dp)) {
                // Meta Line: KEYWORD · THEMEWORD · CHAPTERS
                val meta = buildString {
                    if (book.keyWord.isNotBlank()) append("${book.keyWord} · ")
                    if (book.themeWord.isNotBlank()) append("${book.themeWord} · ")
                    append("${book.chapters} chapters")
                }
                Text(
                    text = meta.uppercase(),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = RemoraAccentLight
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Title: English & Telugu Name
                Text(
                    text = BookNameUtils.getBookDisplayName(book, activeVersion),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary,
                    maxLines = 1
                )

                if (book.subtitle.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = book.subtitle,
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        lineHeight = 18.sp,
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
