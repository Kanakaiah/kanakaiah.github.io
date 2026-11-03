package com.example.telugubible.ui.today

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.min
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun VerseDetailSheet(
    verse: UserMemoryVerse, displayLanguage: DisplayLanguage, hasPrev: Boolean, hasNext: Boolean,
    onPrev: () -> Unit, onNext: () -> Unit, onToggleLanguage: () -> Unit, onDismiss: () -> Unit,
    onPractice: () -> Unit, onImmerse: () -> Unit = {}, onReadInChapter: () -> Unit, onDelete: () -> Unit,
    topics: List<Topic> = emptyList(), onToggleTopic: (String) -> Unit = {},
    onCreateTopicForVerse: (String) -> Unit = {}
) {
    var confirmingDelete by rememberSaveable { mutableStateOf(false) }
    var showNewCollection by rememberSaveable { mutableStateOf(false) }
    var newCollectionName by rememberSaveable { mutableStateOf("") }
    var showReviewDetails by rememberSaveable { mutableStateOf(false) }
    val isEnglish = displayLanguage == DisplayLanguage.ENGLISH
    val rawText = if (isEnglish) verse.textEn?.takeIf { it.isNotBlank() } ?: "English text unavailable"
        else verse.textTe?.takeIf { it.isNotBlank() } ?: "తెలుగు వచన పాఠం అందుబాటులో లేదు"
    val displayText = remember(rawText) {
        rawText.replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<[^>]+>"), "")
            .replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"")
            .replace("&#39;", "'").trim()
    }
    val now = System.currentTimeMillis()
    val days = ((verse.nextDueDate - now) / (1000 * 60 * 60 * 24)).toInt()
    val review = when {
        verse.nextDueDate <= now -> "Due today"
        days == 1 -> "Tomorrow"
        days < 7 -> "In $days days"
        else -> SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(Date(verse.nextDueDate))
    }
    val mastery = min(100, ((verse.repetition.toFloat() / 6f) * 100f).roundToInt())

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        modifier = Modifier.fillMaxHeight(0.92f)) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).imePadding().navigationBarsPadding()
            .padding(start = 20.dp, end = 20.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(verse.fullRef(isEnglish), style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close") }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onPrev, enabled = hasPrev) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Previous verse") }
                IconButton(onClick = onNext, enabled = hasNext) { Icon(Icons.AutoMirrored.Filled.ArrowForward, "Next verse") }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onToggleLanguage) { Icon(Icons.Default.Translate, "Change display language") }
            }
            Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow,
                modifier = Modifier.fillMaxWidth()) {
                Text(displayText, style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif),
                    modifier = Modifier.padding(20.dp))
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Button(onClick = { onDismiss(); onPractice() }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Practice") }
                FilledTonalButton(onClick = { onDismiss(); onReadInChapter() }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Read chapter") }
            }
            HorizontalDivider()
            Text("Collections", style = MaterialTheme.typography.titleMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                topics.forEach { topic ->
                    FilterChip(selected = topic.id in verse.topicIds, onClick = { onToggleTopic(topic.id) },
                        label = { Text(topic.name) }, modifier = Modifier.heightIn(min = 48.dp))
                }
                if (!showNewCollection) SuggestionChip(onClick = { showNewCollection = true },
                    label = { Text("New collection") }, modifier = Modifier.heightIn(min = 48.dp))
            }
            if (showNewCollection) {
                OutlinedTextField(value = newCollectionName, onValueChange = { newCollectionName = it },
                    label = { Text("Collection name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { showNewCollection = false; newCollectionName = "" }) { Text("Cancel") }
                    TextButton(onClick = {
                        onCreateTopicForVerse(newCollectionName.trim()); newCollectionName = ""; showNewCollection = false
                    }, enabled = newCollectionName.isNotBlank()) { Text("Add collection") }
                }
            }
            HorizontalDivider()
            TextButton(onClick = { showReviewDetails = !showReviewDetails }) {
                Text(if (showReviewDetails) "Hide review details" else "Review details")
            }
            if (showReviewDetails) {
                Text("Mastery: $mastery%", style = MaterialTheme.typography.bodyLarge)
                Text("Reviews: ${verse.repetition} · Interval: ${verse.interval} days", style = MaterialTheme.typography.bodyLarge)
                Text("Next review: $review", style = MaterialTheme.typography.bodyLarge)
            }
            TextButton(onClick = { confirmingDelete = true }) {
                Icon(Icons.Default.DeleteOutline, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                Spacer(Modifier.width(8.dp))
                Text("Delete verse", color = MaterialTheme.colorScheme.error)
            }
        }
    }
    if (confirmingDelete) AlertDialog(onDismissRequest = { confirmingDelete = false },
        title = { Text("Delete ${verse.fullRef(isEnglish)}?") },
        text = { Text("This deletes the saved verse from your library and all its collections.") },
        confirmButton = { TextButton(onClick = { confirmingDelete = false; onDelete(); onDismiss() }) {
            Text("Delete verse", color = MaterialTheme.colorScheme.error)
        } },
        dismissButton = { TextButton(onClick = { confirmingDelete = false }) { Text("Cancel") } })
}
