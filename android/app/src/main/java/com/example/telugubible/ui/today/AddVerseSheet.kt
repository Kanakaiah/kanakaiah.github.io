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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.BibleTranslation
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookNameUtils

enum class AddVerseTab {
    MANUAL, SEARCH, COLLECTIONS
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
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
    onAddManualVerse: (String, List<String>) -> Unit,
    onAddCollection: (String, List<String>) -> Unit,
    onSearchVerses: (query: String, translation: String) -> Unit,
    onCreateTopic: (String, (Topic) -> Unit) -> Unit = { _, _ -> },
    onNavigateToGuides: () -> Unit,
    initialTopicIds: Set<String> = emptySet(),
    searchError: String? = null,
    addError: String? = null
) {
    var activeTab by remember { mutableStateOf(AddVerseTab.MANUAL) }
    var selectedTopicIds by remember(initialTopicIds) { mutableStateOf(initialTopicIds) }
    var isAddingGroup by remember { mutableStateOf(false) }
    var newGroupName by remember { mutableStateOf("") }
    val compactForKeyboard = WindowInsets.ime.getBottom(LocalDensity.current) > 0 && !isAddingGroup

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
            if (!compactForKeyboard) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text("Add verses", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = RemoraTextSecondary)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Collections (optional)",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
                            modifier = Modifier.heightIn(min = 48.dp).semantics { selected = isSelected },
                            color = if (isSelected) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent,
                            border = BorderStroke(
                                1.dp,
                                if (isSelected) RemoraAccent else RemoraCardBorder
                            )
                        ) {
                            Text(
                                text = topic.name,
                                style = MaterialTheme.typography.labelLarge,
                                color = if (isSelected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurface,
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
                                    placeholder = { Text("New collection") },
                                    singleLine = true,
                                    modifier = Modifier.width(180.dp).heightIn(min = 56.dp),
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
                                    modifier = Modifier.size(48.dp)
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = "Save collection", tint = RemoraAccent)
                                }
                            }
                        } else {
                            Surface(
                                onClick = { isAddingGroup = true },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.heightIn(min = 48.dp),
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, RemoraCardBorder)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, tint = RemoraTextSecondary, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("New collection", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ModeTabButton(
                    icon = Icons.Default.Edit,
                    label = "Manual",
                    isSelected = activeTab == AddVerseTab.MANUAL,
                    onClick = { activeTab = AddVerseTab.MANUAL }
                )
                ModeTabButton(
                    icon = Icons.Default.Search,
                    label = "Search",
                    isSelected = activeTab == AddVerseTab.SEARCH,
                    onClick = { activeTab = AddVerseTab.SEARCH }
                )
                ModeTabButton(
                    icon = Icons.Default.ViewList,
                    label = "Collections",
                    isSelected = activeTab == AddVerseTab.COLLECTIONS,
                    onClick = { activeTab = AddVerseTab.COLLECTIONS }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            } else {
                Text("Add verses", style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(vertical = 8.dp).testTag("add-verse-compact-header"))
            }

            if (!addError.isNullOrBlank()) {
                Text(addError, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(bottom = 8.dp))
            }
            when (activeTab) {
                AddVerseTab.MANUAL -> {
                    ManualTabContent(
                        books = books,
                        activeVersion = activeVersion,
                        onAddManual = { ref ->
                            onAddManualVerse(ref, selectedTopicIds.toList())
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
                        },
                        searchError = searchError
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
    FilterChip(selected = isSelected, onClick = onClick, label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp)) },
        modifier = modifier.heightIn(min = 48.dp))
}

// ----------------------------------------------------
// 1. MANUAL TAB CONTENT
// ----------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManualTabContent(
    books: List<Book>,
    activeVersion: String = "LSB",
    onAddManual: (String) -> Unit,
    onAddByPicker: (Int, Int, Int) -> Unit
) {
    var manualRef by remember { mutableStateOf("") }
    var usePicker by remember { mutableStateOf(false) }

    // Picker state
    var selectedBookIndex by remember { mutableIntStateOf(0) }
    var chapterText by remember { mutableStateOf("1") }
    var verseText by remember { mutableStateOf("1") }
    var isExpanded by remember { mutableStateOf(false) }
    val currentBook = books.getOrNull(selectedBookIndex)
    val chapterNumber = chapterText.toIntOrNull()
    val verseNumber = verseText.toIntOrNull()
    val validChapter = chapterNumber != null && currentBook != null && chapterNumber in 1..currentBook.chapters
    val validVerse = verseNumber != null && verseNumber > 0

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp),
        modifier = Modifier.fillMaxWidth().testTag("manual-entry-list")
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (usePicker) "Pick book, chapter & verse:" else "Enter a reference:",
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
                        isError = chapterText.isNotEmpty() && !validChapter,
                        supportingText = { if (chapterText.isNotEmpty() && !validChapter) Text("Choose a valid chapter") },
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
                        isError = verseText.isNotEmpty() && !validVerse,
                        supportingText = { if (verseText.isNotEmpty() && !validVerse) Text("Enter a valid verse") },
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
                        val ch = chapterNumber ?: return@Button
                        val vs = verseNumber ?: return@Button
                        onAddByPicker(book.id, ch, vs)
                    },
                    enabled = validChapter && validVerse,
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
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
                Button(
                    onClick = {
                        if (manualRef.isNotBlank()) {
                            onAddManual(manualRef.trim())
                        }
                    },
                    enabled = manualRef.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
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
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun SearchTabContent(
    searchResults: List<VerseSearchResult>,
    isSearching: Boolean,
    activeVersion: String = "LSB",
    onSearch: (String, String) -> Unit,
    onAddVerse: (Int, Int, Int, Int?) -> Unit,
    onAddIndividually: (List<Triple<Int, Int, Int>>) -> Unit,
    onAddAll: (List<VerseSearchResult>) -> Unit,
    searchError: String? = null
) {
    var query by remember { mutableStateOf("") }
    var selectedTranslation by remember { mutableStateOf(activeVersion.ifBlank { "LSB" }) }
    var translationExpanded by remember { mutableStateOf(false) }
    val translationOptions = BibleTranslation.ALL
    LaunchedEffect(Unit) { onSearch("", selectedTranslation) }

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
                    label = { Text("Search Scripture") },
                    placeholder = { Text("e.g. John 3:16", color = RemoraTextMuted) },
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
                        modifier = Modifier.heightIn(min = 52.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp)
                        ) {
                            Text(
                                text = BibleTranslation.getLabel(selectedTranslation),
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
                                text = { Text(opt.fullLabel, style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = if (opt.code == selectedTranslation) FontWeight.Bold else FontWeight.Normal) },
                                onClick = {
                                    selectedTranslation = opt.code
                                    translationExpanded = false
                                    if (query.isNotBlank()) {
                                        onSearch(query, opt.code)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }

        item {
            Text("Reference search uses the selected translation. Keyword search uses offline Bible text.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (!searchError.isNullOrBlank()) item {
            Text(searchError, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
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
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            contentColor = MaterialTheme.colorScheme.onSecondaryContainer),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Add All ${searchResults.size} Results",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
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

                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = refDisplay,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccentLight
                            )
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

                        FlowRow(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)) {
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
