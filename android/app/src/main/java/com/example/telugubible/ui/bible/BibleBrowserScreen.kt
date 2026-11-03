package com.example.telugubible.ui.bible

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.Book
import com.example.telugubible.ui.common.BookCoverImage
import com.example.telugubible.util.BookNameUtils

@Composable
fun BibleBrowserScreen(
    viewModel: BibleBrowserViewModel,
    onOpenBook: (Int) -> Unit,
    onCloseToToday: (() -> Unit)? = null,
    onChromeVisibilityChange: ((Boolean) -> Unit)? = null,
    modifier: Modifier = Modifier,
    onReadBook: ((Int) -> Unit)? = null
) {
    val state by viewModel.uiState.collectAsState()
    LaunchedEffect(Unit) { onChromeVisibilityChange?.invoke(true); viewModel.refreshVersion() }
    BibleLibraryContent(state, viewModel::setSearchQuery, viewModel::setTestament,
        viewModel::setSection, onOpenBook, onCloseToToday, modifier, onReadBook)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun BibleLibraryContent(
    state: BibleBrowserUiState,
    onSearch: (String) -> Unit,
    onTestament: (String) -> Unit,
    onSection: (String) -> Unit,
    onOpenBook: (Int) -> Unit,
    onClose: (() -> Unit)?,
    modifier: Modifier = Modifier,
    onReadBook: ((Int) -> Unit)? = null
) {
    val grid = rememberLazyGridState()
    val focus = LocalFocusManager.current
    val filterKey = listOf(state.searchQuery, state.currentTestament, state.currentSection).joinToString("\u0000")
    var previousFilter by rememberSaveable { mutableStateOf(filterKey) }
    LaunchedEffect(filterKey) {
        if (previousFilter != filterKey) grid.scrollToItem(0)
        previousFilter = filterKey
    }
    Surface(modifier.fillMaxSize()) {
        BoxWithConstraints(Modifier.fillMaxSize().safeDrawingPadding().imePadding(), contentAlignment = Alignment.TopCenter) {
            val columns = if (maxWidth >= 600.dp && LocalDensity.current.fontScale < 1.3f) 2 else 1
            LazyVerticalGrid(columns = GridCells.Fixed(columns), state = grid,
                contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.widthIn(max = 1000.dp).fillMaxSize()) {
                item(key = "controls", span = { GridItemSpan(maxLineSpan) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            onClose?.let { IconButton(onClick = it) { Icon(Icons.Default.Close, "Close to Today") } }
                            Text("Bible", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.weight(1f))
                        }
                        OutlinedTextField(value = state.searchQuery, onValueChange = onSearch, singleLine = true,
                            label = { Text("Search all books") }, placeholder = { Text("Book, theme or keyword") },
                            leadingIcon = { Icon(Icons.Default.Search, null) },
                            trailingIcon = { if (state.searchQuery.isNotEmpty()) IconButton(onClick = { onSearch("") }) { Icon(Icons.Default.Close, "Clear search") } },
                            shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth())
                        if (state.searchQuery.isBlank()) {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("ALL" to "All books", "OT" to "Old Testament", "NT" to "New Testament").forEach { (key, label) ->
                                    FilterChip(selected = state.currentTestament == key, onClick = { focus.clearFocus(); onTestament(key) }, label = { Text(label) })
                                }
                            }
                            var expanded by remember { mutableStateOf(false) }
                            val sections = state.allBooks.filter { state.currentTestament == "ALL" || it.testament.equals(state.currentTestament, true) }
                                .map { it.section }.distinct()
                            Box {
                                FilledTonalButton(onClick = { expanded = true }) { Text("Section: ${state.currentSection}") }
                                DropdownMenu(expanded, onDismissRequest = { expanded = false }) {
                                    (listOf("All") + sections).forEach { section ->
                                        DropdownMenuItem(text = { Text(section) }, onClick = { expanded = false; onSection(section) })
                                    }
                                }
                            }
                        }
                    }
                }
                if (state.isLoading) item(span = { GridItemSpan(maxLineSpan) }) { CircularProgressIndicator(Modifier.wrapContentSize()) }
                if (!state.isLoading && state.filteredBooks.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("No books found", style = MaterialTheme.typography.titleLarge)
                        Text("Try another book name, theme or keyword.")
                        TextButton(onClick = { onSearch(""); onTestament("ALL") }) { Text("Reset filters") }
                    }
                }
                items(state.filteredBooks, key = { it.id }) { book ->
                    LibraryBookCard(book, state.activeVersion,
                        onOpen = { focus.clearFocus(); onOpenBook(book.id) },
                        onRead = onReadBook?.let { read -> { focus.clearFocus(); read(book.id) } })
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun LibraryBookCard(book: Book, version: String, onOpen: () -> Unit, onRead: (() -> Unit)? = null) {
    Card(shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), modifier = Modifier.fillMaxWidth()) {
        BookCoverImage(book.key, book.nameEn, Modifier.fillMaxWidth().aspectRatio(4f / 3f).clickable(onClick = onOpen))
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(BookNameUtils.getBookDisplayName(book, version), style = MaterialTheme.typography.headlineSmall.copy(fontFamily = FontFamily.Serif))
            Text("${book.chapters} chapters", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (onRead != null) Button(onClick = onRead) { Text("Read") }
                TextButton(onClick = onOpen) { Text("Open book guide") }
            }
        }
    }
}
