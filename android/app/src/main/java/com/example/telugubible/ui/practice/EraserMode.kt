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
import androidx.compose.ui.graphics.Color
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

    val totalHiddenCount = remember(rawWords.size, sliderHiddenSet, manuallyToggled.size) {
        rawWords.indices.count { isWordHidden(it) }
    }

    val hiddenRatio = if (rawWords.isNotEmpty()) totalHiddenCount.toFloat() / rawWords.size else 0f

    val gradeCeilingLabel = when {
        hiddenRatio >= 0.75f -> "Easy (5)"
        hiddenRatio >= 0.50f -> "Good (4)"
        hiddenRatio >= 0.25f -> "Hard (3)"
        else -> "Blank (1)"
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Slider Control Surface
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = RemoraCardBgElevated,
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "HIDE WORDS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = RemoraTextMuted
                    )
                    Text(
                        text = "${sliderValue.roundToInt()}% (${totalHiddenCount}/${rawWords.size})",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraAccentLight
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
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Tap any word to reveal or hide",
                        fontSize = 10.sp,
                        color = RemoraTextMuted
                    )
                    Text(
                        text = "Ceiling: $gradeCeilingLabel",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (hiddenRatio >= 0.75f) GradeEasy
                        else if (hiddenRatio >= 0.50f) GradeGood
                        else if (hiddenRatio >= 0.25f) GradeHard
                        else GradeBlank
                    )
                }
            }
        }

        // Passage Display with Masked / Unmasked Words
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
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rawWords.forEachIndexed { index, word ->
                    val hidden = isWordHidden(index)

                    Surface(
                        onClick = {
                            manuallyToggled[index] = !hidden
                        },
                        shape = RoundedCornerShape(4.dp),
                        color = if (hidden) RemoraCardBorder.copy(alpha = 0.8f) else Color.Transparent,
                        border = if (!hidden) null else androidx.compose.foundation.BorderStroke(
                            1.dp,
                            RemoraCardBorder
                        )
                    ) {
                        Text(
                            text = word,
                            fontSize = 17.sp,
                            lineHeight = 24.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (hidden) Color.Transparent else RemoraTextPrimary,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }

        Text(
            text = "Recite the verse filling in the erased gaps from memory",
            fontSize = 11.sp,
            color = RemoraTextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Button(
            onClick = { onComplete(hiddenRatio) },
            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
        ) {
            Text(
                text = "Done — Check Recall",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }
    }
}
