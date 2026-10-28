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
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Slider Control Surface
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFF1E1B17),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF332D24)),
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
                    Text(
                        text = "BLANKS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = RemoraAccent
                    )
                    Text(
                        text = "${sliderValue.roundToInt()}% (${totalHiddenCount}/${rawWords.size} hidden)",
                        fontSize = 12.sp,
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
                        shape = RoundedCornerShape(6.dp),
                        color = if (hidden) Color(0xFF2C2720) else Color.Transparent,
                        border = if (hidden) androidx.compose.foundation.BorderStroke(
                            1.dp,
                            Color(0xFF453E33)
                        ) else null
                    ) {
                        Text(
                            text = if (hidden) "•".repeat(word.length.coerceAtLeast(3)) else word,
                            fontSize = 20.sp,
                            lineHeight = 32.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Medium,
                            letterSpacing = if (hidden) 2.sp else 0.sp,
                            color = if (hidden) Color(0xFF6E6455) else RemoraTextPrimary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
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
                fontSize = 11.sp,
                color = RemoraTextMuted,
                textAlign = TextAlign.Center
            )

            Button(
                onClick = { onComplete(hiddenRatio) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = RemoraAccent,
                    contentColor = Color(0xFF141414)
                ),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text(
                    text = "Done Reciting — Check Recall",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF141414)
                )
            }
        }
    }
}
