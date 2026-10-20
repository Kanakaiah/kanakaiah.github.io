package com.example.telugubible.ui.practice

import android.app.Activity
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.*
import com.example.telugubible.util.BionicUtils
import kotlinx.coroutines.delay

@Composable
fun ImmersedReader(
    verse: UserMemoryVerse,
    index: Int,
    total: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onExit: () -> Unit,
    isAutoPlaying: Boolean,
    onToggleAutoPlay: () -> Unit,
    isEnglish: Boolean = true,
    bionicReading: Boolean = false,
    recallMasking: Boolean = false,
    serifTypography: Boolean = true,
    modifier: Modifier = Modifier
) {
    // Keep screen on during immersive reading
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val activity = context as? Activity
        activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    BackHandler {
        onExit()
    }

    var fontScaleIndex by remember { mutableIntStateOf(1) } // 0: XS, 1: S, 2: M, 3: L, 4: XL
    val scaleMultipliers = floatArrayOf(0.85f, 1.0f, 1.15f, 1.30f, 1.45f)
    val scaleLabels = arrayOf("XS", "S", "M", "L", "XL")
    val fontMultiplier = scaleMultipliers[fontScaleIndex.coerceIn(0, 4)]

    var chromeVisible by remember { mutableStateOf(true) }
    var userInteractedTime by remember { mutableLongStateOf(System.currentTimeMillis()) }

    // Sentences mask state (reset whenever verse changes)
    var unmaskedIndices by remember(verse.id) { mutableStateOf(setOf<Int>()) }

    // Auto-hide chrome timer after 4 seconds of stillness
    LaunchedEffect(chromeVisible, userInteractedTime) {
        if (chromeVisible) {
            delay(4000L)
            chromeVisible = false
        }
    }

    fun triggerInteraction() {
        userInteractedTime = System.currentTimeMillis()
    }

    var totalDragX by remember { mutableFloatStateOf(0f) }

    val rawText = (if (isEnglish) verse.textEn else verse.textTe)
        ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""
    val bookName = if (isEnglish) verse.bookNameEn else verse.bookNameTe
    val badgeText = if (isEnglish) "BSB" else "IRV"

    val sentences = remember(rawText) {
        BionicUtils.splitSentences(rawText)
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                chromeVisible = !chromeVisible
                triggerInteraction()
            }
            .pointerInput(verse.id) {
                detectHorizontalDragGestures(
                    onDragStart = { totalDragX = 0f },
                    onDragEnd = {
                        if (totalDragX < -150f && index < total - 1) {
                            onNext()
                        } else if (totalDragX > 150f && index > 0) {
                            onPrev()
                        }
                        totalDragX = 0f
                        triggerInteraction()
                    },
                    onDragCancel = { totalDragX = 0f },
                    onHorizontalDrag = { _, dragAmount ->
                        totalDragX += dragAmount
                    }
                )
            }
            .systemBarsPadding()
    ) {
        // Ambient Top Progress Line (Always visible)
        if (total > 1) {
            val progressFraction = (index + 1).toFloat() / total
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(RemoraCardBorder)
                    .align(Alignment.TopCenter)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progressFraction)
                        .background(RemoraAccent)
                )
            }
        }

        // Ambient Position Indicator (Always visible)
        if (total > 1) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp)
                    .align(Alignment.TopCenter),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${index + 1} / $total",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextMuted.copy(alpha = 0.65f),
                        letterSpacing = 2.sp
                    )
                )
            }
        }

        // Top Chrome Controls (Fades in/out)
        AnimatedVisibility(
            visible = chromeVisible,
            enter = fadeIn(animationSpec = tween(250)),
            exit = fadeOut(animationSpec = tween(250)),
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onExit,
                    modifier = Modifier.size(38.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Exit immersive reader",
                        tint = RemoraTextSecondary
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Decrease text size
                    IconButton(
                        onClick = {
                            if (fontScaleIndex > 0) fontScaleIndex--
                            triggerInteraction()
                        },
                        enabled = fontScaleIndex > 0,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Remove,
                            contentDescription = "Decrease text size",
                            tint = if (fontScaleIndex > 0) RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.4f),
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Reset font size
                    TextButton(
                        onClick = {
                            fontScaleIndex = 1
                            triggerInteraction()
                        },
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text(
                            text = scaleLabels[fontScaleIndex],
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextSecondary
                        )
                    }

                    // Increase text size
                    IconButton(
                        onClick = {
                            if (fontScaleIndex < scaleMultipliers.size - 1) fontScaleIndex++
                            triggerInteraction()
                        },
                        enabled = fontScaleIndex < scaleMultipliers.size - 1,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Increase text size",
                            tint = if (fontScaleIndex < scaleMultipliers.size - 1) RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.4f),
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(18.dp)
                            .background(RemoraCardBorder)
                            .padding(horizontal = 2.dp)
                    )

                    // TTS Read Aloud Button
                    IconButton(
                        onClick = {
                            onToggleAutoPlay()
                            triggerInteraction()
                        },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = if (isAutoPlaying) Icons.Default.Stop else Icons.Default.VolumeUp,
                            contentDescription = if (isAutoPlaying) "Stop reading aloud" else "Read aloud",
                            tint = if (isAutoPlaying) RemoraAccent else RemoraTextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // Center Verse Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(64.dp))

            // Reference Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "$bookName ${verse.chapter}:${verse.verse}",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextSecondary,
                        fontSize = (16.sp * fontMultiplier)
                    )
                )
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = RemoraAccent.copy(alpha = 0.14f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.35f))
                ) {
                    Text(
                        text = badgeText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraAccent,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Sentences Body with optional Recall Masking and Bionic Reading
            val baseFontSize = 24.sp * fontMultiplier
            val lineHeight = (baseFontSize.value * 1.55f).sp

            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                sentences.forEachIndexed { sIdx, sentence ->
                    val isMasked = recallMasking && !unmaskedIndices.contains(sIdx)
                    val annotatedSentence = remember(sentence, bionicReading) {
                        BionicUtils.formatBionic(sentence, bionicReading)
                    }

                    Text(
                        text = annotatedSentence,
                        fontSize = baseFontSize,
                        lineHeight = lineHeight,
                        fontFamily = if (serifTypography) FontFamily.Serif else FontFamily.Default,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .blur(if (isMasked) 8.dp else 0.dp)
                            .alpha(if (isMasked) 0.45f else 1.0f)
                            .clickable {
                                if (isMasked) {
                                    unmaskedIndices = unmaskedIndices + sIdx
                                    triggerInteraction()
                                }
                            }
                    )
                }
            }

            Spacer(modifier = Modifier.height(64.dp))
        }

        // Bottom Navigation Bar (Fades in/out)
        AnimatedVisibility(
            visible = chromeVisible && total > 1,
            enter = fadeIn(animationSpec = tween(250)),
            exit = fadeOut(animationSpec = tween(250)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 18.dp)
                .align(Alignment.BottomCenter)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilledTonalButton(
                    onClick = {
                        onPrev()
                        triggerInteraction()
                    },
                    enabled = index > 0,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Previous")
                }

                FilledTonalButton(
                    onClick = {
                        onNext()
                        triggerInteraction()
                    },
                    enabled = index < total - 1,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Next")
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}
