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
import androidx.compose.runtime.saveable.rememberSaveable
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
    modifier: Modifier = Modifier,
    previouslySeen: List<Int> = emptyList(),
    onSeenChanged: (Set<Int>, Int) -> Unit = { _, _ -> }
) {
    val scrollState = rememberScrollState()

    // Tokenize text into words preserving word boundaries
    val rawWords = remember(text) {
        text.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    }

    var hintLevel by rememberSaveable(text) { mutableIntStateOf(0) }
    var manuallyRevealed by rememberSaveable(text) { mutableStateOf(arrayListOf<Int>()) }
    var seen by rememberSaveable(text) { mutableStateOf(ArrayList(previouslySeen.filter { it in rawWords.indices })) }
    fun recordSeen(indices: Collection<Int>) {
        val updated = (seen + indices).distinct().sorted()
        if (updated.size != seen.size) {
            seen = ArrayList(updated)
            onSeenChanged(updated.toSet(), rawWords.size)
        }
    }

    // Words revealed via hint button
    val hintRevealedCount = remember(hintLevel, rawWords.size) {
        if (hintLevel == 0) 0 else ceil(rawWords.size * (hintLevel * 0.25f)).toInt().coerceAtMost(rawWords.size)
    }

    val isWordRevealed = { index: Int ->
        index < hintRevealedCount || manuallyRevealed.contains(index)
    }

    val totalRevealedCount = seen.size

    val revealedRatio = if (rawWords.isNotEmpty()) totalRevealedCount.toFloat() / rawWords.size else 0f

    // Grade ceiling based on hint reveal
    val gradeCeilingLabel = when {
        revealedRatio <= 0.05f -> "Easy (5)"
        revealedRatio <= 0.25f -> "Good (4)"
        revealedRatio <= 0.75f -> "Hard (3)"
        else -> "Again (1)"
    }

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            TextButton(onClick = {
                hintLevel = if (hintLevel >= 4) 0 else hintLevel + 1
                val count = ceil(rawWords.size * (hintLevel * 0.25f)).toInt().coerceAtMost(rawWords.size)
                recordSeen((0 until count).toList())
            }) {
                Icon(Icons.Default.Lightbulb, contentDescription = "Hint")
                Spacer(Modifier.width(8.dp))
                Text(if (hintLevel == 0) "Hint" else if (hintLevel < 4) "Hint $hintLevel/4" else "Full hint")
            }
            Text(
                if (totalRevealedCount == 0) "Recite from first letters" else "$totalRevealedCount of ${rawWords.size} words seen · Highest grade: $gradeCeilingLabel",
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant
            )
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
                            recordSeen(listOf(index))
                            manuallyRevealed = ArrayList(if (manuallyRevealed.contains(index)) manuallyRevealed - index else manuallyRevealed + index)
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
                            lineHeight = 30.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = if (revealed) FontWeight.SemiBold else FontWeight.Medium,
                            letterSpacing = if (revealed) 0.sp else 0.5.sp,
                            color = if (revealed) RemoraTextPrimary else RemoraTextSecondary,
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
                text = "Tap any word to peek if you get stuck during recitation",
                fontSize = 11.sp,
                color = RemoraTextMuted,
                textAlign = TextAlign.Center
            )

            Button(
                onClick = { onComplete(revealedRatio) },
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
