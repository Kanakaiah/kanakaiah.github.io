package com.example.telugubible.ui.reader

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.BibleTranslation
import com.example.telugubible.data.model.Book
import com.example.telugubible.util.BookNameUtils
import kotlinx.coroutines.CancellationException

private enum class PassageStage(val label: String) { BOOK("Book"), CHAPTER("Chapter"), VERSE("Verse"), TRANSLATION("Translation") }

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
internal fun PassageNavigator(
    books: List<Book>, currentBook: Book?, currentChapter: Int, activeVersion: String,
    onVersionChange: (String) -> Unit, onSelect: (Book, Int) -> Unit,
    onDismiss: () -> Unit, currentVerseNumbers: List<Int>,
    loadVerseNumbers: suspend (Book, Int, String) -> List<Int>,
    onSelectVerse: (Book, Int, Int) -> Unit
) {
    var stage by rememberSaveable { mutableStateOf(PassageStage.BOOK) }
    var chosenBookId by rememberSaveable { mutableIntStateOf(currentBook?.id ?: 0) }
    var chosenChapter by rememberSaveable { mutableIntStateOf(currentChapter) }
    var query by rememberSaveable { mutableStateOf("") }
    val chosenBook = books.firstOrNull { it.id == chosenBookId }
    val sameChapter = chosenBook?.id == currentBook?.id && chosenChapter == currentChapter
    val numbers by key(chosenBookId, chosenChapter, activeVersion) {
        produceState<List<Int>?>(initialValue = if (sameChapter) currentVerseNumbers else null, currentVerseNumbers) {
            if (sameChapter) value = currentVerseNumbers
            else if (chosenBook != null) value = try {
                loadVerseNumbers(chosenBook, chosenChapter, activeVersion)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                emptyList()
            }
        }
    }
    val filteredBooks = remember(books, query, activeVersion) {
        val search = query.trim()
        books.filter {
            search.isBlank() || it.nameEn.contains(search, true) || it.nameTe.contains(search, true) ||
                (it.nameTa?.contains(search, true) == true) ||
                BookNameUtils.getBookDisplayName(it, activeVersion).contains(search, true)
        }
    }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        modifier = Modifier.fillMaxHeight(0.94f)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Choose passage", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close navigator") }
            }
            val reference = chosenBook?.let { "${BookNameUtils.getBookDisplayName(it, activeVersion)} $chosenChapter" } ?: "Choose a book"
            Text("$reference · ${BibleTranslation.getLabel(activeVersion)}", style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 12.dp)) {
                PassageStage.entries.forEach { option ->
                    FilterChip(selected = stage == option, onClick = { stage = option }, label = { Text(option.label) },
                        enabled = option != PassageStage.CHAPTER || chosenBook != null)
                }
            }
            when (stage) {
                PassageStage.BOOK -> {
                    OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(),
                        singleLine = true, label = { Text("Find a book") }, leadingIcon = { Icon(Icons.Default.Search, null) })
                    if (filteredBooks.isEmpty()) Text("No matching books", modifier = Modifier.padding(vertical = 20.dp))
                    LazyColumn(contentPadding = PaddingValues(vertical = 12.dp), modifier = Modifier.weight(1f)) {
                        items(filteredBooks, key = { it.id }) { book ->
                            ListItem(headlineContent = { Text(BookNameUtils.getBookDisplayName(book, activeVersion)) },
                                supportingContent = { Text("${book.chapters} chapters") },
                                trailingContent = { if (book.id == currentBook?.id) Icon(Icons.Default.Check, "Current book") },
                                modifier = Modifier.fillMaxWidth().clickable {
                                    chosenBookId = book.id
                                    chosenChapter = if (book.id == currentBook?.id) currentChapter else 1
                                    stage = PassageStage.CHAPTER
                                }
                                    .semantics { contentDescription = "Choose ${book.nameEn}" })
                            HorizontalDivider()
                        }
                    }
                }
                PassageStage.CHAPTER -> {
                    if (chosenBook != null) {
                        Text(BookNameUtils.getBookDisplayName(chosenBook, activeVersion), style = MaterialTheme.typography.titleMedium)
                        LazyVerticalGrid(columns = GridCells.Adaptive(64.dp), modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items((1..chosenBook.chapters).toList()) { chapter ->
                                val selected = chosenBook.id == currentBook?.id && chapter == currentChapter
                                if (selected) FilledTonalButton(onClick = { chosenChapter = chapter; stage = PassageStage.VERSE },
                                    contentPadding = PaddingValues(4.dp), modifier = Modifier.heightIn(min = 48.dp)) { Text("$chapter") }
                                else OutlinedButton(onClick = { chosenChapter = chapter; stage = PassageStage.VERSE },
                                    contentPadding = PaddingValues(4.dp), modifier = Modifier.heightIn(min = 48.dp)) { Text("$chapter") }
                            }
                        }
                    }
                }
                PassageStage.VERSE -> {
                    val availableNumbers = numbers
                    Text("Verses in $reference", style = MaterialTheme.typography.titleMedium)
                    if (availableNumbers == null) CircularProgressIndicator(Modifier.padding(20.dp))
                    else if (availableNumbers.isEmpty()) Text("Verses are not available for this chapter.", modifier = Modifier.padding(vertical = 20.dp))
                    else LazyVerticalGrid(columns = GridCells.Adaptive(64.dp), modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(availableNumbers) { verse ->
                            OutlinedButton(onClick = { chosenBook?.let { onSelectVerse(it, chosenChapter, verse) }; onDismiss() }, contentPadding = PaddingValues(4.dp),
                                modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Verse $verse" }) { Text("$verse") }
                        }
                    }
                    if (chosenBook != null) TextButton(onClick = { onSelect(chosenBook, chosenChapter); onDismiss() }) { Text("Open chapter") }
                }
                PassageStage.TRANSLATION -> LazyColumn(modifier = Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp)) {
                    items(BibleTranslation.ALL, key = { it.code }) { translation ->
                        val selected = translation.code.equals(activeVersion, ignoreCase = true)
                        ListItem(headlineContent = { Text(translation.fullLabel) },
                            supportingContent = { if (translation.isOfflineBundled) Text("Available offline") },
                            trailingContent = { if (selected) Icon(Icons.Default.Check, "Current translation") },
                            modifier = Modifier.fillMaxWidth().clickable { onVersionChange(translation.code) })
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
