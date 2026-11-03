package com.example.telugubible.ui.practice

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import com.example.telugubible.util.CueUtils
import kotlinx.coroutines.delay

data class ScrambleChip(
    val id: String,
    val word: String
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ScrambleMode(
    text: String,
    onComplete: (accuracy: Float) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    // Clean and split words
    val cleanWords = remember(text) {
        text.trim()
            .split(Regex("\\s+"))
            .filter { it.replace(Regex("[.,/#!$%^&*;:{}=\\-_`~()\"'”’]"), "").isNotEmpty() }
    }

    // Chunking into manageable groups (10 words per chunk for long verses)
    val chunks = remember(cleanWords) {
        if (cleanWords.size > 14) {
            cleanWords.chunked(10)
        } else {
            listOf(cleanWords)
        }
    }

    var currentChunkIndex by remember(text) { mutableIntStateOf(0) }
    var mistakeCount by remember(text) { mutableIntStateOf(0) }
    var feedbackMessage by remember { mutableStateOf<String?>(null) }
    var isCheckingSuccess by remember { mutableStateOf(false) }

    val currentTargetWords = remember(chunks, currentChunkIndex) {
        chunks.getOrNull(currentChunkIndex) ?: emptyList()
    }

    // Target placed chips
    val placedChips = remember(chunks, currentChunkIndex) {
        mutableStateListOf<ScrambleChip>()
    }

    // Bank pool of available chips
    val bankChips = remember(chunks, currentChunkIndex) {
        val initialList = currentTargetWords.mapIndexed { idx, word ->
            ScrambleChip(id = "chip_${currentChunkIndex}_${idx}_$word", word = word)
        }.shuffled()
        mutableStateListOf<ScrambleChip>().apply { addAll(initialList) }
    }

    // Handle chunk progression or finish
    LaunchedEffect(isCheckingSuccess) {
        if (isCheckingSuccess) {
            delay(700)
            if (currentChunkIndex < chunks.size - 1) {
                currentChunkIndex++
                isCheckingSuccess = false
                feedbackMessage = null
            } else {
                val totalWords = cleanWords.size
                val acc = if (totalWords + mistakeCount > 0) {
                    (totalWords.toFloat() / (totalWords + mistakeCount)).coerceIn(0f, 1f)
                } else 1f
                onComplete(acc)
            }
        }
    }

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Instruction Subtitle
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = if (chunks.size > 1) {
                    "Put the words in order. (Part ${currentChunkIndex + 1} of ${chunks.size})"
                } else {
                    "Put the words in order."
                },
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (placedChips.isNotEmpty()) {
                TextButton(
                    onClick = {
                        bankChips.addAll(placedChips)
                        placedChips.clear()
                        feedbackMessage = null
                    },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = "Reset",
                        tint = RemoraTextMuted,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Reset",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        Text("Your order · ${placedChips.size} of ${currentTargetWords.size}", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
        // Target word board
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isCheckingSuccess) RemoraAccent else MaterialTheme.colorScheme.surfaceContainerHighest
            ),
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 120.dp)
        ) {
            FlowRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Placed chips (Solid Gold Pill Buttons)
                placedChips.forEachIndexed { index, chip ->
                    Surface(
                        onClick = {
                            if (!isCheckingSuccess) {
                                placedChips.removeAt(index)
                                bankChips.add(chip)
                                feedbackMessage = null
                            }
                        },
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shadowElevation = 2.dp
                    ) {
                        Text(
                            text = chip.word,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.heightIn(min = 48.dp).padding(horizontal = 12.dp, vertical = 12.dp)
                        )
                    }
                }

                if (placedChips.isEmpty()) Text("Choose words from the bank below.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Feedback / Status Banner
        if (feedbackMessage != null) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = if (isCheckingSuccess) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.errorContainer,
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isCheckingSuccess) MaterialTheme.colorScheme.outlineVariant else MaterialTheme.colorScheme.error
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = feedbackMessage ?: "",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isCheckingSuccess) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    textAlign = TextAlign.Center
                )
            }
        }

        // Word Bank Pool (Tappable Chips)
        if (bankChips.isNotEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Word bank",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    bankChips.forEach { chip ->
                        Surface(
                            onClick = {
                                if (!isCheckingSuccess) {
                                    bankChips.remove(chip)
                                    placedChips.add(chip)
                                    feedbackMessage = null
                                }
                            },
                            shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            shadowElevation = 1.dp
                        ) {
                            Text(
                                text = chip.word,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.heightIn(min = 48.dp).padding(horizontal = 13.dp, vertical = 12.dp)
                            )
                        }
                    }
                }
            }
        }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Check Order CTA Button (Docked at Bottom, Matching Mockup)
        Button(
            onClick = {
                if (placedChips.size < currentTargetWords.size) {
                    feedbackMessage = "Place all words before checking order."
                    return@Button
                }

                val isCorrect = placedChips.indices.all { idx ->
                    CueUtils.normalizeWord(placedChips[idx].word) == CueUtils.normalizeWord(currentTargetWords[idx])
                }

                if (isCorrect) {
                    isCheckingSuccess = true
                    feedbackMessage = if (currentChunkIndex < chunks.size - 1) {
                        "Correct! Moving to next part..."
                    } else {
                        "Excellent! You reconstructed the entire verse."
                    }
                } else {
                    mistakeCount++
                    feedbackMessage = "The order isn't quite right. Tap a word to return it to the bank."
                }
            },
            enabled = placedChips.isNotEmpty() && !isCheckingSuccess,
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = RemoraAccent,
                disabledContainerColor = RemoraAccent.copy(alpha = 0.35f)
            ),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
        ) {
            Text(
                text = if (isCheckingSuccess) "Correct!" else "Check order",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimary
            )
        }
    }
}
