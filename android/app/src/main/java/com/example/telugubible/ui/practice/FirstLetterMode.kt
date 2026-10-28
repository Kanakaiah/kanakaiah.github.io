package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lightbulb
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
import com.example.telugubible.util.CueLevel
import com.example.telugubible.util.CueUtils
import kotlin.math.ceil

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FirstLetterMode(
    text: String,
    onComplete: (revealedRatio: Float) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    // Tokenize text into words preserving word boundaries
    val rawWords = remember(text) {
        text.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    }

    var hintLevel by remember(text) { mutableIntStateOf(0) }
    val manuallyRevealed = remember(text) { mutableStateListOf<Int>() }

    // Words revealed via hint button
    val hintRevealedCount = remember(hintLevel, rawWords.size) {
        if (hintLevel == 0) 0 else ceil(rawWords.size * (hintLevel * 0.25f)).toInt().coerceAtMost(rawWords.size)
    }

    val isWordRevealed = { index: Int ->
        index < hintRevealedCount || manuallyRevealed.contains(index)
    }

    val totalRevealedCount = remember(hintRevealedCount, manuallyRevealed.size, rawWords.size) {
        rawWords.indices.count { isWordRevealed(it) }
    }

    val revealedRatio = if (rawWords.isNotEmpty()) totalRevealedCount.toFloat() / rawWords.size else 0f

    // Grade ceiling based on hint reveal
    val gradeCeilingLabel = when {
        revealedRatio == 0f -> "Easy (5)"
        revealedRatio <= 0.25f -> "Good (4)"
        revealedRatio <= 0.75f -> "Hard (3)"
        else -> "Blank (1)"
    }

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Controls Row: Lightweight Hint Pill + Ceiling Info
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                onClick = {
                    hintLevel = if (hintLevel >= 4) 0 else hintLevel + 1
                },
                shape = RoundedCornerShape(16.dp),
                color = if (hintLevel > 0) RemoraAccent.copy(alpha = 0.25f) else Color(0xFF1E1B17),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (hintLevel > 0) RemoraAccent else Color(0xFF332D24)
                )
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Lightbulb,
                        contentDescription = "Hint",
                        tint = if (hintLevel > 0) RemoraAccentLight else RemoraTextMuted,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (hintLevel == 0) "Hint" else if (hintLevel < 4) "Hint $hintLevel/4" else "Full",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (hintLevel > 0) RemoraAccentLight else RemoraTextSecondary
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = if (totalRevealedCount == 0) "Recite from first letters"
                    else "$totalRevealedCount of ${rawWords.size} revealed",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Medium,
                    color = RemoraTextSecondary
                )
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF1E1B17),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF332D24))
                ) {
                    Text(
                        text = gradeCeilingLabel,
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (revealedRatio > 0.75f) GradeBlank
                        else if (revealedRatio > 0.25f) GradeHard
                        else RemoraAccentLight,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
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
                    val revealed = isWordRevealed(index)
                    val cuedWord = remember(word) {
                        CueUtils.cueString(word, CueLevel.FIRST_LETTERS)
                    }

                    Surface(
                        onClick = {
                            if (manuallyRevealed.contains(index)) {
                                manuallyRevealed.remove(index)
                            } else {
                                manuallyRevealed.add(index)
                            }
                        },
                        shape = RoundedCornerShape(6.dp),
                        color = if (revealed) RemoraAccent.copy(alpha = 0.18f) else Color.Transparent,
                        border = if (revealed) androidx.compose.foundation.BorderStroke(
                            1.dp,
                            RemoraAccent.copy(alpha = 0.5f)
                        ) else null
                    ) {
                        Text(
                            text = if (revealed) word else cuedWord,
                            fontSize = 20.sp,
                            lineHeight = 32.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = if (revealed) FontWeight.SemiBold else FontWeight.Medium,
                            letterSpacing = if (revealed) 0.sp else 0.5.sp,
                            color = if (revealed) RemoraTextPrimary else RemoraTextSecondary,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
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
                text = "Tap any word to peek if you get stuck during recitation",
                fontSize = 11.sp,
                color = RemoraTextMuted,
                textAlign = TextAlign.Center
            )

            Button(
                onClick = { onComplete(revealedRatio) },
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
