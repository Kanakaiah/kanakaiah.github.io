package com.example.telugubible.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.Book
import com.example.telugubible.util.BookMasteryCounts
import com.example.telugubible.util.BookNameUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ChapterThemeBookPickerSheet(
    books: List<Book>, masteryByBook: Map<Int, BookMasteryCounts>, dueChaptersByBook: Map<Int, Int>,
    activeVersion: String, onDismiss: () -> Unit, onSelectBook: (Int) -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        modifier = Modifier.fillMaxHeight(0.92f)) {
        ChapterThemeBookPickerContent(books, masteryByBook, dueChaptersByBook, activeVersion, onDismiss, onSelectBook)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun ChapterThemeBookPickerContent(
    books: List<Book>, masteryByBook: Map<Int, BookMasteryCounts>, dueChaptersByBook: Map<Int, Int>,
    activeVersion: String, onDismiss: () -> Unit, onSelectBook: (Int) -> Unit, modifier: Modifier = Modifier
) {
    var query by rememberSaveable { mutableStateOf("") }
    var testament by rememberSaveable { mutableStateOf("ALL") }
    val filtered = remember(books, query, testament) {
        val search = query.trim()
        books.filter { book ->
            if (search.isNotEmpty()) book.nameEn.contains(search, true) || book.nameTe.contains(search, true)
            else testament == "ALL" || book.testament.equals(testament, true)
        }
    }
    LazyColumn(modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(key = "controls") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Chapter Themes", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close") }
                }
                OutlinedTextField(value = query, onValueChange = { query = it }, singleLine = true,
                    label = { Text("Search all books") }, leadingIcon = { Icon(Icons.Default.Search, null) },
                    trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Default.Close, "Clear search") } },
                    shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth())
                if (query.isBlank()) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("ALL" to "All books", "OT" to "Old Testament", "NT" to "New Testament").forEach { (key, label) ->
                        FilterChip(selected = testament == key, onClick = { testament = key }, label = { Text(label) })
                    }
                } else Text("Searching the whole Bible", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (filtered.isEmpty()) item { Text("No books found. Try another name.", style = MaterialTheme.typography.bodyLarge) }
        items(filtered, key = { it.id }) { book ->
            val learned = masteryByBook[book.id]?.secure ?: 0
            val due = dueChaptersByBook[book.id] ?: 0
            Card(onClick = { onSelectBook(book.id) }, shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(BookNameUtils.getBookDisplayName(book, activeVersion), style = MaterialTheme.typography.headlineSmall.copy(fontFamily = FontFamily.Serif))
                        Text(if (due == 0) "No chapters due" else "$due due", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.align(Alignment.CenterVertically))
                    }
                    Text("$learned of ${book.chapters} chapters learned", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Practice chapters", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}
