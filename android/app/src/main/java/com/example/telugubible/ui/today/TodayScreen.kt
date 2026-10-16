package com.example.telugubible.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.*

@Composable
fun TodayScreen(
    viewModel: TodayViewModel,
    onNavigateToPractice: () -> Unit,
    onNavigateToReader: (Int, Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
    ) {
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RemoraAccent)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 16.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Streak Banner
                item {
                    StreakBanner(streak = state.streak)
                }

                // 2. Review & Progress Summary Cards
                item {
                    ReviewSummaryRow(
                        dueCount = state.dueCount,
                        memorizedCount = state.memorizedCount,
                        learningCount = state.learningCount,
                        onStartReview = onNavigateToPractice
                    )
                }

                // 3. Filter Row
                item {
                    FilterTabs(
                        currentFilter = state.filter,
                        allCount = state.verses.size,
                        dueCount = state.dueCount,
                        learningCount = state.learningCount,
                        memorizedCount = state.memorizedCount,
                        onSelectFilter = { viewModel.setFilter(it) }
                    )
                }

                // 4. Memory Verse Cards
                if (state.filteredVerses.isEmpty()) {
                    item {
                        EmptyVerseState(
                            filter = state.filter,
                            onAddClick = { viewModel.toggleAddDialog(true) }
                        )
                    }
                } else {
                    items(state.filteredVerses, key = { it.id }) { verse ->
                        MemoryVerseCard(
                            verse = verse,
                            onPractice = onNavigateToPractice,
                            onRead = { onNavigateToReader(verse.bookId, verse.chapter) },
                            onDelete = { viewModel.removeVerse(verse.id) }
                        )
                    }
                }
            }
        }

        // Floating Action Button to Add Verse
        FloatingActionButton(
            onClick = { viewModel.toggleAddDialog(true) },
            containerColor = RemoraAccent,
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Verse")
        }

        // Add Verse Dialog
        if (state.showAddDialog) {
            AddVerseDialog(
                books = state.books,
                onDismiss = { viewModel.toggleAddDialog(false) },
                onAdd = { bookId, chapter, verse ->
                    viewModel.addVerse(bookId, chapter, verse)
                }
            )
        }
    }
}

@Composable
private fun StreakBanner(streak: Int) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(RemoraGold.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.LocalFireDepartment,
                    contentDescription = null,
                    tint = RemoraGold,
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "$streak Day Streak",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Keep the Word hidden in your heart today.",
                    fontSize = 13.sp,
                    color = RemoraTextSecondary
                )
            }
        }
    }
}

@Composable
private fun ReviewSummaryRow(
    dueCount: Int,
    memorizedCount: Int,
    learningCount: Int,
    onStartReview: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Due card with Action
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = RemoraCardBgElevated,
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "READY FOR REVIEW",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = if (dueCount > 0) RemoraAccentLight else RemoraTextMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (dueCount > 0) "$dueCount verses due today" else "All caught up for today!",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraTextPrimary
                    )
                }

                if (dueCount > 0) {
                    Button(
                        onClick = onStartReview,
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Practice", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }

        // Stats row (Memorized & Learning)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.weight(1f)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "MEMORIZED",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = GradeEasy
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "$memorizedCount verses",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.weight(1f)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "LEARNING",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = GradeGood
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "$learningCount verses",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterTabs(
    currentFilter: VerseFilter,
    allCount: Int,
    dueCount: Int,
    learningCount: Int,
    memorizedCount: Int,
    onSelectFilter: (VerseFilter) -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        val items = listOf(
            Triple(VerseFilter.ALL, "All", allCount),
            Triple(VerseFilter.DUE, "Due", dueCount),
            Triple(VerseFilter.LEARNING, "Learning", learningCount),
            Triple(VerseFilter.MEMORIZED, "Memorized", memorizedCount)
        )
        items(items) { (filter, label, count) ->
            val isSelected = currentFilter == filter
            Surface(
                onClick = { onSelectFilter(filter) },
                shape = RoundedCornerShape(20.dp),
                color = if (isSelected) RemoraAccent else RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isSelected) RemoraAccent else RemoraCardBorder
                )
            ) {
                Text(
                    text = "$label ($count)",
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) Color.White else RemoraTextSecondary,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                )
            }
        }
    }
}

