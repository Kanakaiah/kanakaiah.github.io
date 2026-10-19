package com.example.telugubible.ui.practice

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    val word: String,
    val isSelected: Boolean = false
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
        text.replace(Regex("[.,/#!$%^&*;:{}=\\-_`~()\"'”’]"), "")
            .trim()
            .split(Regex("\\s+"))
            .filter { it.isNotEmpty() }
    }

    // Chunking into manageable groups (10 words per chunk for long verses)
    val chunks = remember(cleanWords) {
        if (cleanWords.size > 15) {
            cleanWords.chunked(10)
        } else {
            listOf(cleanWords)
        }
    }

    var currentChunkIndex by remember(text) { mutableIntStateOf(0) }
    var assembledCount by remember(text, currentChunkIndex) { mutableIntStateOf(0) }
    var mistakeCount by remember(text) { mutableIntStateOf(0) }
    var errorChipId by remember { mutableStateOf<String?>(null) }

    val currentTargetWords = remember(chunks, currentChunkIndex) {
        chunks.getOrNull(currentChunkIndex) ?: emptyList()
    }

    // Shuffled pool of words for the current chunk
    var pool by remember(chunks, currentChunkIndex) {
        val list = currentTargetWords.mapIndexed { idx, word ->
            ScrambleChip(id = "chip_${currentChunkIndex}_${idx}", word = word)
        }.shuffled()
        mutableStateOf(list)
    }

    val isChunkComplete = assembledCount == currentTargetWords.size && currentTargetWords.isNotEmpty()
    val isAllComplete = isChunkComplete && currentChunkIndex == chunks.size - 1

    // Clear error chip highlight after brief delay
    LaunchedEffect(errorChipId) {
        if (errorChipId != null) {
            delay(500)
            errorChipId = null
        }
    }

    // Auto-advance chunk
    LaunchedEffect(isChunkComplete, currentChunkIndex, isAllComplete) {
        if (isChunkComplete && !isAllComplete) {
            delay(650)
            currentChunkIndex++
            assembledCount = 0
        } else if (isAllComplete) {
            val totalWords = cleanWords.size
            val acc = if (totalWords + mistakeCount > 0) {
                (totalWords.toFloat() / (totalWords + mistakeCount)).coerceIn(0f, 1f)
            } else 1f
            onComplete(acc)
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Status Card
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = RemoraCardBgElevated,
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (isAllComplete) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = GradeEasy,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Sequence Complete! All words assembled.",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = GradeEasy
                        )
                    }
                } else if (isChunkComplete) {
                    Text(
                        text = "Part ${currentChunkIndex + 1} done! Loading next part...",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = RemoraAccentLight
                    )
                } else if (chunks.size > 1) {
                    Text(
                        text = "Part ${currentChunkIndex + 1} of ${chunks.size} — Tap words in correct order",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = RemoraTextSecondary
                    )
                } else {
                    Text(
                        text = "Tap words in correct order to reconstruct the verse",
                        fontSize = 12.sp,
                        color = RemoraTextSecondary
                    )
                }
            }
        }

        // Assembled Slots Container
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = RemoraCardBg,
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            FlowRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                currentTargetWords.forEachIndexed { idx, word ->
                    val isFilled = idx < assembledCount
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isFilled) RemoraCardBgElevated else Color.Transparent,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isFilled) RemoraAccent.copy(alpha = 0.5f) else RemoraCardBorder
                        )
                    ) {
                        Text(
                            text = if (isFilled) word else "_____",
                            fontSize = 15.sp,
                            fontWeight = if (isFilled) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (isFilled) RemoraTextPrimary else RemoraTextMuted,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        // Shuffled Pool Chips
        if (!isChunkComplete) {
            FlowRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                pool.forEach { chip ->
                    if (!chip.isSelected) {
                        val isError = errorChipId == chip.id

                        val chipBg by animateColorAsState(
                            targetValue = if (isError) Color(0xFFEF4444).copy(alpha = 0.2f) else RemoraCardBgElevated,
                            label = "scramble_bg"
                        )
                        val chipBorder by animateColorAsState(
                            targetValue = if (isError) Color(0xFFEF4444) else RemoraCardBorder,
                            label = "scramble_border"
                        )
                        val chipTextColor by animateColorAsState(
                            targetValue = if (isError) Color(0xFFEF4444) else RemoraTextPrimary,
                            label = "scramble_text"
                        )

                        Surface(
                            onClick = {
                                val expected = currentTargetWords.getOrNull(assembledCount)
                                if (expected != null && CueUtils.normalizeWord(chip.word) == CueUtils.normalizeWord(expected)) {
                                    // Match!
                                    pool = pool.map {
                                        if (it.id == chip.id) it.copy(isSelected = true) else it
                                    }
                                    assembledCount++
                                    errorChipId = null
                                } else {
                                    // Mismatch!
                                    errorChipId = chip.id
                                    mistakeCount++
                                }
                            },
                            shape = RoundedCornerShape(8.dp),
                            color = chipBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, chipBorder),
                            shadowElevation = 1.dp
                        ) {
                            Text(
                                text = chip.word,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium,
                                color = chipTextColor,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                            )
                        }
                    }
                }
            }
        }

        // Completion Action
        if (isAllComplete) {
            Button(
                onClick = {
                    val totalWords = cleanWords.size
                    val acc = if (totalWords + mistakeCount > 0) {
                        (totalWords.toFloat() / (totalWords + mistakeCount)).coerceIn(0f, 1f)
                    } else 1f
                    onComplete(acc)
                },
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text(
                    text = "Done — Rate My Recall",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
