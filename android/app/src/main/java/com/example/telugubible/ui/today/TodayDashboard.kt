package com.example.telugubible.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.Book
import com.example.telugubible.util.BookNameUtils

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun TodayHeader(
    streak: Int,
    onRetention: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier) {
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(Modifier.heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Today", style = MaterialTheme.typography.headlineSmall)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onRetention) { Text("$streak-day streak") }
                IconButton(onClick = onSettings) { Icon(Icons.Default.Settings, "Settings") }
            }
        }
    }
}

@Composable
internal fun ReviewHeroCard(
    dueCount: Int,
    totalVersesCount: Int,
    collections: List<CollectionCardItem>,
    selectedCollectionId: String?,
    reviewOrder: ReviewOrder,
    onSelectCollection: (String?) -> Unit,
    onSelectOrder: (ReviewOrder) -> Unit,
    onStartSession: (String?) -> Unit,
    onAddVerses: () -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedCollection = collections.find { it.id == selectedCollectionId }
    val displayDue = selectedCollection?.dueCount ?: dueCount
    var showOptions by rememberSaveable { mutableStateOf(false) }
    var showCollections by remember { mutableStateOf(false) }
    var showOrder by remember { mutableStateOf(false) }
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Daily practice", style = MaterialTheme.typography.titleMedium)
            Text(
                when {
                    totalVersesCount == 0 -> "A small beginning"
                    displayDue == 0 -> "All caught up"
                    else -> "$displayDue ${if (displayDue == 1) "verse" else "verses"} ready"
                },
                style = MaterialTheme.typography.headlineSmall
            )
            Text(
                when {
                    totalVersesCount == 0 -> "Add a verse to begin your daily practice."
                    displayDue == 0 -> "No verses due in ${selectedCollection?.name ?: "your library"}. Practice whenever you like."
                    else -> "${selectedCollection?.name ?: "Your verse library"} · ${reviewOrder.subtitleHint}"
                },
                style = MaterialTheme.typography.bodyLarge
            )
            Button(
                onClick = { if (totalVersesCount == 0) onAddVerses() else onStartSession(selectedCollectionId) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
            ) { Text(if (totalVersesCount == 0) "Add verses" else if (displayDue == 0) "Practice verses" else "Start practice") }
            if (totalVersesCount > 0) {
                TextButton(
                    onClick = { showOptions = !showOptions },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onPrimaryContainer)
                ) { Text(if (showOptions) "Hide review options" else "Review options") }
                if (showOptions) {
                    // Stack the filters so long collection names and scaled text can wrap.
                    Box {
                        FilledTonalButton(onClick = { showCollections = true }) {
                            Text("Collection: ${selectedCollection?.name ?: "All"}")
                        }
                        DropdownMenu(expanded = showCollections, onDismissRequest = { showCollections = false }) {
                            DropdownMenuItem(text = { Text("All") }, onClick = { onSelectCollection(null); showCollections = false })
                            collections.forEach { collection ->
                                DropdownMenuItem(text = { Text(collection.name) }, onClick = {
                                    onSelectCollection(collection.id)
                                    showCollections = false
                                })
                            }
                        }
                    }
                    Box {
                        FilledTonalButton(onClick = { showOrder = true }) { Text("Order: ${reviewOrder.label}") }
                        DropdownMenu(expanded = showOrder, onDismissRequest = { showOrder = false }) {
                            ReviewOrder.entries.forEach { order ->
                                DropdownMenuItem(text = { Text(order.label) }, onClick = { onSelectOrder(order); showOrder = false })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun ReadingCard(
    book: Book,
    chapter: Int,
    version: String,
    hasOpenedReader: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(if (hasOpenedReader) "Continue reading" else "Read Scripture", style = MaterialTheme.typography.titleLarge)
        Surface(onClick = onClick, shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Icon(Icons.AutoMirrored.Filled.MenuBook, null, tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("${BookNameUtils.getBookDisplayName(book, version)} $chapter", style = MaterialTheme.typography.titleMedium)
                    Text(version, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
            }
        }
    }
}
