package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.data.model.Verse
import com.example.telugubible.util.StrongsParser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StrongsOccurrencesSheet(
    strongsEntry: StrongsEntry,
    occurrences: List<StrongsOccurrence>,
    isLoading: Boolean,
    errorMessage: String?,
    onNavigateToVerse: (bookId: Int, chapter: Int, verse: Int) -> Unit,
    onLookupOfflineVerse: suspend (bookId: Int, chapter: Int, verse: Int) -> Verse?,
    onDismiss: () -> Unit,
    listState: LazyListState = rememberLazyListState()
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.92f).navigationBarsPadding().padding(horizontal = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Word occurrences", style = MaterialTheme.typography.headlineSmall)
                    Text(listOfNotNull(strongsEntry.lemma?.takeIf { it.isNotBlank() }, strongsEntry.id).joinToString(" · "), style = MaterialTheme.typography.titleMedium)
                    if (!isLoading && errorMessage == null) Text("${occurrences.size} ${if (occurrences.size == 1) "verse" else "verses"} · KJV", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close word occurrences") }
            }
            when {
                isLoading -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        CircularProgressIndicator()
                        Text("Searching the Bible…", style = MaterialTheme.typography.bodyMedium)
                    }
                }
                errorMessage != null -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text(errorMessage, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }
                occurrences.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text("No occurrences found for this word.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                else -> LazyColumn(Modifier.fillMaxWidth().weight(1f), state = listState, verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 12.dp, bottom = 28.dp)) {
                    items(occurrences) { occurrence -> OccurrenceCard(occurrence, onNavigateToVerse) }
                }
            }
        }
    }
}

@Composable
private fun OccurrenceCard(occurrence: StrongsOccurrence, onNavigateToVerse: (Int, Int, Int) -> Unit) {
    val highlightColor = MaterialTheme.colorScheme.primary
    val annotated = remember(occurrence.cleanText, occurrence.highlightRanges, highlightColor) {
        StrongsParser.buildOccurrenceAnnotatedString(occurrence.cleanText, occurrence.highlightRanges, highlightColor, highlightColor.copy(alpha = 0.16f))
    }
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("${occurrence.bookName} ${occurrence.chapter}:${occurrence.verse}", style = MaterialTheme.typography.titleMedium)
            Text(annotated, style = MaterialTheme.typography.bodyLarge, fontFamily = FontFamily.Serif)
            Text("KJV", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = { onNavigateToVerse(occurrence.bookId, occurrence.chapter, occurrence.verse) }) { Text("Read in context") }
        }
    }
}
