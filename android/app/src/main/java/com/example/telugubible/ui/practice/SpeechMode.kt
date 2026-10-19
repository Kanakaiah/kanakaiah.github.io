package com.example.telugubible.ui.practice

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.telugubible.theme.*
import com.example.telugubible.util.SpeechAccuracyEvaluator
import com.example.telugubible.util.SpeechRecognizerHelper
import com.example.telugubible.util.WordMatchStatus

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SpeechMode(
    text: String,
    languageCode: String = "en-US",
    onAttempt: (accuracy: Int, committed: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasPermission = granted
    }

    val recognizerHelper = remember {
        SpeechRecognizerHelper(context) { transcript ->
            val acc = SpeechAccuracyEvaluator.calculateAccuracy(transcript, text)
            onAttempt(acc, transcript)
        }
    }

    DisposableEffect(recognizerHelper) {
        onDispose {
            recognizerHelper.destroy()
        }
    }

    val speechState by recognizerHelper.state.collectAsState()
    val scrollState = rememberScrollState()

    // Pulse animation for listening state
    val infiniteTransition = rememberInfiniteTransition(label = "mic_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )

    val accuracy = remember(speechState.transcript, text) {
        if (speechState.transcript.isNotBlank()) {
            SpeechAccuracyEvaluator.calculateAccuracy(speechState.transcript, text)
        } else null
    }

    val wordDiff = remember(speechState.transcript, text) {
        SpeechAccuracyEvaluator.generateWordDiff(speechState.transcript, text)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Upper card: First Letter Prompt (while speaking) or Diff View (when finished)
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = RemoraCardBgElevated,
            border = BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (speechState.isListening || speechState.transcript.isBlank()) {
                    Text(
                        text = "Recite aloud from memory using first letters as a cue:",
                        fontSize = 12.sp,
                        color = RemoraTextMuted,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    FirstLetterMode(
                        text = text,
                        onComplete = { /* passive display */ }
                    )
                } else {
                    // Recitation Word-Level Diff View
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        wordDiff.forEach { item ->
                            val textColor = when (item.status) {
                                WordMatchStatus.MATCH -> Color(0xFF4ADE80) // Vibrant green
                                WordMatchStatus.MISMATCH -> Color(0xFFEF4444) // Red
                                WordMatchStatus.UNREACHED -> RemoraTextMuted.copy(alpha = 0.5f)
                            }
                            val textDecoration = if (item.status == WordMatchStatus.MISMATCH) {
                                TextDecoration.LineThrough
                            } else null

                            Text(
                                text = "${item.word} ",
                                fontSize = 17.sp,
                                lineHeight = 26.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = if (item.status == WordMatchStatus.MATCH) FontWeight.Bold else FontWeight.Normal,
                                color = textColor,
                                textDecoration = textDecoration
                            )
                        }
                    }

                    if (accuracy != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = when {
                                accuracy >= 80 -> Color(0xFF166534).copy(alpha = 0.4f)
                                accuracy >= 50 -> Color(0xFF854D0E).copy(alpha = 0.4f)
                                else -> Color(0xFF991B1B).copy(alpha = 0.4f)
                            },
                            border = BorderStroke(
                                1.dp,
                                when {
                                    accuracy >= 80 -> Color(0xFF22C55E)
                                    accuracy >= 50 -> Color(0xFFEAB308)
                                    else -> Color(0xFFEF4444)
                                }
                            )
                        ) {
                            Text(
                                text = "$accuracy% Accuracy",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = when {
                                    accuracy >= 80 -> Color(0xFF4ADE80)
                                    accuracy >= 50 -> Color(0xFFFDE047)
                                    else -> Color(0xFFFCA5A5)
                                },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }

        // Animated Microphone Recitation Button
        Box(
            modifier = Modifier
                .padding(vertical = 8.dp)
                .size(96.dp),
            contentAlignment = Alignment.Center
        ) {
            if (speechState.isListening) {
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .scale(pulseScale)
                        .clip(CircleShape)
                        .background(Color(0xFFEF4444).copy(alpha = 0.25f))
                )
            }

            FilledIconButton(
                onClick = {
                    if (!hasPermission) {
                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    } else {
                        if (speechState.isListening) {
                            recognizerHelper.stopListening()
                        } else {
                            recognizerHelper.startListening(languageCode)
                        }
                    }
                },
                shape = CircleShape,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = if (speechState.isListening) Color(0xFFEF4444) else RemoraAccent
                ),
                modifier = Modifier.size(72.dp)
            ) {
                Icon(
                    imageVector = if (speechState.isListening) Icons.Default.MicOff else Icons.Default.Mic,
                    contentDescription = if (speechState.isListening) "Stop Listening" else "Start Reciting",
                    tint = Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }
        }

        if (speechState.isListening) {
            Text(
                text = "Listening to your recitation...",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = RemoraAccentLight
            )
        } else if (!hasPermission) {
            Text(
                text = "Tap to grant microphone permission",
                fontSize = 12.sp,
                color = RemoraGold
            )
        }

        // Error message if any
        speechState.error?.let { err ->
            Text(
                text = err,
                color = Color(0xFFEF4444),
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )
        }

        // Live Transcript Container
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = RemoraCardBg,
            border = BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp)
            ) {
                Text(
                    text = "Live Transcript",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextSecondary,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = speechState.transcript.ifBlank { "Tap microphone and speak verse clearly..." },
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    color = if (speechState.transcript.isNotBlank()) RemoraTextPrimary else RemoraTextMuted
                )
            }
        }
    }
}