@Composable
private fun MemoryVerseCard(
    verse: UserMemoryVerse,
    onPractice: () -> Unit,
    onRead: () -> Unit,
    onDelete: () -> Unit
) {
    val isDue = verse.nextDueDate <= System.currentTimeMillis()
    val isMemorized = verse.status == "memorized"

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: Reference + Status Chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${verse.bookNameEn} · ${verse.bookNameTe} ${verse.chapter}:${verse.verse}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = when {
                        isDue -> RemoraAccent.copy(alpha = 0.2f)
                        isMemorized -> GradeEasy.copy(alpha = 0.2f)
                        else -> GradeGood.copy(alpha = 0.2f)
                    }
                ) {
                    Text(
                        text = when {
                            isDue -> "DUE"
                            isMemorized -> "MEMORIZED"
                            else -> "STAGE ${verse.repetition}"
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            isDue -> RemoraAccentLight
                            isMemorized -> GradeEasy
                            else -> GradeGood
                        },
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Telugu Verse Text
            if (!verse.textTe.isNullOrBlank()) {
                Text(
                    text = verse.textTe,
                    fontSize = 16.sp,
                    lineHeight = 24.sp,
                    color = RemoraTextPrimary
                )
                Spacer(modifier = Modifier.height(6.dp))
            }

            // English Verse Text
            if (!verse.textEn.isNullOrBlank()) {
                Text(
                    text = verse.textEn,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    color = RemoraTextSecondary
                )
            }

            Spacer(modifier = Modifier.height(14.dp))
            Divider(color = RemoraCardBorder, thickness = 1.dp)
            Spacer(modifier = Modifier.height(10.dp))

            // Action row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onRead,
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                    ) {
                        Icon(Icons.Default.MenuBook, contentDescription = null, tint = RemoraTextSecondary, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Read", fontSize = 12.sp, color = RemoraTextSecondary)
                    }

                    if (isDue) {
                        Button(
                            onClick = onPractice,
                            shape = RoundedCornerShape(6.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text("Practice", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.DeleteOutline,
                        contentDescription = "Delete",
                        tint = RemoraTextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyVerseState(filter: VerseFilter, onAddClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = when (filter) {
                VerseFilter.DUE -> "No verses currently due for review."
                VerseFilter.MEMORIZED -> "No memorized verses yet. Keep reviewing!"
                VerseFilter.LEARNING -> "No verses currently in learning."
                VerseFilter.ALL -> "No memory verses saved yet."
            },
            fontSize = 15.sp,
            color = RemoraTextSecondary
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onAddClick,
            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
            shape = RoundedCornerShape(8.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Add a Memory Verse")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddVerseDialog(
    books: List<com.example.telugubible.data.model.Book>,
    onDismiss: () -> Unit,
    onAdd: (Int, Int, Int) -> Unit
) {
    var selectedBookIndex by remember { mutableStateOf(0) }
    var chapterText by remember { mutableStateOf("1") }
    var verseText by remember { mutableStateOf("1") }
    var isExpanded by remember { mutableStateOf(false) }

    val currentBook = books.getOrNull(selectedBookIndex)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Memory Verse", color = RemoraTextPrimary) },
        containerColor = RemoraCardBg,
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Select Bible book, chapter, and verse:", color = RemoraTextSecondary, fontSize = 13.sp)

                // Book dropdown
                ExposedDropdownMenuBox(
                    expanded = isExpanded,
                    onExpandedChange = { isExpanded = !isExpanded }
                ) {
                    OutlinedTextField(
                        value = "${currentBook?.nameEn ?: ""} (${currentBook?.nameTe ?: ""})",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isExpanded) },
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = RemoraTextPrimary,
                            unfocusedTextColor = RemoraTextPrimary,
                            focusedBorderColor = RemoraAccent,
                            unfocusedBorderColor = RemoraCardBorder
                        )
                    )
                    ExposedDropdownMenu(
                        expanded = isExpanded,
                        onDismissRequest = { isExpanded = false },
                        modifier = Modifier.background(RemoraCardBgElevated)
                    ) {
                        books.forEachIndexed { index, b ->
                            DropdownMenuItem(
                                text = { Text("${b.nameEn} (${b.nameTe})", color = RemoraTextPrimary) },
                                onClick = {
                                    selectedBookIndex = index
                                    isExpanded = false
                                }
                            )
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = chapterText,
                        onValueChange = { chapterText = it.filter { c -> c.isDigit() } },
                        label = { Text("Chapter") },
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = RemoraTextPrimary,
                            unfocusedTextColor = RemoraTextPrimary,
                            focusedBorderColor = RemoraAccent,
                            unfocusedBorderColor = RemoraCardBorder
                        )
                    )

                    OutlinedTextField(
                        value = verseText,
                        onValueChange = { verseText = it.filter { c -> c.isDigit() } },
                        label = { Text("Verse") },
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = RemoraTextPrimary,
                            unfocusedTextColor = RemoraTextPrimary,
                            focusedBorderColor = RemoraAccent,
                            unfocusedBorderColor = RemoraCardBorder
                        )
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val book = currentBook ?: return@Button
                    val ch = chapterText.toIntOrNull() ?: 1
                    val vs = verseText.toIntOrNull() ?: 1
                    onAdd(book.id, ch, vs)
                },
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
            ) {
                Text("Add to Today", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = RemoraTextSecondary)
            }
        }
    )
}
