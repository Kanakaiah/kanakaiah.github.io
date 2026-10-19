package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
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
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.theme.*

@Composable
fun PracticeScreen(
    viewModel: PracticeViewModel,
    onNavigateToBible: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
            .padding(16.dp)
    ) {
        when {
            state.isLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = RemoraAccent)
                }
            }
            state.isFinished || state.verses.isEmpty() -> {
                FinishedState(
                    isEmpty = state.verses.isEmpty(),
                    onRestart = { viewModel.restart() },
                    onBrowseBible = onNavigateToBible
                )
            }
            else -> {
                val verse = state.currentVerse
                if (verse != null) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 72.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Top Progress Indicator
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "PRACTICE DRILL",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = RemoraAccent
                                )
                                Text(
                                    text = "${state.currentIndex + 1} of ${state.verses.size}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextSecondary
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            val progress = (state.currentIndex.toFloat() / state.verses.size.coerceAtLeast(1))
                            LinearProgressIndicator(
                                progress = { progress },
                                color = RemoraAccent,
                                trackColor = RemoraCardBorder,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                            )
                        }

                        // Center Memory Flashcard
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .padding(vertical = 16.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(20.dp),
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                // Card Top: Reference + Translation Toggle Badge
                                val isEnglish = state.displayLanguage == DisplayLanguage.ENGLISH
                                val bookName = if (isEnglish) verse.bookNameEn else verse.bookNameTe
                                val badgeText = if (isEnglish) "BSB" else "IRV"
                                val activeText = (if (isEnglish) verse.textEn else verse.textTe)
                                    ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = bookName,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = RemoraAccentLight
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "Chapter ${verse.chapter}:${verse.verse}",
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = RemoraTextPrimary
                                        )
                                    }

                                    Surface(
                                        onClick = { viewModel.toggleDisplayLanguage() },
                                        shape = RoundedCornerShape(6.dp),
                                        color = RemoraCardBgElevated,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = badgeText,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraAccentLight
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "⇄",
                                                fontSize = 10.sp,
                                                color = RemoraTextMuted
                                            )
                                        }
                                    }
                                }

                                // Card Center: Prompt or Revealed Text
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f)
                                        .padding(vertical = 16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (!state.isRevealed) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.Center,
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(12.dp))
                                                .clickable { viewModel.revealVerse() }
                                                .padding(24.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(54.dp)
                                                    .clip(CircleShape)
                                                    .background(RemoraAccent.copy(alpha = 0.15f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Icon(
                                                    Icons.Default.Visibility,
                                                    contentDescription = "Reveal",
                                                    tint = RemoraAccent,
                                                    modifier = Modifier.size(28.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(14.dp))
                                            Text(
                                                text = "Recall in your heart",
                                                fontSize = 17.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = RemoraTextPrimary
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "Tap here to check your recall",
                                                fontSize = 13.sp,
                                                color = RemoraTextSecondary
                                            )
                                        }
                                    } else {
                                        // Single translation revealed text (clean, no clutter)
                                        Text(
                                            text = activeText,
                                            fontSize = if (isEnglish) 18.sp else 20.sp,
                                            lineHeight = if (isEnglish) 26.sp else 30.sp,
                                            fontWeight = FontWeight.Normal,
                                            color = RemoraTextPrimary,
                                            textAlign = TextAlign.Start,
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                    }
                                }

                                // Card Bottom: Hint / Stage indicator
                                Text(
                                    text = "Stage ${verse.repetition} · Interval ${verse.interval}d",
                                    fontSize = 12.sp,
                                    color = RemoraTextMuted
                                )
                            }
                        }

                        // Bottom Scoring Bar: 4 Remora Grading Buttons
                        if (state.isRevealed) {
                            Column {
                                Text(
                                    text = "HOW WAS YOUR RECALL?",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = RemoraTextMuted,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    GradeButton(
                                        label = "Blank",
                                        score = 1,
                                        color = GradeBlank,
                                        onClick = { viewModel.gradeCurrent(1) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    GradeButton(
                                        label = "Hard",
                                        score = 3,
                                        color = GradeHard,
                                        onClick = { viewModel.gradeCurrent(3) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    GradeButton(
                                        label = "Good",
                                        score = 4,
                                        color = GradeGood,
                                        onClick = { viewModel.gradeCurrent(4) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    GradeButton(
                                        label = "Easy",
                                        score = 5,
                                        color = GradeEasy,
                                        onClick = { viewModel.gradeCurrent(5) },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        } else {
                            Button(
                                onClick = { viewModel.revealVerse() },
                                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Text("Reveal Verse", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GradeButton(
    label: String,
    score: Int,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.15f),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.4f)),
        modifier = modifier.height(48.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun FinishedState(
    isEmpty: Boolean,
    onRestart: () -> Unit,
    onBrowseBible: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(GradeEasy.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = null,
                tint = GradeEasy,
                modifier = Modifier.size(44.dp)
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = if (isEmpty) "No Verses in Practice Queue" else "All Caught Up!",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = RemoraTextPrimary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (isEmpty)
                "Add memory verses from the Today tab or the Chapter Reader to begin practicing."
            else
                "You've reviewed all scheduled verses for today! The Word of God is firmly rooted in your heart.",
            fontSize = 14.sp,
            color = RemoraTextSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(24.dp))

        if (!isEmpty) {
            Button(
                onClick = onRestart,
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth(0.7f)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Practice Again", fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(10.dp))
        }

        OutlinedButton(
            onClick = onBrowseBible,
            shape = RoundedCornerShape(8.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth(0.7f)
        ) {
            Text("Browse Bible", color = RemoraTextPrimary)
        }
    }
}
