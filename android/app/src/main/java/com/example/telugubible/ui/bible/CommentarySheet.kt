package com.example.telugubible.ui.bible

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.commentary.CommentaryData
import com.example.telugubible.data.model.CommentaryEntry
import com.example.telugubible.data.model.CommentarySection

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommentarySheet(
    bookId: Int? = null,
    bookNameEn: String? = null,
    initialSeriesId: String? = null,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val allSeries = CommentaryData.ALL_SERIES
    val defaultSeries = when {
        initialSeriesId != null -> allSeries.firstOrNull { it.id == initialSeriesId } ?: allSeries.first()
        bookId != null -> CommentaryData.getSeriesForBook(bookId) ?: allSeries.first()
        else -> allSeries.first()
    }
    var currentSeries by remember(initialSeriesId, bookId) { mutableStateOf(defaultSeries) }
    var filterToBook by remember(bookId) { mutableStateOf(bookId != null && bookNameEn != null) }
    val canFilter = bookId != null && bookNameEn != null && currentSeries.bookIds.contains(bookId)
    val sections = if (filterToBook && canFilter) {
        CommentaryData.getSectionsForBook(bookId, bookNameEn)
    } else currentSeries.sections

    ModalBottomSheet(onDismissRequest = onDismiss, modifier = modifier) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Commentary", style = MaterialTheme.typography.headlineSmall)
                        Text(currentSeries.title, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close commentary")
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    allSeries.forEach { series ->
                        FilterChip(
                            selected = series.id == currentSeries.id,
                            onClick = { currentSeries = series; filterToBook = false },
                            label = { Text("${series.icon} ${series.title.substringBefore(" Commentary").substringBefore(" /")}") }
                        )
                    }
                }
            }
            item {
                Text(
                    if (filterToBook && canFilter) "Scholarly guides for $bookNameEn" else currentSeries.subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (canFilter) {
                item {
                    FilterChip(
                        selected = filterToBook,
                        onClick = { filterToBook = !filterToBook },
                        label = { Text("Only $bookNameEn") }
                    )
                }
            }
            if (sections.isEmpty()) {
                item {
                    Text("No commentary data available for this section.", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 24.dp))
                }
            } else {
                sections.forEach { section -> item { CommentarySectionView(section) } }
            }
        }
    }
}

@Composable
fun CommentarySectionView(section: CommentarySection, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(section.heading, style = MaterialTheme.typography.titleMedium)
        if (section.description.isNotBlank()) {
            Text(section.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        section.entries.forEach { CommentaryEntryCard(it) }
        if (section.note.isNotBlank()) {
            Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Strategy note", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSecondaryContainer)
                    Text(section.note, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSecondaryContainer)
                }
            }
        }
    }
}

@Composable
fun CommentaryEntryCard(entry: CommentaryEntry, modifier: Modifier = Modifier) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (entry.rank.isNotBlank()) {
                Text(entry.rank, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            }
            Text(entry.person, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            if (entry.reference.isNotBlank()) {
                Text(entry.reference, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("\"${entry.quote}\"", style = MaterialTheme.typography.bodyMedium, fontStyle = FontStyle.Italic, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (entry.note.isNotBlank()) {
                Text(entry.note, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
