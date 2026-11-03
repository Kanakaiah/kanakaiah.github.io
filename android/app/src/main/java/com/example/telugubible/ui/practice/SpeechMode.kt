package com.example.telugubible.ui.practice

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.telugubible.util.CueLevel
import com.example.telugubible.util.CueUtils
import com.example.telugubible.util.SpeechAccuracyEvaluator
import com.example.telugubible.util.SpeechRecognizerHelper
import com.example.telugubible.util.SpeechRecognizerState

private fun Context.findActivity(): Activity? {
    var current: Context = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        val next = current.baseContext
        if (next === current) break
        current = next
    }
    return current as? Activity
}

@Composable
fun SpeechMode(text: String, languageCode: String = "en-US", onAttempt: (accuracy: Int, committed: String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val activity = remember(context) { context.findActivity() }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val latestAttempt by rememberUpdatedState(onAttempt)
    var requested by rememberSaveable { mutableStateOf(false) }
    var hasPermission by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) }
    var needsSettings by remember { mutableStateOf(false) }
    fun refreshPermission() {
        hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        needsSettings = !hasPermission && requested && activity != null && !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.RECORD_AUDIO)
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        requested = true
        hasPermission = granted
        needsSettings = !granted && activity != null && !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.RECORD_AUDIO)
    }
    val recognizer = remember(context, text) {
        SpeechRecognizerHelper(context, onResultReceived = { transcript -> latestAttempt(SpeechAccuracyEvaluator.calculateAccuracy(transcript, text), transcript) })
    }
    val speechState by recognizer.state.collectAsState()
    DisposableEffect(lifecycle, recognizer) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) recognizer.cancelListening()
            if (event == Lifecycle.Event.ON_RESUME) refreshPermission()
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); recognizer.destroy() }
    }
    SpeechModeContent(
        text = text, state = speechState, hasPermission = hasPermission, needsSettings = needsSettings,
        onRequestPermission = { permissionLauncher.launch(Manifest.permission.RECORD_AUDIO) },
        onOpenSettings = { context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))) },
        onStart = { recognizer.startListening(languageCode) }, onStop = recognizer::stopListening, modifier = modifier
    )
}

@Composable
internal fun SpeechModeContent(
    text: String, state: SpeechRecognizerState, hasPermission: Boolean, needsSettings: Boolean,
    onRequestPermission: () -> Unit, onOpenSettings: () -> Unit, onStart: () -> Unit, onStop: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cue = remember(text) { CueUtils.cueString(text, CueLevel.FIRST_LETTERS) }
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Recite", style = MaterialTheme.typography.titleMedium)
        Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerHigh, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("First-letter cue", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(cue, style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif))
            }
        }
        when {
            !state.isAvailable -> Text("Speech recognition is unavailable on this device.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            !hasPermission -> {
                Text("Allow microphone access to recite aloud.", style = MaterialTheme.typography.bodyMedium)
                if (needsSettings) {
                    Text("Microphone permission is off. Enable it in app settings.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedButton(onClick = onOpenSettings) { Text("Open app settings") }
                } else Button(onClick = onRequestPermission) { Text("Allow microphone") }
            }
            else -> {
                val label = when { state.isProcessing -> "Processing…"; state.isListening -> "Finish speaking"; else -> "Start reciting" }
                Button(onClick = if (state.isListening) onStop else onStart, enabled = !state.isProcessing, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Icon(if (state.isListening) Icons.Default.Stop else Icons.Default.Mic, contentDescription = null)
                    Spacer(Modifier.width(8.dp)); Text(label)
                }
                Text(when { state.isProcessing -> "Waiting for the final transcript."; state.isListening -> "Listening…"; else -> "Speak the verse, then finish when you are ready." }, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        state.error?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
        if (state.transcript.isNotBlank()) {
            Text("Live transcript", style = MaterialTheme.typography.titleSmall)
            Text(state.transcript, style = MaterialTheme.typography.bodyLarge)
            Text("Only the final transcript is checked.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
