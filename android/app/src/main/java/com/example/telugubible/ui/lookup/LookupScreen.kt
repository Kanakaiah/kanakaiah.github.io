package com.example.telugubible.ui.lookup

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.ui.reader.StrongsDefinitionContent

@Composable
fun LookupScreen(viewModel: LookupViewModel, onNavigateToReader: (Int, Int) -> Unit, modifier: Modifier = Modifier) {
    val state by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    var message by remember { mutableStateOf<String?>(null) }
    LookupContent(
        state = state,
        onQueryChange = viewModel::setQuery,
        onModeChange = viewModel::setMode,
        onSearch = { viewModel.performSearch(); focusManager.clearFocus() },
        onRead = { onNavigateToReader(it.bookId, it.chapter) },
        onAdd = { result -> viewModel.addVerseToMemory(result.bookId, result.chapter, result.verse) {
            message = "Added ${result.bookNameEn} ${result.chapter}:${result.verse} to Today"
        } },
        message = message,
        onDismissMessage = { message = null },
        modifier = modifier
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun LookupContent(
    state: LookupUiState,
    onQueryChange: (String) -> Unit,
    onModeChange: (LookupMode) -> Unit,
    onSearch: () -> Unit,
    onRead: (VerseSearchResult) -> Unit,
    onAdd: (VerseSearchResult) -> Unit,
    message: String?,
    onDismissMessage: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Lookup", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 12.dp))
            OutlinedTextField(
                value = state.query, onValueChange = onQueryChange,
                label = { Text(if (state.mode == LookupMode.VERSES) "Search verses" else "Search Strong's") },
                placeholder = { Text(if (state.mode == LookupMode.VERSES) "Phrase or reference" else "Number or word") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = if (state.query.isNotEmpty()) {{ IconButton(onClick = { onQueryChange("") }) { Icon(Icons.Default.Close, contentDescription = "Clear search") } }} else null,
                singleLine = true, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSearch() }),
                modifier = Modifier.fillMaxWidth()
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = state.mode == LookupMode.VERSES, onClick = { onModeChange(LookupMode.VERSES) }, label = { Text("Bible verses") })
                FilterChip(selected = state.mode == LookupMode.STRONGS, onClick = { onModeChange(LookupMode.STRONGS) }, label = { Text("Strong's") })
                TextButton(onClick = onSearch, enabled = state.query.isNotBlank()) { Text("Search") }
            }
            when {
                state.isSearching -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.searchError != null -> Text(state.searchError, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 16.dp))
                !state.hasSearched -> Text(
                    if (state.mode == LookupMode.VERSES) "Search an English or Telugu phrase or a reference, such as Genesis 1:1." else "Search a Greek or Hebrew number or word, such as G3056 or logos.",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 16.dp)
                )
                state.mode == LookupMode.VERSES && state.verseResults.isEmpty() -> Text("No verses found for \"${state.query}\".", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 16.dp))
                state.mode == LookupMode.STRONGS && state.strongsResults.isEmpty() -> Text("No Strong's entries found for \"${state.query}\".", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 16.dp))
                state.mode == LookupMode.VERSES -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                    items(state.verseResults, key = { it.id }) { result -> VerseResultCard(result, { onRead(result) }, { onAdd(result) }) }
                }
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                    items(state.strongsResults, key = { it.id }) { StrongsResultCard(it) }
                }
            }
        }
        if (message != null) Snackbar(action = { TextButton(onClick = onDismissMessage) { Text("OK") } }, modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp)) { Text(message) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun VerseResultCard(result: VerseSearchResult, onRead: () -> Unit, onAddToMemory: () -> Unit) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("${result.bookNameEn} ${result.chapter}:${result.verse}", style = MaterialTheme.typography.titleMedium)
            if (!result.textTe.isNullOrBlank()) Text(result.textTe, style = MaterialTheme.typography.bodyLarge)
            if (!result.textEn.isNullOrBlank()) {
                val clean = remember(result.textEn) {
                    result.textEn.replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
                        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
                        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
                        .replace(Regex("<[^>]+>"), "").replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").trim()
                }
                Text(clean, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onRead) { Text("Read") }
                TextButton(onClick = onAddToMemory) { Text("Add to memory") }
            }
        }
    }
}

@Composable
private fun StrongsResultCard(entry: StrongsEntry) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("${entry.id} · ${if (entry.lang == "G") "Greek" else "Hebrew"}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            if (!entry.lemma.isNullOrBlank()) Text(entry.lemma, style = MaterialTheme.typography.titleLarge)
            if (!entry.xlit.isNullOrBlank() || !entry.pron.isNullOrBlank()) Text("${entry.xlit ?: ""} ${if (!entry.pron.isNullOrBlank()) "(${entry.pron})" else ""}".trim(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            StrongsDefinitionContent(entry)
        }
    }
}
