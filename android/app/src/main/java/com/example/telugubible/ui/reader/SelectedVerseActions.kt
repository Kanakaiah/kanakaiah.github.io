package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.Topic

internal fun formatSelectedReference(book: String, chapter: Int, selected: List<Int>): String {
    val verses = selected.distinct().sorted()
    if (verses.isEmpty()) return ""
    val groups = mutableListOf<String>()
    var start = verses.first()
    var end = start
    for (verse in verses.drop(1)) {
        if (verse == end + 1) end = verse else {
            groups += if (start == end) "$start" else "$start–$end"
            start = verse
            end = verse
        }
    }
    groups += if (start == end) "$start" else "$start–$end"
    return "$book $chapter:${groups.joinToString(", ")}"
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun SelectedVerseActions(count: Int, onClear: () -> Unit, onCopy: () -> Unit, onReferences: () -> Unit, onMemorize: () -> Unit, modifier: Modifier = Modifier) {
    Surface(modifier = modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceContainerHigh, tonalElevation = 3.dp) {
        Column(Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onClear) { Icon(Icons.Default.Close, contentDescription = "Clear selection") }
                Text("$count selected", style = MaterialTheme.typography.titleSmall)
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onCopy) { Text("Copy") }
                TextButton(onClick = onReferences) { Text("References") }
                FilledTonalButton(onClick = onMemorize) { Text("Add to memory") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
internal fun MemorizeVersesSheet(
    book: String, chapter: Int, selected: List<Int>, topics: List<Topic>,
    onCreateTopic: (String, (Topic?) -> Unit) -> Unit,
    onAdd: (Boolean, List<String>, Boolean, String) -> Unit,
    onDismiss: () -> Unit
) {
    var topicIds by remember { mutableStateOf(setOf<String>()) }
    var addCollection by remember { mutableStateOf(false) }
    var collectionName by remember { mutableStateOf("") }
    var creatingCollection by remember { mutableStateOf(false) }
    var collectionError by remember { mutableStateOf(false) }
    var combine by remember { mutableStateOf(true) }
    var keyword by remember { mutableStateOf("") }
    var startNow by remember { mutableStateOf(true) }
    val canCombine = selected.sorted().zipWithNext().any { (a, b) -> b == a + 1 }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Add to memory", style = MaterialTheme.typography.headlineSmall)
            Text(formatSelectedReference(book, chapter, selected), style = MaterialTheme.typography.titleMedium)
            if (selected.size > 1 && canCombine) {
                Text("Save verses", style = MaterialTheme.typography.titleSmall)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = combine, onClick = { combine = true }, label = { Text("Combine consecutive verses") })
                    FilterChip(selected = !combine, onClick = { combine = false }, label = { Text("Save separately") })
                }
                if (selected.sorted().zipWithNext().any { (a, b) -> b != a + 1 }) {
                    Text("Gaps remain separate passages.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text("Collections (optional)", style = MaterialTheme.typography.titleSmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                topics.forEach { topic -> FilterChip(selected = topic.id in topicIds, onClick = { topicIds = if (topic.id in topicIds) topicIds - topic.id else topicIds + topic.id }, label = { Text(topic.name) }) }
                if (!addCollection) AssistChip(onClick = { addCollection = true }, label = { Text("New collection") })
            }
            if (addCollection) {
                OutlinedTextField(value = collectionName, onValueChange = { collectionName = it }, label = { Text("Collection name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { addCollection = false; collectionName = "" }) { Text("Cancel") }
                    TextButton(enabled = collectionName.isNotBlank() && !creatingCollection, onClick = {
                        creatingCollection = true
                        collectionError = false
                        onCreateTopic(collectionName.trim()) { topic ->
                            if (topic == null) collectionError = true else topicIds = topicIds + topic.id
                            creatingCollection = false
                        }
                        collectionName = ""; addCollection = false
                    }) { Text("Create collection") }
                }
            }
            if (collectionError) Text("Could not create the collection. Please try again.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            OutlinedTextField(value = keyword, onValueChange = { keyword = it }, label = { Text("Memory keyword (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Column(Modifier.selectableGroup()) {
                Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).selectable(selected = startNow, role = Role.RadioButton, onClick = { startNow = true }), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = startNow, onClick = null); Spacer(Modifier.width(8.dp)); Text("Start learning now")
                }
                Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).selectable(selected = !startNow, role = Role.RadioButton, onClick = { startNow = false }), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = !startNow, onClick = null); Spacer(Modifier.width(8.dp)); Text("First review tomorrow")
                }
            }
            Button(enabled = !creatingCollection && !addCollection, onClick = { onAdd(canCombine && combine, topicIds.toList(), startNow, keyword) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                Text(if (selected.size == 1) "Add verse" else "Add ${selected.size} verses")
            }
        }
    }
}
