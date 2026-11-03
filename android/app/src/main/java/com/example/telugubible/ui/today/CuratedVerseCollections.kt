package com.example.telugubible.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
internal fun CollectionsTabContent(onAddCollection: (String) -> Unit, onNavigateToGuides: () -> Unit) {
    LazyColumn(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Curated collections", style = MaterialTheme.typography.titleMedium)
            Text("Add a collection of passages to your library.", style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item { CuratedImportCard("Key verses", "206 passages from all 66 books", "Add All Key Verses (206 Verses)") { onAddCollection("key_verses_66") } }
        item { CuratedImportCard("Top 100 verses", "100 popular passages", "Add Top 100") { onAddCollection("top_100") } }
        item { CuratedImportCard("Well-known verses", "75 selected passages", "Add Well-Known") { onAddCollection("well_known") } }
        item { CuratedImportCard("More collections", "Explore thematic and book-specific collections", "View Collections in Guides", onNavigateToGuides) }
    }
}

@Composable
private fun CuratedImportCard(title: String, description: String, action: String, onClick: () -> Unit) {
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow,
        modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onClick, modifier = Modifier.heightIn(min = 48.dp)) { Text(action) }
        }
    }
}
