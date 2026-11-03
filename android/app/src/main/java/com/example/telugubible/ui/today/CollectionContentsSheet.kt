package com.example.telugubible.ui.today

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.UserMemoryVerse

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
internal fun CollectionVersesSheet(
    collection: CollectionCardItem, verses: List<UserMemoryVerse>, displayLanguage: DisplayLanguage,
    canDeleteCollection: Boolean, onDismiss: () -> Unit, onReviewCollection: () -> Unit,
    onAddVersesToCollection: () -> Unit, onDeleteCollection: () -> Unit,
    onSelectVerse: (UserMemoryVerse) -> Unit, onRemoveVerse: (Long) -> Unit
) {
    val english = displayLanguage == DisplayLanguage.ENGLISH
    var confirmingCollectionDeletion by remember { mutableStateOf(false) }
    var verseToDelete by remember { mutableStateOf<UserMemoryVerse?>(null) }
    val listState = rememberLazyListState()
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        modifier = Modifier.fillMaxHeight(0.88f)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(collection.name, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                if (canDeleteCollection) IconButton(onClick = { confirmingCollectionDeletion = true }) {
                    Icon(Icons.Default.DeleteOutline, "Delete collection", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close") }
            }
            Text("${verses.size} ${if (verses.size == 1) "verse" else "verses"} · ${collection.dueCount} due",
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onReviewCollection, modifier = Modifier.heightIn(min = 48.dp)) { Text("Practice") }
                FilledTonalButton(onClick = onAddVersesToCollection, modifier = Modifier.heightIn(min = 48.dp)) { Text("Add verses") }
            }
            HorizontalDivider()
            if (verses.isEmpty()) {
                Text("No verses in this collection yet.", style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 24.dp))
            } else {
                LazyColumn(state = listState, modifier = Modifier.weight(1f), contentPadding = PaddingValues(vertical = 12.dp)) {
                    items(verses, key = { it.id }) { verse ->
                        val rawText = (if (english) verse.textEn else verse.textTe)
                            ?: (if (english) verse.textTe else verse.textEn) ?: ""
                        val cleanText = remember(rawText) { rawText.replace(Regex("<[^>]+>"), "").replace("&nbsp;", " ").trim() }
                        ListItem(
                            headlineContent = { Text(verse.fullRef(english), style = MaterialTheme.typography.titleMedium) },
                            supportingContent = { if (cleanText.isNotEmpty()) Text(cleanText, maxLines = 2, overflow = TextOverflow.Ellipsis) },
                            trailingContent = { IconButton(onClick = { verseToDelete = verse }) {
                                Icon(Icons.Default.DeleteOutline, "Remove verse", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            } },
                            modifier = Modifier.fillMaxWidth().clickable(onClickLabel = "Open ${verse.fullRef(english)}") { onSelectVerse(verse) }
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }
    if (confirmingCollectionDeletion) AlertDialog(onDismissRequest = { confirmingCollectionDeletion = false },
        title = { Text("Delete \"${collection.name}\"?") },
        text = { Text("This also permanently deletes verses that belong only to this collection. Verses in other collections are kept.") },
        confirmButton = { TextButton(onClick = { confirmingCollectionDeletion = false; onDeleteCollection() }) {
            Text("Delete collection", color = MaterialTheme.colorScheme.error)
        } },
        dismissButton = { TextButton(onClick = { confirmingCollectionDeletion = false }) { Text("Cancel") } })
    verseToDelete?.let { verse ->
        AlertDialog(onDismissRequest = { verseToDelete = null }, title = { Text("Delete ${verse.fullRef(english)}?") },
            text = { Text("This deletes the saved verse from your library and all its collections.") },
            confirmButton = { TextButton(onClick = { verseToDelete = null; onRemoveVerse(verse.id) }) {
                Text("Delete verse", color = MaterialTheme.colorScheme.error)
            } },
            dismissButton = { TextButton(onClick = { verseToDelete = null }) { Text("Cancel") } })
    }
}
