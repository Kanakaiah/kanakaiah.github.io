package com.example.telugubible.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookNameUtils

enum class AddVerseTab {
    MANUAL, SEARCH, COLLECTIONS
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddVerseSheet(
    books: List<Book>,
    topics: List<Topic>,
    searchResults: List<VerseSearchResult>,
    isSearching: Boolean,
    activeVersion: String = "LSB",
    onDismiss: () -> Unit,
    onAddSingleVerse: (bookId: Int, chapter: Int, verse: Int, endVerse: Int?, topicIds: List<String>) -> Unit,
    onAddIndividually: (verses: List<Triple<Int, Int, Int>>, topicIds: List<String>) -> Unit,
    onAddManualVerse: (String, String, String, List<String>) -> Unit,
    onAddCollection: (String, List<String>) -> Unit,
    onSearchVerses: (query: String, translation: String) -> Unit,
    onCreateTopic: (String, (Topic) -> Unit) -> Unit = { _, _ -> },
    onNavigateToGuides: () -> Unit
) {
    var activeTab by remember { mutableStateOf(AddVerseTab.MANUAL) }
    var selectedTopicIds by remember { mutableStateOf(setOf<String>()) }
    var isAddingGroup by remember { mutableStateOf(false) }
    var newGroupName by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = RemoraCardBg,
        tonalElevation = 6.dp,
        modifier = Modifier.fillMaxHeight(0.92f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            // Header matching PWD AddVerse.tsx
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Add New Verses",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        letterSpacing = (-0.5).sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Grow your library by searching or adding verses manually.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = RemoraTextSecondary)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Global Group Selector: "Assign to Groups (Optional)"
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "ASSIGN TO GROUPS (OPTIONAL)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = RemoraTextMuted
                )
                Spacer(modifier = Modifier.height(6.dp))

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(topics) { topic ->
                        val isSelected = selectedTopicIds.contains(topic.id)
                        Surface(
                            onClick = {
                                selectedTopicIds = if (isSelected) {
                                    selectedTopicIds - topic.id
                                } else {
                                    selectedTopicIds + topic.id
                                }
                            },
                            shape = RoundedCornerShape(16.dp),
                            color = if (isSelected) RemoraAccent.copy(alpha = 0.18f) else Color.Transparent,
                            border = BorderStroke(
                                1.dp,
                                if (isSelected) RemoraAccent else RemoraCardBorder
                            )
                        ) {
                            Text(
                                text = topic.name,
                                fontSize = 13.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) RemoraAccentLight else RemoraTextSecondary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }

                    item {
                        if (isAddingGroup) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                OutlinedTextField(
                                    value = newGroupName,
                                    onValueChange = { newGroupName = it },
                                    placeholder = { Text("New group...", fontSize = 13.sp) },
                                    singleLine = true,
                                    modifier = Modifier.width(130.dp).height(46.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedTextColor = RemoraTextPrimary,
                                        unfocusedTextColor = RemoraTextPrimary,
                                        focusedBorderColor = RemoraAccent,
                                        unfocusedBorderColor = RemoraCardBorder
                                    )
                                )
                                IconButton(
                                    onClick = {
                                        val trimmed = newGroupName.trim()
                                        if (trimmed.isNotBlank()) {
                                            onCreateTopic(trimmed) { created ->
                                                selectedTopicIds = selectedTopicIds + created.id
                                            }
                                            newGroupName = ""
                                            isAddingGroup = false
                                        }
                                    },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = "Save group", tint = RemoraAccent)
                                }
                            }
                        } else {
                            Surface(
                                onClick = { isAddingGroup = true },
                                shape = RoundedCornerShape(16.dp),
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, RemoraCardBorder)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, tint = RemoraTextSecondary, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("New Group", fontSize = 13.sp, color = RemoraTextSecondary, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3 Mode Selection Buttons Grid (Manual, Search API, Collections) matching PWD
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(RemoraCardBgElevated, shape = RoundedCornerShape(10.dp))
                    .border(1.dp, RemoraCardBorder, shape = RoundedCornerShape(10.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ModeTabButton(
                    icon = Icons.Default.Edit,
                    label = "Manual",
                    isSelected = activeTab == AddVerseTab.MANUAL,
                    onClick = { activeTab = AddVerseTab.MANUAL },
                    modifier = Modifier.weight(1f)
                )
                ModeTabButton(
                    icon = Icons.Default.Search,
                    label = "Search API",
                    isSelected = activeTab == AddVerseTab.SEARCH,
                    onClick = { activeTab = AddVerseTab.SEARCH },
                    modifier = Modifier.weight(1f)
                )
                ModeTabButton(
                    icon = Icons.Default.ViewList,
                    label = "Collections",
                    isSelected = activeTab == AddVerseTab.COLLECTIONS,
                    onClick = { activeTab = AddVerseTab.COLLECTIONS },
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            when (activeTab) {
                AddVerseTab.MANUAL -> {
                    ManualTabContent(
                        books = books,
                        activeVersion = activeVersion,
                        onAddManual = { ref, text, trans ->
                            onAddManualVerse(ref, text, trans, selectedTopicIds.toList())
                        },
                        onAddByPicker = { bookId, ch, vs ->
                            onAddSingleVerse(bookId, ch, vs, null, selectedTopicIds.toList())
                        }
                    )
                }
                AddVerseTab.SEARCH -> {
                    SearchTabContent(
                        searchResults = searchResults,
                        isSearching = isSearching,
                        activeVersion = activeVersion,
                        onSearch = onSearchVerses,
                        onAddVerse = { bookId, ch, vs, endVs ->
                            onAddSingleVerse(bookId, ch, vs, endVs, selectedTopicIds.toList())
                        },
                        onAddIndividually = { verses ->
                            onAddIndividually(verses, selectedTopicIds.toList())
                        },
                        onAddAll = { results ->
                            results.forEach { r ->
                                onAddSingleVerse(r.bookId, r.chapter, r.verse, r.endVerse, selectedTopicIds.toList())
                            }
                        }
                    )
                }
                AddVerseTab.COLLECTIONS -> {
                    CollectionsTabContent(
                        onAddCollection = { collId ->
                            onAddCollection(collId, selectedTopicIds.toList())
                        },
                        onNavigateToGuides = onNavigateToGuides
                    )
                }
            }
        }
    }
}

@Composable
private fun ModeTabButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
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
        Column(
            modifier = Modifier.padding(vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) Color.White else RemoraTextSecondary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) Color.White else RemoraTextSecondary
            )
        }
    }
}

