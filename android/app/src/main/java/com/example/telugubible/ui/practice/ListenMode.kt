package com.example.telugubible.ui.practice

import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.Settings
import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.telugubible.util.ListenSpeechPlayer
import com.example.telugubible.util.BackgroundListenService

data class BackgroundListenQueue(
    val texts: List<String>,
    val languages: List<String>,
    val ids: LongArray,
    val index: Int,
    val onPositionChanged: (Int) -> Unit
)

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
    canGoNext: Boolean = true,
    backgroundQueue: BackgroundListenQueue? = null
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
    val context = LocalContext.current
    val backgroundState by BackgroundListenService.state.collectAsState()
    val active = if (backgroundQueue != null) backgroundState.playing && backgroundState.source == "practice" else playing
    val shownIteration = if (backgroundQueue != null && active) backgroundState.iteration else iteration

    LaunchedEffect(backgroundState.index, backgroundState.itemId, backgroundState.playing, backgroundQueue?.ids?.contentHashCode()) {
        val queue = backgroundQueue ?: return@LaunchedEffect
        val index = backgroundState.index
        if (backgroundState.source == "practice" && index in queue.ids.indices && queue.ids[index] == backgroundState.itemId && index != queue.index) {
            queue.onPositionChanged(index)
        }
        if (backgroundState.source == "practice" && !backgroundState.playing && index in queue.ids.indices && queue.ids[index] == backgroundState.itemId) {
            BackgroundListenService.forgetPosition()
        }
    }

    LaunchedEffect(playing, iteration, itemKey, isEnglish) {
        if (backgroundQueue != null || !playing) return@LaunchedEffect
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
            if (backgroundQueue == null && event == Lifecycle.Event.ON_STOP) { playing = false; iteration = 1; ttsManager.stop() }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); if (backgroundQueue == null) ttsManager.stop() }
    }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Listen", style = MaterialTheme.typography.titleMedium)
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow, modifier = Modifier.fillMaxWidth()) {
            Text(if (hideText) "Verse text hidden while you listen." else verseText,
                style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif), modifier = Modifier.padding(20.dp))
        }
        val visibleError = if (backgroundQueue != null && backgroundState.source == "practice") backgroundState.error ?: error else error
        if (visibleError != null) Text(visibleError, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
        if (!ttsState.isReady && error == null) Text(if (ttsState.initializationFailed) "Text-to-speech is unavailable on this device." else "Preparing voice…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { if (backgroundQueue != null) { BackgroundListenService.forgetPosition(); BackgroundListenService.stop(context) } else ttsManager.stop(); playing = false; iteration = 1; onPrev() }, enabled = canGoPrevious) { Icon(Icons.Default.SkipPrevious, contentDescription = "Previous verse") }
            FilledIconButton(onClick = {
                if (backgroundQueue != null) {
                    if (active) BackgroundListenService.stop(context)
                    else {
                        error = null
                        if (!BackgroundListenService.start(context, backgroundQueue.texts, backgroundQueue.languages, backgroundQueue.ids,
                                backgroundQueue.index, repeatCount, autoAdvance, speed)) {
                            error = "Couldn't start listening. Try a smaller collection."
                        }
                    }
                } else if (playing) { playing = false; iteration = 1; ttsManager.stop() }
                else { error = null; iteration = 1; playing = true }
            }, enabled = ttsState.isReady, modifier = Modifier.size(56.dp)) {
                Icon(if (active) Icons.Default.Stop else Icons.Default.PlayArrow, contentDescription = if (active) "Stop playback" else "Play verse")
            }
            IconButton(onClick = { if (backgroundQueue != null) { BackgroundListenService.forgetPosition(); BackgroundListenService.stop(context) } else ttsManager.stop(); playing = false; iteration = 1; onNext() }, enabled = canGoNext) { Icon(Icons.Default.SkipNext, contentDescription = "Next verse") }
        }
        Text(if (active) "Playing · repetition $shownIteration of $repeatCount" else "Stopped", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
            TextButton(onClick = {
                try {
                    context.startActivity(Intent("com.android.settings.TTS_SETTINGS"))
                } catch (_: ActivityNotFoundException) {
                    try {
                        context.startActivity(Intent(Settings.ACTION_SETTINGS))
                        Toast.makeText(context, "Open text-to-speech settings to choose a voice.", Toast.LENGTH_LONG).show()
                    } catch (_: ActivityNotFoundException) {
                        Toast.makeText(context, "Voice settings are unavailable on this device.", Toast.LENGTH_SHORT).show()
                    }
                }
            }) { Text("Choose a device voice") }
            Text("Choose or download a voice in your device's text-to-speech settings. Available voices depend on the language and speech engine.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
