package com.example.telugubible.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.PresetCollection

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun NewCollectionDialog(
    presetCollections: List<PresetCollection>, existingNames: List<String>, onDismiss: () -> Unit,
    onCreateCustom: (String) -> Unit, onAddPreset: (String) -> Unit
) {
    var collectionName by rememberSaveable { mutableStateOf("") }
    var showSuggestions by rememberSaveable { mutableStateOf(false) }
    val suggestions = listOf("66 Key Verses", "Top 100", "Well-Known", "Anxiety", "Peace", "Courage", "Faith & Trust", "Salvation")
    val name = collectionName.trim()
    val duplicate = name.isNotEmpty() && existingNames.any { it.equals(name, ignoreCase = true) }
    fun findPreset(value: String): String? = presetCollections.firstOrNull {
        it.title.equals(value, ignoreCase = true) || (value.equals("Top 100", ignoreCase = true) && it.id == "top_100")
    }?.id ?: if (value.equals("Top 100", ignoreCase = true)) "top_100" else null

    AlertDialog(onDismissRequest = onDismiss,
        title = { Text("New collection") },
        text = {
            Column(Modifier.heightIn(max = 400.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = collectionName, onValueChange = { collectionName = it },
                    label = { Text("Collection name") }, placeholder = { Text("e.g. Hope") },
                    singleLine = true, isError = duplicate,
                    supportingText = { if (duplicate) Text("A collection with this name already exists.") },
                    modifier = Modifier.fillMaxWidth())
                TextButton(onClick = { showSuggestions = !showSuggestions }) {
                    Text(if (showSuggestions) "Hide suggested collections" else "Use a suggested collection")
                }
                if (showSuggestions) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    suggestions.forEach { suggestion ->
                        SuggestionChip(onClick = {
                            val preset = findPreset(suggestion)
                            if (preset != null) { onAddPreset(preset); onDismiss() } else collectionName = suggestion
                        }, label = { Text(suggestion) }, modifier = Modifier.heightIn(min = 48.dp))
                    }
                }
            }
        },
        confirmButton = { Button(enabled = name.isNotEmpty() && !duplicate, onClick = {
            val preset = findPreset(name)
            if (preset != null) onAddPreset(preset) else onCreateCustom(name)
            onDismiss()
        }) { Text("Create collection") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}