// ----------------------------------------------------
// 1. MANUAL TAB CONTENT
// ----------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManualTabContent(
    books: List<Book>,
    activeVersion: String = "LSB",
    onAddManual: (String, String, String) -> Unit,
    onAddByPicker: (Int, Int, Int) -> Unit
) {
    var manualRef by remember { mutableStateOf("") }
    var manualTranslation by remember { mutableStateOf(activeVersion) }
    var manualText by remember { mutableStateOf("") }
    var usePicker by remember { mutableStateOf(false) }

    // Picker state
    var selectedBookIndex by remember { mutableIntStateOf(0) }
    var chapterText by remember { mutableStateOf("1") }
    var verseText by remember { mutableStateOf("1") }
    var isExpanded by remember { mutableStateOf(false) }
    val currentBook = books.getOrNull(selectedBookIndex)

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (usePicker) "Pick book, chapter & verse:" else "Type reference & text:",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = RemoraTextSecondary
                )
                TextButton(onClick = { usePicker = !usePicker }) {
                    Text(
                        text = if (usePicker) "Switch to Text Input" else "Pick from Bible Dropdown",
                        fontSize = 12.sp,
                        color = RemoraAccent
                    )
                }
            }
        }

        if (usePicker) {
            item {
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
            }

            item {
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

            item {
                Button(
                    onClick = {
                        val book = currentBook ?: return@Button
                        val ch = chapterText.toIntOrNull() ?: 1
                        val vs = verseText.toIntOrNull() ?: 1
                        onAddByPicker(book.id, ch, vs)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Add to Library", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }
        } else {
            // PWD Manual Mode Text Fields
            item {
                OutlinedTextField(
                    value = manualRef,
                    onValueChange = { manualRef = it },
                    label = { Text("Reference") },
                    placeholder = { Text("e.g. Genesis 1:1 or John 3:16", color = RemoraTextMuted) },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                OutlinedTextField(
                    value = manualTranslation,
                    onValueChange = { manualTranslation = it },
                    label = { Text("Translation Version") },
                    placeholder = { Text("e.g. LSB, NIV, ESV", color = RemoraTextMuted) },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                OutlinedTextField(
                    value = manualText,
                    onValueChange = { manualText = it },
                    label = { Text("Verse Text") },
                    placeholder = { Text("Type or paste the verse text here...", color = RemoraTextMuted) },
                    minLines = 4,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                Button(
                    onClick = {
                        if (manualRef.isNotBlank()) {
                            onAddManual(manualRef.trim(), manualText.trim(), manualTranslation.trim().ifBlank { "LSB" })
                        }
                    },
                    enabled = manualRef.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Add Verse", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
            }
        }
    }
}

// ----------------------------------------------------
// 2. SEARCH API TAB CONTENT
// ----------------------------------------------------
@Composable
private fun SearchTabContent(
    searchResults: List<VerseSearchResult>,
    isSearching: Boolean,
    activeVersion: String = "LSB",
    onSearch: (String, String) -> Unit,
    onAddVerse: (Int, Int, Int, Int?) -> Unit,
    onAddIndividually: (List<Triple<Int, Int, Int>>) -> Unit,
    onAddAll: (List<VerseSearchResult>) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var selectedTranslation by remember { mutableStateOf(activeVersion.ifBlank { "LSB" }) }
    var translationExpanded by remember { mutableStateOf(false) }
    val translationOptions = listOf("LSB", "WEB", "NASB", "ESV", "KJV", "NLT", "BSB")

    val curatedCollections = listOf(
        Triple("Peace & Calming", "Verses for anxiety & stress", "Philippians 4:6-7"),
        Triple("Faith & Trust", "Strengthen your belief", "Proverbs 3:5-6"),
        Triple("Strength & Courage", "Power to overcome obstacles", "Joshua 1:9"),
        Triple("Love & Grace", "God's love and kindness", "Romans 8:38-39")
    )

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        onSearch(it, selectedTranslation)
                    },
                    placeholder = { Text("e.g. John 3:16 or Psalm 23:1-3", color = RemoraTextMuted, fontSize = 13.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = RemoraTextMuted) },
                    trailingIcon = {
                        if (query.isNotEmpty()) {
                            IconButton(onClick = {
                                query = ""
                                onSearch("", selectedTranslation)
                            }) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = RemoraTextMuted)
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = RemoraCardBgElevated,
                        unfocusedContainerColor = RemoraCardBgElevated,
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder
                    ),
                    modifier = Modifier.weight(1f)
                )

                Box {
                    Surface(
                        onClick = { translationExpanded = true },
                        shape = RoundedCornerShape(8.dp),
                        color = RemoraCardBgElevated,
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.height(52.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp)
                        ) {
                            Text(
                                text = selectedTranslation,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccentLight
                            )
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = RemoraTextMuted, modifier = Modifier.size(18.dp))
                        }
                    }

                    DropdownMenu(
                        expanded = translationExpanded,
                        onDismissRequest = { translationExpanded = false }
                    ) {
                        translationOptions.forEach { opt ->
                            DropdownMenuItem(
                                text = { Text(opt, fontSize = 14.sp, fontWeight = if (opt == selectedTranslation) FontWeight.Bold else FontWeight.Normal) },
                                onClick = {
                                    selectedTranslation = opt
                                    translationExpanded = false
                                    if (query.isNotBlank()) {
                                        onSearch(query, opt)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }

        if (isSearching) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = RemoraAccent)
                }
            }
        } else if (searchResults.isNotEmpty()) {
            if (searchResults.size > 1) {
                item {
                    Button(
                        onClick = { onAddAll(searchResults) },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent.copy(alpha = 0.2f)),
                        border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = RemoraAccentLight, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Add All ${searchResults.size} Results",
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccentLight
                        )
                    }
                }
            }

            items(searchResults, key = { it.id }) { result ->
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = RemoraCardBgElevated,
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        val hasMultiple = result.individualVerses.size > 1 || (result.endVerse != null && result.endVerse > result.verse)
                        val refDisplay = if (result.endVerse != null && result.endVerse > result.verse) {
                            "${result.bookNameEn} (${result.bookNameTe}) ${result.chapter}:${result.verse}-${result.endVerse}"
                        } else {
                            "${result.bookNameEn} (${result.bookNameTe}) ${result.chapter}:${result.verse}"
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = refDisplay,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccentLight
                            )
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = RemoraAccent.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = selectedTranslation,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccentLight,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        val displayTxt = (result.textEn ?: result.textTe ?: "").replace(Regex("<[^>]+>"), "").trim()
                        Text(
                            text = displayTxt,
                            fontSize = 13.sp,
                            fontFamily = FontFamily.Serif,
                            lineHeight = 18.sp,
                            color = RemoraTextPrimary
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            if (hasMultiple) {
                                val versesList = if (result.individualVerses.isNotEmpty()) {
                                    result.individualVerses.map { Triple(result.bookId, result.chapter, it.first) }
                                } else {
                                    (result.verse..(result.endVerse ?: result.verse)).map { Triple(result.bookId, result.chapter, it) }
                                }
                                OutlinedButton(
                                    onClick = { onAddIndividually(versesList) },
                                    shape = RoundedCornerShape(6.dp),
                                    border = BorderStroke(1.dp, RemoraCardBorder),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text("Add Individually (${versesList.size})", fontSize = 12.sp, color = RemoraTextPrimary)
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Button(
                                    onClick = { onAddVerse(result.bookId, result.chapter, result.verse, result.endVerse) },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Add Combined (1)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            } else {
                                Button(
                                    onClick = { onAddVerse(result.bookId, result.chapter, result.verse, null) },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Add to Library", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        } else if (query.isNotBlank()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                    Text("No verses found for '$query'", color = RemoraTextSecondary, fontSize = 13.sp)
                }
            }
        }

        // Curated Collections Grid matching PWD
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "CURATED COLLECTIONS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                color = RemoraTextMuted
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        items(curatedCollections) { (topic, desc, refQuery) ->
            Surface(
                onClick = {
                    query = refQuery
                    onSearch(refQuery, selectedTranslation)
                },
                shape = RoundedCornerShape(10.dp),
                color = RemoraCardBgElevated,
                border = BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = topic,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "$desc · $refQuery",
                        fontSize = 12.sp,
                        color = RemoraTextSecondary
                    )
                }
            }
        }
    }
}

// ----------------------------------------------------
// 3. COLLECTIONS TAB CONTENT (Top 100 & 75 Well-Known)
// ----------------------------------------------------
@Composable
private fun CollectionsTabContent(
    onAddCollection: (String) -> Unit,
    onNavigateToGuides: () -> Unit
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        item {
            Text(
                text = "Kickstart your memory journey with curated collections of popular verses. Adding a collection automatically groups them together for easy practice.",
                fontSize = 13.sp,
                color = RemoraTextSecondary,
                lineHeight = 19.sp
            )
        }

        // Card 0: 66 Key Verses (From Genesis to Revelation)
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBgElevated,
                border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "66 Key Verses",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = RemoraGold.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "66 PASSAGES",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraGold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "One foundational key verse from every single book of the Bible, from Genesis to Revelation.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = { onAddCollection("key_verses_66") },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraGold, contentColor = Color.Black),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add 66 Key Verses", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }

        // Card 1: Top 100 Verses
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBgElevated,
                border = BorderStroke(1.dp, RemoraCardBorder),
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
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccentLight,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "The 100 most popular Bible verses according to global search data.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = { onAddCollection("top_100") },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add Top 100", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }

        // Card 2: 75 Well-Known Verses
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBgElevated,
                border = BorderStroke(1.dp, RemoraCardBorder),
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
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraGold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "A hand-picked selection of deeply encouraging and essential scriptures.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedButton(
                        onClick = { onAddCollection("well_known") },
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, RemoraGold),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = RemoraGold, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add Well-Known", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = RemoraGold)
                    }
                }
            }
        }

        // Card 3: Topical Memory Collections
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBgElevated,
                border = BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Topical Memory Collections",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Explore these thematic and book-specific collections in the Guides tab to view and add them in your preferred translation.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedButton(
                        onClick = onNavigateToGuides,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Default.ViewList, contentDescription = null, tint = RemoraAccentLight, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("View Collections in Guides", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = RemoraAccentLight)
                    }
                }
            }
        }
    }
}
