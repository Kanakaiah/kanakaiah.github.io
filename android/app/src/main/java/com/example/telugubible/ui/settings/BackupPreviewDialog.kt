package com.example.telugubible.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.telugubible.data.model.BackupPreview

@Composable
internal fun BackupPreviewDialog(preview: BackupPreview, saving: Boolean, error: String?, onCancel: () -> Unit, onRestore: () -> Unit) {
    Dialog(onDismissRequest = { if (!saving) onCancel() }) {
        Surface(shape = MaterialTheme.shapes.extraLarge, color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth().widthIn(max = 560.dp).heightIn(max = 650.dp)) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Review backup", style = MaterialTheme.typography.headlineSmall)
                Text("${preview.verses} saved verses · ${preview.collections} collections", style = MaterialTheme.typography.titleMedium)
                Text("${preview.chapterProgress} chapter progress entries · ${preview.bookThemes} book themes · ${preview.chapterChains} chapter chains",
                    style = MaterialTheme.typography.bodyMedium)
                Text("${preview.reviews} reviews · ${preview.coldChecks} cold checks · ${preview.sessions} session records",
                    style = MaterialTheme.typography.bodyMedium)
                Text(if (preview.hasSettings) "Settings and other saved statistics are included." else "This backup does not include settings or saved statistics.",
                    style = MaterialTheme.typography.bodyMedium)
                HorizontalDivider()
                Text("Matching verses, progress and saved settings can be replaced. Other local items stay. Collections with the same name are merged; duplicate history entries are skipped.",
                    style = MaterialTheme.typography.bodyMedium)
                if (preview.isLegacy) Text("This older backup may not contain verse ranges, book themes, chain details or session records. Missing information cannot be recovered from it.",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("History for passages no longer in the backup may be imported without a linked verse.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Downloaded Bible cache and in-progress sessions are not included.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                error?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
                if (saving) Text("Restoring backup…", style = MaterialTheme.typography.bodyMedium)
                Button(onClick = onRestore, enabled = !saving && error == null,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Restore backup") }
                TextButton(onClick = onCancel, enabled = !saving, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Cancel") }
            }
        }
    }
}
