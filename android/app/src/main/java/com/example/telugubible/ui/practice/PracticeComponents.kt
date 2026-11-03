package com.example.telugubible.ui.practice

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.example.telugubible.util.CueUtils

@Composable
internal fun PracticeHeader(title: String, subtitle: String, index: Int, total: Int, onExit: () -> Unit, exitLabel: String = "Exit to Today", exitEnabled: Boolean = true) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onExit, enabled = exitEnabled) { Icon(Icons.Default.Close, exitLabel) }
            Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            if (total > 0) Text("${(index + 1).coerceAtMost(total)} of $total", style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(start = 12.dp))
        }
        if (total > 0) LinearProgressIndicator(progress = { index.toFloat() / total }, modifier = Modifier.fillMaxWidth())
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
internal fun PracticeModePicker(mode: PracticeMode, onSelect: (PracticeMode) -> Unit, enabled: Boolean = true) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        FilledTonalButton(onClick = { expanded = true }, enabled = enabled) { Text("Mode: ${mode.label}") }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            PracticeMode.MENU_MODES.forEach { option ->
                DropdownMenuItem(text = { Text(option.label) }, onClick = { expanded = false; onSelect(option) })
            }
        }
    }
}

@Composable
internal fun ReviewAnswer(text: String, submitted: String?, accuracy: Int?, modifier: Modifier = Modifier, showWordDiff: Boolean = false) {
    val score = remember(text, submitted, showWordDiff) {
        if (showWordDiff && !submitted.isNullOrBlank()) CueUtils.scoreAttempt(text, submitted) else null
    }
    val mismatchColor = MaterialTheme.colorScheme.error
    Column(modifier, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
            val answer = remember(score, text, mismatchColor) {
                if (score == null) androidx.compose.ui.text.AnnotatedString(text) else buildAnnotatedString {
                    score.words.forEachIndexed { index, word ->
                        if (index > 0) append(" ")
                        if (word.ok) append(word.word) else withStyle(SpanStyle(color = mismatchColor, textDecoration = TextDecoration.Underline)) { append(word.word) }
                    }
                }
            }
            Text(answer, style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif), modifier = Modifier.padding(24.dp))
        }
        if (score != null) Text("${score.matched} of ${score.total} words matched. Underlined words differ from your answer.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (!submitted.isNullOrBlank()) {
            Text("Your answer", style = MaterialTheme.typography.titleSmall)
            Text(submitted, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (accuracy != null) Text("$accuracy% accuracy", style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
internal fun ReviewGrades(ceiling: Int, onGrade: (Int) -> Unit, enabled: Boolean = true, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("How well did you remember?", style = MaterialTheme.typography.titleMedium)
        if (ceiling < 5) Text("Available grades reflect your hints, reading and attempt.",
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        listOf(listOf("Again" to 1, "Hard" to 3), listOf("Good" to 4, "Easy" to 5)).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (label, score) ->
                    FilledTonalButton(onClick = { onGrade(score) }, enabled = enabled && score <= ceiling,
                        modifier = Modifier.weight(1f).heightIn(min = 48.dp)) { Text(label) }
                }
            }
        }
    }
}
