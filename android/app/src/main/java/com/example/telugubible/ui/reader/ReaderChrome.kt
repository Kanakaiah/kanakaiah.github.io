package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun ReaderHeader(
    reference: String,
    version: String,
    isSpeaking: Boolean,
    onBack: () -> Unit,
    onNavigator: () -> Unit,
    onSettings: () -> Unit,
    onListen: () -> Unit,
    onImmerse: () -> Unit,
    onCommentary: () -> Unit,
    modifier: Modifier = Modifier,
    onHideControls: (() -> Unit)? = null
) {
    var showMenu by remember { mutableStateOf(false) }
    Surface(modifier, color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.statusBarsPadding().padding(horizontal = 8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Go back") }
                TextButton(onClick = onNavigator, modifier = Modifier.weight(1f), contentPadding = PaddingValues(4.dp)) {
                    FlowRow(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.Center,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(reference, style = MaterialTheme.typography.titleMedium)
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null)
                        Text(version, style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                IconButton(onClick = onSettings) { Icon(Icons.Default.TextFields, "Reading settings") }
                Box {
                    IconButton(onClick = { showMenu = true }) { Icon(Icons.Default.MoreVert, "Reader actions") }
                    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                        DropdownMenuItem(text = { Text(if (isSpeaking) "Stop listening" else "Listen") }, onClick = { showMenu = false; onListen() })
                        DropdownMenuItem(text = { Text("Immerse Reading") }, onClick = { showMenu = false; onImmerse() })
                        DropdownMenuItem(text = { Text("Commentary") }, onClick = { showMenu = false; onCommentary() })
                        if (onHideControls != null) DropdownMenuItem(text = { Text("Hide controls") }, onClick = { showMenu = false; onHideControls() })
                    }
                }
            }
        }
    }
}

@Composable
internal fun ReaderChapterNavigation(
    chapter: Int,
    previousEnabled: Boolean,
    nextEnabled: Boolean,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onNavigator: () -> Unit,
    progress: Float,
    modifier: Modifier = Modifier
) {
    Surface(modifier, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.navigationBarsPadding()) {
            LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onPrevious, enabled = previousEnabled) { Icon(Icons.Default.ChevronLeft, "Previous") }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onNext, enabled = nextEnabled) { Icon(Icons.Default.ChevronRight, "Next") }
            }
        }
    }
}
