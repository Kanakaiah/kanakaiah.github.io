package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.OriginalWord
import com.example.telugubible.data.model.StrongsEntry

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OriginalWordsSheet(
    verseRefLabel: String,
    isOldTestament: Boolean,
    words: List<OriginalWord>,
    isLoading: Boolean,
    onSelectStrongs: (StrongsEntry) -> Unit,
    onViewOccurrences: (String) -> Unit = {},
    onRefClick: (String) -> Unit = {},
    onDismiss: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(0.92f).navigationBarsPadding().padding(horizontal = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Original words", style = MaterialTheme.typography.headlineSmall)
                    Text("$verseRefLabel · ${if (isOldTestament) "Hebrew" else "Greek"}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Close original words") }
            }
            when {
                isLoading -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        CircularProgressIndicator()
                        Text("Loading original text and definitions…", style = MaterialTheme.typography.bodyMedium)
                    }
                }
                words.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text("Original word data is unavailable for this verse.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                else -> {
                    val fullVerse = words.joinToString(" ") { it.english }.trim()
                    val studyWords = words.filter { !it.strongsId.isNullOrBlank() || it.entry != null }
                    LazyColumn(Modifier.fillMaxWidth().weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp)) {
                        if (fullVerse.isNotBlank()) item {
                            Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth()) {
                                Text(fullVerse, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.padding(16.dp))
                            }
                        }
                        if (studyWords.isEmpty()) item { Text("No definitions are available for these words.", style = MaterialTheme.typography.bodyMedium) }
                        items(studyWords) { word -> OriginalWordCard(word, onSelectStrongs, onViewOccurrences, onRefClick) }
                        item { Text("Definitions from Strong's Exhaustive Concordance (1890)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun OriginalWordCard(word: OriginalWord, onSelectStrongs: (StrongsEntry) -> Unit, onViewOccurrences: (String) -> Unit, onRefClick: (String) -> Unit) {
    val entry = word.entry

    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!entry?.lemma.isNullOrBlank()) Text(entry!!.lemma!!, style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Serif)
            val phonetics = listOfNotNull(entry?.xlit?.takeIf { it.isNotBlank() }, entry?.pron?.takeIf { it.isNotBlank() }?.let { "/$it/" }).joinToString(" · ")
            if (phonetics.isNotEmpty()) Text(phonetics, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Translated as: ${word.english}", style = MaterialTheme.typography.titleSmall)
            val identifier = word.strongsId ?: entry?.id
            if (!identifier.isNullOrBlank()) Text(identifier, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            if (!entry?.pos.isNullOrBlank()) Text(entry!!.pos!!, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (entry != null) StrongsDefinitionContent(entry, onRefClick)
            else Text("Definition unavailable.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (entry != null) TextButton(onClick = { onSelectStrongs(entry) }) { Text("Open definition") }
                if (!identifier.isNullOrBlank()) TextButton(onClick = { onViewOccurrences(identifier) }) { Text("View occurrences") }
            }
        }
    }
}
