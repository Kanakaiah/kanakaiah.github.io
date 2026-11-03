package com.example.telugubible.ui.practice

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.unit.dp
import com.example.telugubible.util.CueLevel
import com.example.telugubible.util.CueUtils

@Composable
fun TypingMode(text: String, onAttempt: (accuracy: Int, committed: String) -> Unit, modifier: Modifier = Modifier, scrollInternally: Boolean = true) {
    var input by rememberSaveable(text) { mutableStateOf("") }
    var isChecked by rememberSaveable(text) { mutableStateOf(false) }
    val focus = LocalFocusManager.current
    Column(modifier.fillMaxWidth().then(if (scrollInternally) Modifier.verticalScroll(rememberScrollState()) else Modifier), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!isChecked) {
            val cue = remember(text) { CueUtils.cueString(text, CueLevel.FIRST_LETTERS) }
            Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("First-letter cue", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(cue, style = MaterialTheme.typography.bodyMedium)
                }
            }
            OutlinedTextField(
                value = input, onValueChange = { input = it }, label = { Text("Your answer") },
                placeholder = { Text("Type the verse from memory") }, minLines = 4, maxLines = 8,
                modifier = Modifier.fillMaxWidth().heightIn(min = 130.dp)
            )
            Button(onClick = {
                val computed = CueUtils.scoreAttempt(text, input)
                isChecked = true
                focus.clearFocus()
                onAttempt(computed.accuracy, input)
            }, enabled = input.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Check") }
        } else {
            val score = remember(text, input) { CueUtils.scoreAttempt(text, input) }
            ReviewAnswer(text, input, score.accuracy, showWordDiff = true)
        }
    }
}
