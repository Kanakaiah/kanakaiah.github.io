package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import com.example.telugubible.ui.common.BookCoverImage

@Composable
fun ThemeDrill(
    viewModel: ThemeDrillViewModel,
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
                        text = "Every theme is scheduled",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Nothing in this set is due. ${state.learnedCount} of ${state.totalCount} book themes are secure.",
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
                                IconButton(onClick = onExit, modifier = Modifier.size(32.dp)) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = "Back",
                                        tint = RemoraTextSecondary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "${state.currentIndex + 1} OF ${state.queue.size}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp,
                                        color = RemoraTextMuted
                                    )
                                    Text(
                                        text = "${state.learnedCount}/${state.totalCount} secure",
                                        fontSize = 10.sp,
                                        color = RemoraTextMuted
                                    )
                                }

                                Spacer(modifier = Modifier.size(32.dp))
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Scope Selector Pills
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center
                            ) {
                                ScopePill(
                                    label = "Whole Bible",
                                    selected = state.scope == ThemeScope.ALL,
                                    onClick = { viewModel.setScope(ThemeScope.ALL) }
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                ScopePill(
                                    label = "Old",
                                    selected = state.scope == ThemeScope.OT,
                                    onClick = { viewModel.setScope(ThemeScope.OT) }
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                ScopePill(
                                    label = "New",
                                    selected = state.scope == ThemeScope.NT,
                                    onClick = { viewModel.setScope(ThemeScope.NT) }
                                )
                            }
                        }

                        // Center: Card Prompt and Answer
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            // Cover Art Prompt
                            Box(
                                modifier = Modifier
                                    .width(208.dp)
                                    .height(156.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(RemoraCardBgElevated)
                                    .border(1.dp, RemoraCardBorder, RoundedCornerShape(10.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                BookCoverImage(
                                    bookKey = item.book.key,
                                    contentDescription = item.book.nameEn,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                text = item.book.nameEn,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(4.dp))

                            Text(
                                text = "What is this book's theme?",
                                fontSize = 13.sp,
                                fontStyle = FontStyle.Italic,
                                color = RemoraTextMuted
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            if (state.isRevealed) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = item.book.themeWord,
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp,
                                        color = RemoraAccent,
                                        textAlign = TextAlign.Center
                                    )
                                    if (item.book.keyWord.isNotBlank()) {
                                        Text(
                                            text = item.book.keyWord.uppercase(),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 1.5.sp,
                                            color = RemoraGold,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                    if (item.book.subtitle.isNotBlank()) {
                                        Text(
                                            text = item.book.subtitle,
                                            fontSize = 14.sp,
                                            fontStyle = FontStyle.Italic,
                                            color = RemoraTextSecondary,
                                            textAlign = TextAlign.Center,
                                            modifier = Modifier.padding(horizontal = 24.dp)
                                        )
                                    }
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .width(130.dp)
                                        .height(24.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(RemoraCardBorder)
                                )
                            }
                        }

                        // Bottom Actions: Reveal / Grades & Skip
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            if (!state.isRevealed) {
                                Button(
                                    onClick = { viewModel.revealAnswer() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorderHover)
                                ) {
                                    Text(
                                        text = "Tap to reveal",
                                        fontWeight = FontWeight.SemiBold,
                                        color = RemoraTextSecondary,
                                        fontSize = 14.sp
                                    )
                                }
                            } else {
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

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.skipToNext() }
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Skip",
                                    fontSize = 13.sp,
                                    color = RemoraTextMuted
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = "Skip",
                                    tint = RemoraTextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScopePill(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = if (selected) RemoraAccent else Color.Transparent,
        border = if (!selected) androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder) else null
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (selected) Color.White else RemoraTextMuted,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
        )
    }
}
