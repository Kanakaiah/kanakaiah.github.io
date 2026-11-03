package com.example.telugubible.ui.practice

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.telugubible.util.ListenSpeechPlayer

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ListenMode(
    verseText: String,
    isEnglish: Boolean,
    speed: Float,
    repeatCount: Int,
    hideText: Boolean,
    autoAdvance: Boolean,
    onSpeedChange: (Float) -> Unit,
    onRepeatChange: (Int) -> Unit,
    onHideTextToggle: (Boolean) -> Unit,
    onAutoAdvanceToggle: (Boolean) -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onComplete: () -> Unit,
    ttsManager: ListenSpeechPlayer,
    modifier: Modifier = Modifier,
    itemKey: Any = verseText,
    canGoPrevious: Boolean = true,
    canGoNext: Boolean = true
) {
    var playing by remember { mutableStateOf(false) }
    var iteration by remember { mutableIntStateOf(1) }
    var error by remember { mutableStateOf<String?>(null) }
    var optionsExpanded by remember { mutableStateOf(false) }
    val ttsState by ttsManager.state.collectAsState()
    val latestSpeed by rememberUpdatedState(speed)
    val latestRepeat by rememberUpdatedState(repeatCount)
    val latestAutoAdvance by rememberUpdatedState(autoAdvance)
    val latestCanNext by rememberUpdatedState(canGoNext)
    val latestNext by rememberUpdatedState(onNext)
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    LaunchedEffect(playing, iteration, itemKey, isEnglish) {
        if (!playing) return@LaunchedEffect
        val started = ttsManager.speak(
            verseText, langCode = if (isEnglish) "en" else "te", rate = latestSpeed,
            onFailure = { playing = false; error = "Speech could not be played. Check your device's text-to-speech voice." },
            onDone = {
                if (playing) {
                    if (iteration < latestRepeat) iteration++
                    else if (latestAutoAdvance && latestCanNext) { iteration = 1; latestNext() }
                    else { playing = false; iteration = 1 }
                }
            }
        )
        if (!started) {
            playing = false
            error = "Speech is unavailable. Check your device's text-to-speech voice and try again."
        }
    }
    DisposableEffect(lifecycle, ttsManager) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) { playing = false; iteration = 1; ttsManager.stop() }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); ttsManager.stop() }
    }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Listen", style = MaterialTheme.typography.titleMedium)
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow, modifier = Modifier.fillMaxWidth()) {
            Text(if (hideText) "Verse text hidden while you listen." else verseText,
                style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif), modifier = Modifier.padding(20.dp))
        }
        if (error != null) Text(error!!, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
        if (!ttsState.isReady && error == null) Text(if (ttsState.initializationFailed) "Text-to-speech is unavailable on this device." else "Preparing voice…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { playing = false; iteration = 1; ttsManager.stop(); onPrev() }, enabled = canGoPrevious) { Icon(Icons.Default.SkipPrevious, contentDescription = "Previous verse") }
            FilledIconButton(onClick = {
                if (playing) { playing = false; iteration = 1; ttsManager.stop() }
                else { error = null; iteration = 1; playing = true }
            }, enabled = ttsState.isReady, modifier = Modifier.size(56.dp)) {
                Icon(if (playing) Icons.Default.Stop else Icons.Default.PlayArrow, contentDescription = if (playing) "Stop playback" else "Play verse")
            }
            IconButton(onClick = { playing = false; iteration = 1; ttsManager.stop(); onNext() }, enabled = canGoNext) { Icon(Icons.Default.SkipNext, contentDescription = "Next verse") }
        }
        Text(if (playing) "Playing · repetition $iteration of $repeatCount" else "Stopped", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        TextButton(onClick = { optionsExpanded = !optionsExpanded }) { Text(if (optionsExpanded) "Hide listening options" else "Listening options") }
        if (optionsExpanded) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = { onSpeedChange(when (speed) { 0.75f -> 1f; 1f -> 1.25f; 1.25f -> 1.5f; else -> 0.75f }) }, label = { Text("Speed ${speed}×") })
                AssistChip(onClick = { onRepeatChange(when (repeatCount) { 1 -> 2; 2 -> 3; 3 -> 999; else -> 1 }) }, label = { Text("Repeat $repeatCount×") })
                FilterChip(selected = hideText, onClick = { onHideTextToggle(!hideText) }, label = { Text("Hide text") })
            }
            Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Advance to next verse after listening", modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                Switch(checked = autoAdvance, onCheckedChange = onAutoAdvanceToggle)
            }
            Text("Speed changes apply on the next playback. Advancing does not grade the verse.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
