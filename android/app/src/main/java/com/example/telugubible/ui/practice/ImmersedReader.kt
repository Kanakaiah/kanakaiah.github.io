package com.example.telugubible.ui.practice

import android.app.Activity
import android.os.Build
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.zIndex
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.*
import com.example.telugubible.util.BionicUtils

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
    val scaleMultipliers = floatArrayOf(0.85f, 1.00f, 1.25f, 1.55f, 1.95f)
    val scaleLabels = arrayOf("XS", "S", "M", "L", "XL")
    val fontMultiplier = scaleMultipliers[fontScaleIndex.coerceIn(0, 4)]

    var chromeVisible by remember { mutableStateOf(true) }

    // Sentences mask state (reset whenever verse changes)
    var unmaskedIndices by remember(verse.id) { mutableStateOf(setOf<Int>()) }

    var totalDragX by remember { mutableFloatStateOf(0f) }

    val rawText = ((if (isEnglish) verse.textEn else verse.textTe)
        ?: (if (isEnglish) verse.textTe else verse.textEn) ?: "")
        .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<[^>]+>"), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .trim()

    val sentences = remember(rawText) {
        BionicUtils.splitSentences(rawText)
    }

    Dialog(
        onDismissRequest = onExit,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(RemoraBackground)
                .systemBarsPadding()
        ) {
            // LAYER 1: Ambient Position Indicator (Always visible at top center)
            if (total > 1) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
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

            // LAYER 2: Ambient Bottom Progress Line (Always visible at bottom)
            if (total > 1) {
                val progressFraction = (index + 1).toFloat() / total
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(RemoraCardBorder)
                        .align(Alignment.BottomCenter)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progressFraction)
                            .background(RemoraAccent)
                    )
                }
            }

            // LAYER 3: Reading Viewport & Text Content
            // Tapping this area toggles the chrome controls. Dragging horizontally changes verses.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(verse.id) {
                        detectHorizontalDragGestures(
                            onDragStart = { totalDragX = 0f },
                            onDragEnd = {
                                if (totalDragX < -120f && index < total - 1) {
                                    onNext()
                                } else if (totalDragX > 120f && index > 0) {
                                    onPrev()
                                }
                                totalDragX = 0f
                            },
                            onDragCancel = { totalDragX = 0f },
                            onHorizontalDrag = { _, dragAmount ->
                                totalDragX += dragAmount
                            }
                        )
                    }
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        chromeVisible = !chromeVisible
                    }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 28.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.Start,
                    verticalArrangement = Arrangement.Center
                ) {
                    Spacer(modifier = Modifier.height(72.dp))

                    // Reference Header matching PWD ImmersedReader
                    val refText = verse.fullRef(isEnglish).uppercase()

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 24.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Text(
                                text = refText,
                                color = RemoraAccent,
                                fontSize = (17.sp * fontMultiplier),
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 2.sp
                            )
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(RemoraCardBorder)
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Sentences Body matching PWD ReadMode style (No highlight on touch)
                    val baseFontSize = 22.sp * fontMultiplier
                    val lineHeight = (baseFontSize.value * 1.55f).sp

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        sentences.forEachIndexed { sIdx, sentence ->
                            val isMasked = recallMasking && !unmaskedIndices.contains(sIdx)
                            val annotatedSentence = remember(sentence, bionicReading) {
                                BionicUtils.formatBionic(sentence, bionicReading)
                            }

                            val sentenceModifier = Modifier
                                .fillMaxWidth()
                                .then(
                                    if (isMasked && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        Modifier.blur(8.dp)
                                    } else {
                                        Modifier
                                    }
                                )
                                .alpha(if (isMasked) 0.35f else 1.0f)
                                .then(
                                    if (recallMasking && isMasked) {
                                        Modifier.clickable(
                                            interactionSource = remember { MutableInteractionSource() },
                                            indication = null
                                        ) {
                                            unmaskedIndices = unmaskedIndices + sIdx
                                        }
                                    } else {
                                        Modifier
                                    }
                                )

                            Text(
                                text = annotatedSentence,
                                fontSize = baseFontSize,
                                lineHeight = lineHeight,
                                fontFamily = if (serifTypography) FontFamily.Serif else FontFamily.Default,
                                fontWeight = FontWeight.Normal,
                                color = RemoraTextPrimary,
                                textAlign = TextAlign.Start,
                                modifier = sentenceModifier
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(100.dp))
                }
            }

            // LAYER 4: Top Chrome Controls (Always on top with zIndex, clicks consumed)
            AnimatedVisibility(
                visible = chromeVisible,
                enter = fadeIn(animationSpec = tween(200)),
                exit = fadeOut(animationSpec = tween(200)),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .zIndex(10f)
            ) {
                Surface(
                    color = RemoraBackground.copy(alpha = 0.95f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {} // Blocks tap-through to background
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onExit,
                            modifier = Modifier.size(40.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Exit immersive reader",
                                tint = RemoraTextSecondary,
                                modifier = Modifier.size(22.dp)
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
                                },
                                enabled = fontScaleIndex > 0,
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Remove,
                                    contentDescription = "Decrease text size",
                                    tint = if (fontScaleIndex > 0) RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.35f),
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            // Reset font size
                            TextButton(
                                onClick = {
                                    fontScaleIndex = 1
                                },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(34.dp)
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
                                },
                                enabled = fontScaleIndex < scaleMultipliers.size - 1,
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = "Increase text size",
                                    tint = if (fontScaleIndex < scaleMultipliers.size - 1) RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.35f),
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .padding(horizontal = 6.dp)
                                    .width(1.dp)
                                    .height(18.dp)
                                    .background(RemoraCardBorder)
                            )

                            // Continuous Audio Play / Stop Button
                            IconButton(
                                onClick = onToggleAutoPlay,
                                modifier = Modifier.size(38.dp)
                            ) {
                                Icon(
                                    imageVector = if (isAutoPlaying) Icons.Default.Stop else Icons.AutoMirrored.Filled.VolumeUp,
                                    contentDescription = if (isAutoPlaying) "Stop reading aloud" else "Read aloud",
                                    tint = if (isAutoPlaying) RemoraAccent else RemoraTextSecondary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }

            // LAYER 5: Bottom Navigation Bar (Links, not buttons, with zIndex)
            AnimatedVisibility(
                visible = chromeVisible && total > 1,
                enter = fadeIn(animationSpec = tween(200)),
                exit = fadeOut(animationSpec = tween(200)),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .zIndex(10f)
            ) {
                Surface(
                    color = RemoraBackground.copy(alpha = 0.95f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {} // Blocks tap-through to background
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(
                            onClick = onPrev,
                            enabled = index > 0,
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = RemoraTextSecondary,
                                disabledContentColor = RemoraTextMuted.copy(alpha = 0.3f)
                            ),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Previous verse",
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Previous",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        if (!isAutoPlaying) {
                            Text(
                                text = "Tap to hide controls · ← → swipe",
                                fontSize = 11.sp,
                                color = RemoraTextMuted.copy(alpha = 0.6f)
                            )
                        }

                        TextButton(
                            onClick = onNext,
                            enabled = index < total - 1,
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = RemoraTextSecondary,
                                disabledContentColor = RemoraTextMuted.copy(alpha = 0.3f)
                            ),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = "Next",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "Next verse",
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // LAYER 6: Persistent "Stop reading aloud" pill when TTS is active
            if (isAutoPlaying) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = if (chromeVisible && total > 1) 68.dp else 24.dp)
                        .align(Alignment.BottomCenter)
                        .zIndex(15f),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        onClick = onToggleAutoPlay,
                        shape = RoundedCornerShape(24.dp),
                        color = RemoraCardBgElevated,
                        border = BorderStroke(1.dp, RemoraAccent),
                        shadowElevation = 6.dp
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Stop,
                                contentDescription = "Stop",
                                tint = RemoraAccent,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Stop reading aloud",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = RemoraTextPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
