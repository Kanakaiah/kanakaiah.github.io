package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.StrongsEntry

@Composable
fun StrongsDialog(entry: StrongsEntry, onViewOccurrences: (String) -> Unit = {}, onRefClick: (String) -> Unit = {}, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("${entry.id} · ${if (entry.lang == "G") "Greek" else "Hebrew"}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                if (!entry.lemma.isNullOrBlank()) Text(entry.lemma, style = MaterialTheme.typography.headlineSmall, fontFamily = FontFamily.Serif)
                val phonetics = listOfNotNull(entry.xlit?.takeIf { it.isNotBlank() }, entry.pron?.takeIf { it.isNotBlank() }?.let { "/$it/" }).joinToString(" · ")
                if (phonetics.isNotBlank()) Text(phonetics, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                StrongsDefinitionContent(entry, onRefClick)
                OutlinedButton(onClick = { onViewOccurrences(entry.id) }, modifier = Modifier.fillMaxWidth()) { Text("View occurrences") }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}
