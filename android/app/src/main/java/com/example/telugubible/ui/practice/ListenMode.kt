package com.example.telugubible.ui.practice

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import com.example.telugubible.util.TtsManager
import kotlinx.coroutines.delay

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
    ttsManager: TtsManager,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    // Cleaned words
    val words = remember(verseText) {
        verseText.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    }

    // Estimated duration in seconds based on word count & speed
    // Average speech rate is ~140 words per minute -> ~2.3 words/sec
    val wordsPerSecond = 2.4f * speed
    val totalSeconds = remember(words.size, speed) {
        val sec = (words.size / wordsPerSecond).toInt().coerceAtLeast(3)
        sec
    }

    var isPlaying by remember { mutableStateOf(false) }
    var elapsedSeconds by remember { mutableFloatStateOf(0f) }
    var currentWordIndex by remember { mutableIntStateOf(-1) }
    var currentIteration by remember { mutableIntStateOf(1) }

    // Synchronize highlight with elapsed time
    LaunchedEffect(isPlaying, elapsedSeconds, words.size, totalSeconds) {
        if (words.isNotEmpty() && totalSeconds > 0) {
            val progressRatio = (elapsedSeconds / totalSeconds).coerceIn(0f, 1f)
            currentWordIndex = (progressRatio * words.size).toInt().coerceIn(0, words.size - 1)
        }
    }

    // Playback loop timer & TTS trigger
    LaunchedEffect(isPlaying, currentIteration) {
        if (isPlaying) {
            val langCode = if (isEnglish) "en" else "te"
            ttsManager.speak(verseText, langCode = langCode, rate = speed) {
                // When TTS utterance completes:
                if (currentIteration < repeatCount) {
                    currentIteration++
                    elapsedSeconds = 0f
                } else {
                    isPlaying = false
                    elapsedSeconds = totalSeconds.toFloat()
                    currentWordIndex = words.size - 1
                    if (autoAdvance) {
                        onComplete()
                    }
                }
            }

            while (isPlaying && elapsedSeconds < totalSeconds) {
                delay(100)
                elapsedSeconds += 0.1f
            }
        } else {
            ttsManager.stop()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            ttsManager.stop()
        }
    }

    val formatTime = { sec: Int ->
        val m = sec / 60
        val s = sec % 60
        "%d:%02d".format(m, s)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Upper Content: "NOW PLAYING" & Large Serif Verse Text
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "NOW PLAYING",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
                color = RemoraAccent
            )

            // Text Flow with Karaoke Synchronized Highlight
            if (hideText) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF191714),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2C2720)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.VisibilityOff,
                            contentDescription = null,
                            tint = RemoraAccent,
                            modifier = Modifier.size(28.dp)
                        )
                        Text(
                            text = "Text Hidden for Auditory Recall",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = RemoraTextPrimary
                        )
                        Text(
                            text = "Listen closely and recite from memory as the audio plays.",
                            fontSize = 12.sp,
                            color = RemoraTextSecondary,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    words.forEachIndexed { idx, word ->
                        val isHighlighted = isPlaying && idx == currentWordIndex
                        val hasPassed = isPlaying && idx < currentWordIndex

                        val bgColor by animateColorAsState(
                            targetValue = if (isHighlighted) RemoraAccent else Color.Transparent,
                            label = "karaoke_bg"
                        )
                        val textColor by animateColorAsState(
                            targetValue = when {
                                isHighlighted -> Color(0xFF14120E)
                                hasPassed -> RemoraTextPrimary
                                else -> RemoraTextSecondary.copy(alpha = 0.85f)
                            },
                            label = "karaoke_text"
                        )

                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = bgColor,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Text(
                                text = word,
                                fontSize = 21.sp,
                                fontFamily = FontFamily.Serif,
                                fontWeight = if (isHighlighted) FontWeight.Bold else FontWeight.Normal,
                                color = textColor,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Audio Player Controller Card (Bottom Docked Container)
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color(0xFF1A1815),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2C2720)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Scrubber Slider Row
                Column(modifier = Modifier.fillMaxWidth()) {
                    Slider(
                        value = elapsedSeconds.coerceIn(0f, totalSeconds.toFloat()),
                        onValueChange = { newSec ->
                            elapsedSeconds = newSec
                            if (words.isNotEmpty() && totalSeconds > 0) {
                                currentWordIndex = ((newSec / totalSeconds) * words.size).toInt().coerceIn(0, words.size - 1)
                            }
                        },
                        valueRange = 0f..totalSeconds.toFloat(),
                        colors = SliderDefaults.colors(
                            thumbColor = RemoraAccent,
                            activeTrackColor = RemoraAccent,
                            inactiveTrackColor = Color(0xFF332D24)
                        ),
                        modifier = Modifier.height(20.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = formatTime(elapsedSeconds.toInt()),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraTextMuted
                        )
                        Text(
                            text = formatTime(totalSeconds),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraTextMuted
                        )
                    }
                }

                // Playback Controls Row: Prev | Play/Pause | Next
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            elapsedSeconds = 0f
                            currentWordIndex = 0
                            onPrev()
                        },
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            Icons.Default.SkipPrevious,
                            contentDescription = "Previous Verse",
                            tint = RemoraTextPrimary,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(20.dp))

                    // Play/Pause Big Gold Button
                    Surface(
                        onClick = { isPlaying = !isPlaying },
                        shape = CircleShape,
                        color = RemoraAccent,
                        shadowElevation = 4.dp,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = Color(0xFF14120E),
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(20.dp))

                    IconButton(
                        onClick = {
                            elapsedSeconds = 0f
                            currentWordIndex = 0
                            onNext()
                        },
                        modifier = Modifier.size(44.dp)
                    ) {
                        Icon(
                            Icons.Default.SkipNext,
                            contentDescription = "Next Verse",
                            tint = RemoraTextPrimary,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }

                // Playback Option Chips Row: Speed | Repeat | Hide text
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Speed Chip
                    Surface(
                        onClick = {
                            val nextSpeed = when (speed) {
                                0.75f -> 1.0f
                                1.0f -> 1.25f
                                1.25f -> 1.5f
                                else -> 0.75f
                            }
                            onSpeedChange(nextSpeed)
                        },
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF221F1B),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38322A))
                    ) {
                        Text(
                            text = "Speed ${speed}x",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraTextPrimary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }

                    // Repeat Chip
                    Surface(
                        onClick = {
                            val nextRepeat = when (repeatCount) {
                                1 -> 2
                                2 -> 3
                                3 -> 999
                                else -> 1
                            }
                            onRepeatChange(nextRepeat)
                        },
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF221F1B),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38322A))
                    ) {
                        val repeatLabel = if (repeatCount > 10) "∞" else "${repeatCount}x"
                        Text(
                            text = "Repeat $repeatLabel",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraTextPrimary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }

                    // Hide text Chip
                    Surface(
                        onClick = { onHideTextToggle(!hideText) },
                        shape = RoundedCornerShape(16.dp),
                        color = if (hideText) RemoraAccent.copy(alpha = 0.18f) else Color(0xFF221F1B),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (hideText) RemoraAccent else Color(0xFF38322A)
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                imageVector = if (hideText) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null,
                                tint = if (hideText) RemoraAccent else RemoraTextSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Hide text",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (hideText) RemoraAccent else RemoraTextPrimary
                            )
                        }
                    }
                }

                HorizontalDivider(color = Color(0xFF28241E), thickness = 1.dp)

                // Auto-advance Checkbox Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onAutoAdvanceToggle(!autoAdvance) },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = autoAdvance,
                        onCheckedChange = { onAutoAdvanceToggle(it) },
                        colors = CheckboxDefaults.colors(
                            checkedColor = RemoraAccent,
                            uncheckedColor = RemoraTextMuted,
                            checkmarkColor = Color(0xFF14120E)
                        )
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Auto-advance to next verse",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = RemoraTextPrimary
                    )
                }
            }
        }
    }
}
