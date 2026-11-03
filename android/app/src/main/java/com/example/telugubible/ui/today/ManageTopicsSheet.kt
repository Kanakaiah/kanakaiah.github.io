package com.example.telugubible.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.Topic

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageTopicsSheet(
    topics: List<Topic>, onDismiss: () -> Unit, onCreateTopic: (String) -> Unit,
    onRenameTopic: (String, String) -> Unit, onDeleteTopic: (String) -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        modifier = Modifier.fillMaxHeight(0.9f)) {
        ManageCollectionsContent(topics, onDismiss, onCreateTopic, onRenameTopic, onDeleteTopic)
    }
}

@Composable
internal fun ManageCollectionsContent(
    topics: List<Topic>, onDismiss: () -> Unit, onCreate: (String) -> Unit,
    onRename: (String, String) -> Unit, onDelete: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var newName by rememberSaveable { mutableStateOf("") }
    var editingId by rememberSaveable { mutableStateOf<String?>(null) }
    var editingName by rememberSaveable { mutableStateOf("") }
    var deleteId by rememberSaveable { mutableStateOf<String?>(null) }
    val deleteTopic = topics.find { it.id == deleteId }
    val newDuplicate = newName.isNotBlank() && topics.any { it.name.equals(newName.trim(), ignoreCase = true) }
    val renameDuplicate = editingName.isNotBlank() && topics.any { it.id != editingId && it.name.equals(editingName.trim(), ignoreCase = true) }

    Column(modifier.fillMaxSize().imePadding().padding(horizontal = 20.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Manage collections", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close") }
        }
        OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("New collection name") },
            singleLine = true, isError = newDuplicate,
            supportingText = { if (newDuplicate) Text("A collection with this name already exists.") }, modifier = Modifier.fillMaxWidth())
        TextButton(onClick = { onCreate(newName.trim()); newName = "" }, enabled = newName.isNotBlank() && !newDuplicate,
            modifier = Modifier.align(Alignment.End)) { Text("Add collection") }
        if (topics.isEmpty()) {
            Text("No collections yet. Create one to organize your verses.", style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 20.dp))
        } else {
            LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(topics, key = { it.id }) { topic ->
                    if (editingId == topic.id) {
                        Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                            OutlinedTextField(value = editingName, onValueChange = { editingName = it },
                                label = { Text("Collection name") }, singleLine = true, isError = renameDuplicate,
                                supportingText = { if (renameDuplicate) Text("A collection with this name already exists.") },
                                modifier = Modifier.fillMaxWidth())
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                                TextButton(onClick = { editingId = null }) { Text("Cancel") }
                                TextButton(onClick = { onRename(topic.id, editingName.trim()); editingId = null },
                                    enabled = editingName.isNotBlank() && !renameDuplicate) { Text("Save") }
                            }
                        }
                    } else {
                        Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(topic.name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                            IconButton(onClick = { editingId = topic.id; editingName = topic.name }) {
                                Icon(Icons.Default.Edit, "Edit ${topic.name}")
                            }
                            IconButton(onClick = { deleteId = topic.id }) {
                                Icon(Icons.Default.Delete, "Delete ${topic.name}", tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                    HorizontalDivider()
                }
            }
        }
    }
    if (deleteTopic != null) AlertDialog(
        onDismissRequest = { deleteId = null },
        title = { Text("Delete \"${deleteTopic.name}\"?") },
        text = { Text("This also permanently deletes verses that belong only to this collection. Verses in other collections are kept.") },
        confirmButton = { Button(onClick = { onDelete(deleteTopic.id); deleteId = null },
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError)) { Text("Delete collection") } },
        dismissButton = { TextButton(onClick = { deleteId = null }) { Text("Cancel") } }
    )
}
