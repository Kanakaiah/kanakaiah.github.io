package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import kotlin.math.roundToInt

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EraserMode(
    text: String,
    onComplete: (hiddenRatio: Float) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    val rawWords = remember(text) {
        text.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    }

    // Stable shuffled indices for this passage
    val shuffledIndices = remember(text) {
        rawWords.indices.shuffled()
    }

    var sliderValue by remember(text) { mutableFloatStateOf(25f) }
    val manuallyToggled = remember(text) { mutableStateMapOf<Int, Boolean>() }

    // Number of words to hide based on slider
    val targetHideCount = remember(sliderValue, rawWords.size) {
        ((sliderValue / 100f) * rawWords.size).roundToInt().coerceIn(0, rawWords.size)
    }

    val sliderHiddenSet = remember(targetHideCount, shuffledIndices) {
        shuffledIndices.take(targetHideCount).toSet()
    }

    val isWordHidden = { index: Int ->
        manuallyToggled[index] ?: sliderHiddenSet.contains(index)
    }

    val totalHiddenCount = rawWords.indices.count { isWordHidden(it) }

    val hiddenRatio = if (rawWords.isNotEmpty()) totalHiddenCount.toFloat() / rawWords.size else 0f

    val gradeCeilingLabel = when {
        hiddenRatio >= 0.75f -> "Easy (5)"
        hiddenRatio >= 0.50f -> "Good (4)"
        hiddenRatio >= 0.25f -> "Hard (3)"
        else -> "Again (1)"
    }

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Slider Control Surface
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Blanks", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "${sliderValue.roundToInt()}% (${totalHiddenCount}/${rawWords.size} hidden)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Slider(
                    value = sliderValue,
                    onValueChange = {
                        sliderValue = it
                        manuallyToggled.clear()
                    },
                    valueRange = 0f..100f,
                    colors = SliderDefaults.colors(
                        thumbColor = RemoraAccent,
                        activeTrackColor = RemoraAccent,
                        inactiveTrackColor = RemoraCardBorder
                    ),
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Amount of text hidden" }
                )

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "Tap any word to reveal or hide",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Ceiling: $gradeCeilingLabel",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Free-Flow Passage Display (Unconstrained canvas, full screen space like Immerse mode)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(scrollState)
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.TopStart
        ) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                rawWords.forEachIndexed { index, word ->
                    val hidden = isWordHidden(index)

                    Surface(
                        onClick = {
                            manuallyToggled[index] = !hidden
                        },
                        modifier = if (hidden) Modifier.semantics { contentDescription = "Hidden word, tap to reveal" } else Modifier,
                        shape = RoundedCornerShape(6.dp),
                        color = if (hidden) MaterialTheme.colorScheme.surfaceContainerHighest else Color.Transparent,
                        border = if (hidden) androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.outline
                        ) else null
                    ) {
                        Text(
                            text = if (hidden) "•".repeat(word.length.coerceAtLeast(3)) else word,
                            fontSize = 20.sp,
                            lineHeight = 32.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Medium,
                            letterSpacing = if (hidden) 2.sp else 0.sp,
                            color = if (hidden) MaterialTheme.colorScheme.onSurfaceVariant else RemoraTextPrimary,
                            modifier = Modifier.heightIn(min = 48.dp).padding(horizontal = 8.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        }

        // Docked Bottom Action Area (Always visible without scrolling)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = "Recite the verse filling in the erased gaps from memory",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Button(
                onClick = { onComplete(hiddenRatio) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = RemoraAccent,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
            ) {
                Text(
                    text = "Done Reciting — Check Recall",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    }
}
