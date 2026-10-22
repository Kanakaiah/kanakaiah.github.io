package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import com.example.telugubible.util.AnchorDirection
import com.example.telugubible.util.AnchorVerdict

@Composable
fun AnchorDrill(
    viewModel: AnchorDrillViewModel,
    onExit: () -> Unit,
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
            state.isFinished || state.queue.isEmpty() -> {
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
                        text = "Anchor Drill Complete!",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "You've reviewed all chapter anchors for this queue.",
                        fontSize = 14.sp,
                        color = RemoraTextSecondary,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { viewModel.restart() },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Practice Again", fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = onExit,
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                    ) {
                        Text("Back to Verses", color = RemoraTextPrimary)
                    }
                }
            }
            else -> {
                val item = state.currentItem
                if (item != null) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 72.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Header
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = onExit, modifier = Modifier.size(32.dp)) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowBack,
                                            contentDescription = "Back",
                                            tint = RemoraTextSecondary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "CHAPTER ANCHOR DRILL",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp,
                                        color = RemoraAccent
                                    )
                                }
                                Text(
                                    text = "${state.currentIndex + 1} of ${state.queue.size}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextSecondary
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            val progress = (state.currentIndex.toFloat() / state.queue.size.coerceAtLeast(1))
                            LinearProgressIndicator(
                                progress = { progress },
                                color = RemoraAccent,
                                trackColor = RemoraCardBorder,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            // Direction selector pills
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf(
                                    AnchorDirection.N2W to "Number → Word",
                                    AnchorDirection.W2N to "Word → Number",
                                    AnchorDirection.P2W to "Plate → Word"
                                ).forEach { (dir, label) ->
                                    val isSelected = state.direction == dir
                                    Surface(
                                        onClick = { viewModel.setDirection(dir) },
                                        shape = RoundedCornerShape(16.dp),
                                        color = if (isSelected) RemoraAccent.copy(alpha = 0.2f) else RemoraCardBgElevated,
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) RemoraAccent else RemoraCardBorder
                                        )
                                    ) {
                                        Text(
                                            text = label,
                                            fontSize = 11.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) RemoraAccentLight else RemoraTextMuted,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Center Prompt Card
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .padding(vertical = 12.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(20.dp)
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.SpaceBetween,
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                // Book & Direction Prompt
                                val promptText = when (state.direction) {
                                    AnchorDirection.N2W -> "What anchors this chapter?"
                                    AnchorDirection.W2N -> "Which chapter is anchored by this word?"
                                    AnchorDirection.P2W -> "What anchors this chapter?"
                                }

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = item.bookName,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = RemoraAccentLight
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = promptText,
                                        fontSize = 12.sp,
                                        color = RemoraTextMuted
                                    )
                                }

                                // Main Target Display
                                Box(
                                    modifier = Modifier.padding(vertical = 24.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    when (state.direction) {
                                        AnchorDirection.N2W -> {
                                            Text(
                                                text = "Chapter ${item.chapter}",
                                                fontSize = 32.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraTextPrimary
                                            )
                                        }
                                        AnchorDirection.W2N -> {
                                            Text(
                                                text = item.word,
                                                fontSize = 32.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraTextPrimary
                                            )
                                        }
                                        AnchorDirection.P2W -> {
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = RemoraCardBgElevated,
                                                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                                                modifier = Modifier.size(160.dp, 120.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Text(
                                                        text = "${item.chapter}",
                                                        fontSize = 44.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = RemoraTextMuted.copy(alpha = 0.4f)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Interactive Answer Area
                                if (!state.isRevealed) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        OutlinedTextField(
                                            value = state.typedInput,
                                            onValueChange = { viewModel.onInputChange(it) },
                                            placeholder = {
                                                Text(
                                                    text = if (state.direction == AnchorDirection.W2N)
                                                        "Type chapter number…"
                                                    else
                                                        "Type anchor word…",
                                                    color = RemoraTextMuted
                                                )
                                            },
                                            keyboardOptions = KeyboardOptions(
                                                keyboardType = if (state.direction == AnchorDirection.W2N)
                                                    KeyboardType.Number
                                                else
                                                    KeyboardType.Text,
                                                capitalization = KeyboardCapitalization.Characters,
                                                imeAction = ImeAction.Done
                                            ),
                                            keyboardActions = KeyboardActions(
                                                onDone = {
                                                    if (state.typedInput.isNotBlank()) viewModel.checkAnswer()
                                                }
                                            ),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedContainerColor = RemoraCardBgElevated,
                                                unfocusedContainerColor = RemoraCardBgElevated,
                                                focusedBorderColor = RemoraAccent,
                                                unfocusedBorderColor = RemoraCardBorder,
                                                focusedTextColor = RemoraTextPrimary,
                                                unfocusedTextColor = RemoraTextPrimary
                                            ),
                                            singleLine = true,
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        )

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Button(
                                                onClick = { viewModel.checkAnswer() },
                                                enabled = state.typedInput.isNotBlank(),
                                                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Text("Check", fontWeight = FontWeight.Bold)
                                            }
                                            OutlinedButton(
                                                onClick = { viewModel.reveal() },
                                                shape = RoundedCornerShape(8.dp),
                                                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                                            ) {
                                                Text("Reveal", color = RemoraTextSecondary)
                                            }
                                        }
                                    }
                                } else {
                                    // Post-Reveal & Judgement Display
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        val j = state.judgement
                                        if (j != null) {
                                            val (bannerBg, bannerBorder, bannerColor, bannerText) = when (j.verdict) {
                                                AnchorVerdict.CORRECT -> Quadruple(
                                                    GradeEasy.copy(alpha = 0.15f),
                                                    GradeEasy.copy(alpha = 0.5f),
                                                    GradeEasy,
                                                    "Exact match!"
                                                )
                                                AnchorVerdict.NEAR -> Quadruple(
                                                    GradeHard.copy(alpha = 0.15f),
                                                    GradeHard.copy(alpha = 0.5f),
                                                    GradeHard,
                                                    "Near miss! Inflection or minor typo"
                                                )
                                                AnchorVerdict.WRONG -> Quadruple(
                                                    GradeBlank.copy(alpha = 0.15f),
                                                    GradeBlank.copy(alpha = 0.5f),
                                                    GradeBlank,
                                                    if (j.confusedWith != null)
                                                        "That is Chapter ${j.confusedWith.chapter} (${j.confusedWith.word}) in this book!"
                                                    else
                                                        "Expected: ${if (state.direction == AnchorDirection.W2N) item.chapter else item.word}"
                                                )
                                            }

                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = bannerBg,
                                                border = androidx.compose.foundation.BorderStroke(1.dp, bannerBorder),
                                                modifier = Modifier.fillMaxWidth()
                                            ) {
                                                Text(
                                                    text = bannerText,
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = bannerColor,
                                                    textAlign = TextAlign.Center,
                                                    modifier = Modifier.padding(10.dp)
                                                )
                                            }
                                        }

                                        // Full revealed anchor details
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = RemoraCardBgElevated,
                                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Text(
                                                        text = "Chapter ${item.chapter}: ${item.word}",
                                                        fontSize = 16.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = RemoraTextPrimary
                                                    )
                                                    Text(
                                                        text = "Stage ${item.repetition}",
                                                        fontSize = 11.sp,
                                                        color = RemoraTextMuted
                                                    )
                                                }
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = item.scene,
                                                    fontSize = 13.sp,
                                                    lineHeight = 18.sp,
                                                    color = RemoraTextSecondary
                                                )
                                            }
                                        }
                                    }
                                }

                                Text(
                                    text = "Stage ${item.repetition} · Interval ${item.interval}d",
                                    fontSize = 11.sp,
                                    color = RemoraTextMuted,
                                    modifier = Modifier.padding(top = 10.dp)
                                )
                            }
                        }

                        // Bottom Scoring Bar: 4 Remora Grading Buttons
                        if (state.isRevealed) {
                            val suggested = state.judgement?.score

                            Column {
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { viewModel.gradeCurrent(4) },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp)
                                ) {
                                    Text("Next", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
