package com.example.telugubible.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookNameUtils

enum class AddVerseTab {
    COLLECTIONS, SEARCH, MANUAL
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddVerseSheet(
    books: List<Book>,
    collections: List<PresetCollection>,
    searchResults: List<VerseSearchResult>,
    isSearching: Boolean,
    activeVersion: String = "LSB",
    onDismiss: () -> Unit,
    onAddSingleVerse: (Int, Int, Int) -> Unit,
    onAddCollection: (String) -> Unit,
    onSearchVerses: (String) -> Unit
) {
    var activeTab by remember { mutableStateOf(AddVerseTab.COLLECTIONS) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = RemoraCardBg,
        tonalElevation = 6.dp,
        modifier = Modifier.fillMaxHeight(0.88f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Add a Verse",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = RemoraTextSecondary)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 3-Way Mode Switcher: Collections, Search API, Manual
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(RemoraCardBgElevated, shape = RoundedCornerShape(10.dp))
                    .border(1.dp, RemoraCardBorder, shape = RoundedCornerShape(10.dp))
                    .padding(4.dp)
            ) {
                TabButton(
                    label = "Collections",
                    isSelected = activeTab == AddVerseTab.COLLECTIONS,
                    onClick = { activeTab = AddVerseTab.COLLECTIONS },
                    modifier = Modifier.weight(1f)
                )
                TabButton(
                    label = "Search",
                    isSelected = activeTab == AddVerseTab.SEARCH,
                    onClick = { activeTab = AddVerseTab.SEARCH },
                    modifier = Modifier.weight(1f)
                )
                TabButton(
                    label = "Manual",
                    isSelected = activeTab == AddVerseTab.MANUAL,
                    onClick = { activeTab = AddVerseTab.MANUAL },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            when (activeTab) {
                AddVerseTab.COLLECTIONS -> {
                    CollectionsTabContent(
                        collections = collections,
                        onAddCollection = onAddCollection
                    )
                }
                AddVerseTab.SEARCH -> {
                    SearchTabContent(
                        searchResults = searchResults,
                        isSearching = isSearching,
                        onSearch = onSearchVerses,
                        onAddVerse = onAddSingleVerse
                    )
                }
                AddVerseTab.MANUAL -> {
                    ManualTabContent(
                        books = books,
                        activeVersion = activeVersion,
                        onAdd = onAddSingleVerse
                    )
                }
            }
        }
    }
}

@Composable
private fun TabButton(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) RemoraAccent else Color.Transparent,
        modifier = modifier
    ) {
        Box(
            modifier = Modifier.padding(vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                fontSize = 12.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) Color.White else RemoraTextSecondary
            )
        }
    }
}

@Composable
private fun CollectionsTabContent(
    collections: List<PresetCollection>,
    onAddCollection: (String) -> Unit
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        item {
            Text(
                text = "Kickstart your memory practice with curated verse collections. Adding a collection loads passages directly into your daily review schedule.",
                fontSize = 13.sp,
                color = RemoraTextSecondary,
                lineHeight = 19.sp
            )
        }

        // Card 1: Top 100 Verses
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBgElevated,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Top 100 Verses",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = RemoraAccent.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "100 PASSAGES",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccentLight,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "The 100 most popular Bible verses according to global search data (Joshua 1:8, Psalm 23, John 3:16, Romans 8:28, Philippians 4:13...).",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = { onAddCollection("top_100") },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add Top 100", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Card 2: 75 Well-Known Verses
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBgElevated,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "75 Well-Known Verses",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = RemoraGold.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "75 PASSAGES",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraGold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "A hand-picked selection of deeply encouraging and essential scriptures across the Old and New Testaments.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedButton(
                        onClick = { onAddCollection("well_known") },
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraGold),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = RemoraGold, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add 75 Well-Known", fontWeight = FontWeight.Bold, color = RemoraGold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchTabContent(
    searchResults: List<VerseSearchResult>,
    isSearching: Boolean,
    onSearch: (String) -> Unit,
    onAddVerse: (Int, Int, Int) -> Unit
) {
    var query by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                onSearch(it)
            },
            placeholder = { Text("Search verse e.g. John 3:16 or grace...", color = RemoraTextMuted, fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = RemoraTextMuted) },
            singleLine = true,
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = RemoraCardBgElevated,
                unfocusedContainerColor = RemoraCardBgElevated,
                focusedTextColor = RemoraTextPrimary,
                unfocusedTextColor = RemoraTextPrimary,
                focusedBorderColor = RemoraAccent,
                unfocusedBorderColor = RemoraCardBorder
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (isSearching) {
            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RemoraAccent)
            }
        } else if (searchResults.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Text(
                    text = if (query.isBlank()) "Type a book, chapter, or phrase to search." else "No verses found.",
                    color = RemoraTextSecondary,
                    fontSize = 13.sp
                )
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                items(searchResults, key = { it.id }) { result ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = RemoraCardBgElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${result.bookNameEn} (${result.bookNameTe}) ${result.chapter}:${result.verse}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccentLight
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = result.textTe ?: result.textEn ?: "",
                                    fontSize = 13.sp,
                                    maxLines = 2,
                                    color = RemoraTextPrimary
                                )
                            }
                            IconButton(onClick = { onAddVerse(result.bookId, result.chapter, result.verse) }) {
                                Icon(Icons.Default.Add, contentDescription = "Add", tint = RemoraAccent)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManualTabContent(
    books: List<Book>,
    activeVersion: String = "LSB",
    onAdd: (Int, Int, Int) -> Unit
) {
    var selectedBookIndex by remember { mutableStateOf(0) }
    var chapterText by remember { mutableStateOf("1") }
    var verseText by remember { mutableStateOf("1") }
    var isExpanded by remember { mutableStateOf(false) }

    val currentBook = books.getOrNull(selectedBookIndex)

    Column(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text("Select Bible book, chapter, and verse:", color = RemoraTextSecondary, fontSize = 13.sp)

        ExposedDropdownMenuBox(
            expanded = isExpanded,
            onExpandedChange = { isExpanded = !isExpanded }
        ) {
            OutlinedTextField(
                value = currentBook?.let { BookNameUtils.getBookDisplayName(it, activeVersion) } ?: "",
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
                        text = { Text(BookNameUtils.getBookDisplayName(b, activeVersion), color = RemoraTextPrimary) },
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

        Spacer(modifier = Modifier.height(10.dp))

        Button(
            onClick = {
                val book = currentBook ?: return@Button
                val ch = chapterText.toIntOrNull() ?: 1
                val vs = verseText.toIntOrNull() ?: 1
                onAdd(book.id, ch, vs)
            },
            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Text("Add to Library", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}
