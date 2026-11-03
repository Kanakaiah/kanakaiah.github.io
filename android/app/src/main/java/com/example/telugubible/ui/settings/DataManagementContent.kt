package com.example.telugubible.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
internal fun DataManagementContent(onExportFile: () -> Unit, onImportFile: () -> Unit,
                                   onExportText: () -> Unit, onImportText: () -> Unit, onClear: () -> Unit) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Your data", style = MaterialTheme.typography.headlineSmall)
        Text("Back up or restore your saved verses, collections, progress, history and settings.",
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Downloaded Bible cache and in-progress sessions are not included.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Button(onClick = onExportFile, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Export backup file") }
        FilledTonalButton(onClick = onImportFile, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Restore from file") }
        Text("A restore is reviewed before it changes your data.", style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        HorizontalDivider()
        Text("Advanced", style = MaterialTheme.typography.titleMedium)
        TextButton(onClick = onExportText, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Copy or share backup JSON") }
        TextButton(onClick = onImportText, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Restore from pasted JSON") }
        HorizontalDivider()
        Text("Clear saved data", style = MaterialTheme.typography.titleMedium)
        Text("Remove saved verses, progress, collections, history and preferences from this device.",
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedButton(onClick = onClear, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Clear saved data") }
    }
}
