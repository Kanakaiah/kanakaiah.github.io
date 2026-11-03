package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.StrongsEntry

@Composable
internal fun StrongsDefinitionContent(entry: StrongsEntry, onRefClick: ((String) -> Unit)? = null) {
    var advanced by remember(entry.id) { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (!entry.strongsDef.isNullOrBlank()) {
            DefinitionText(entry.strongsDef.trim(), onRefClick)
        } else {
            Text("Definition unavailable.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (!entry.derivation.isNullOrBlank() || !entry.kjvDef.isNullOrBlank()) {
            TextButton(onClick = { advanced = !advanced }) { Text(if (advanced) "Hide word details" else "More word details") }
            if (advanced) {
                if (!entry.derivation.isNullOrBlank()) {
                    Text("Derivation", style = MaterialTheme.typography.titleSmall)
                    DefinitionText(entry.derivation.trim(), onRefClick)
                }
                if (!entry.kjvDef.isNullOrBlank()) {
                    Text("KJV translations", style = MaterialTheme.typography.titleSmall)
                    Text(entry.kjvDef.trim(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun DefinitionText(value: String, onRefClick: ((String) -> Unit)?) {
    if (onRefClick == null) Text(value, style = MaterialTheme.typography.bodyMedium)
    else StrongsRefText(text = value, onRefClick = onRefClick, fontSize = 16.sp, lineHeight = 24.sp, color = MaterialTheme.colorScheme.onSurface)
}
