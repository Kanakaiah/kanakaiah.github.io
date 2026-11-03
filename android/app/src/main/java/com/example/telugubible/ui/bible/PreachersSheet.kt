package com.example.telugubible.ui.bible

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.commentary.PreachersData
import com.example.telugubible.data.model.PreacherEntry

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreachersSheet(onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    var selectedEraIndex by remember { mutableIntStateOf(0) }
    val eras = PreachersData.ERAS
    val currentEra = eras.getOrNull(selectedEraIndex) ?: eras.first()
    val context = LocalContext.current

    ModalBottomSheet(onDismissRequest = onDismiss, modifier = modifier) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Preachers & theologians", style = MaterialTheme.typography.headlineSmall)
                        Text("Major figures across church history", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close preachers")
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    eras.forEachIndexed { index, era ->
                        FilterChip(selected = selectedEraIndex == index, onClick = { selectedEraIndex = index }, label = { Text(era.heading) })
                    }
                }
            }
            item {
                Text(currentEra.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            items(currentEra.entries) { entry ->
                PreacherCard(entry, onOpenUrl = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) })
            }
        }
    }
}

@Composable
fun PreacherCard(entry: PreacherEntry, onOpenUrl: (String) -> Unit, modifier: Modifier = Modifier) {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(entry.person, style = MaterialTheme.typography.titleMedium)
            Text(entry.rank, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            Text(entry.reference, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(entry.quote, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            entry.resources.forEach { resource ->
                TextButton(
                    onClick = { onOpenUrl(resource.url) },
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp)
                ) {
                    Text(resource.title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelLarge)
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}
