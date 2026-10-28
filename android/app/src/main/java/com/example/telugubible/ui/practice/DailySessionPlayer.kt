package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import com.example.telugubible.ui.common.BookCoverImage
import com.example.telugubible.util.AnchorDirection
import com.example.telugubible.util.AnchorVerdict
import com.example.telugubible.util.CueLevel
import com.example.telugubible.util.CueUtils
import com.example.telugubible.util.SessionItem

@Composable
fun DailySessionPlayer(
    viewModel: DailySessionViewModel,
    onExit: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    var showQuitDialog by remember { mutableStateOf(false) }

    if (showQuitDialog) {
        AlertDialog(
            onDismissRequest = { showQuitDialog = false },
            title = { Text("Quit Session?", color = RemoraTextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Your progress on graded items is already saved. You can resume anytime.", color = RemoraTextSecondary) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showQuitDialog = false
                        viewModel.abandonSession()
                        onExit()
                    }
                ) {
                    Text("Quit", color = RemoraDanger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuitDialog = false }) {
                    Text("Continue Session", color = RemoraAccent)
                }
            },
            containerColor = RemoraCardBgElevated
        )
    }

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
            state.isFinished || state.plan?.items.isNullOrEmpty() -> {
                val plan = state.plan
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
                        text = if (state.outcomes.isNotEmpty()) "Session Complete! 🎉" else "All Caught Up!",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    val summaryText = if (state.outcomes.isNotEmpty()) {
                        "You completed ${state.outcomes.size} review items across verses, anchors, and themes."
                    } else {
                        "No items are currently due for review. Outstanding work!"
                    }

                    Text(
                        text = summaryText,
                        fontSize = 14.sp,
                        color = RemoraTextSecondary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    if (plan != null && plan.heldBack > 0) {
                        Button(
                            onClick = { viewModel.keepGoing() },
                            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth(0.75f)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Keep Going (${plan.heldBack} more due)", fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    OutlinedButton(
                        onClick = onExit,
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth(0.75f)
                    ) {
                        Text("Finish & Return", color = RemoraTextPrimary)
                    }
                }
            }
            else -> {
                val plan = state.plan!!
                val item = state.currentItem
                if (item != null) {
                    if (state.activeVerseMode == PracticeMode.IMMERSED && item is SessionItem.Verse) {
                        val userVerse = com.example.telugubible.data.model.UserMemoryVerse(
                            id = item.verseId,
                            bookId = item.bookId,
                            chapter = item.chapter,
                            verse = item.verse,
                            endVerse = item.endVerse,
                            textEn = item.textEn,
                            textTe = item.textTe,
                            bookNameEn = item.bookName,
                            bookNameTe = item.bookName,
                            repetition = item.repetition
                        )
                        ImmersedReader(
                            verse = userVerse,
                            index = state.currentIndex,
                            total = plan.items.size,
                            onPrev = { viewModel.prevStep() },
                            onNext = { viewModel.nextStep() },
                            onExit = { viewModel.setVerseMode(PracticeMode.READ) },
                            isAutoPlaying = state.isTtsSpeaking,
                            onToggleAutoPlay = { viewModel.toggleTts() },
                            isEnglish = item.textEn.isNotBlank()
                        )
                        return@Box
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 72.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Top Header: Segmented Progress Bar & Status Pill
                        Column {
                            // Segmented Kind Progress Bar
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(5.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(RemoraCardBorder),
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                plan.items.forEachIndexed { i, itm ->
                                    val kindColor = when (itm) {
                                        is SessionItem.Verse -> RemoraAccent
                                        is SessionItem.Anchor -> RemoraGold
                                        is SessionItem.Introduce -> RemoraGold.copy(alpha = 0.5f)
                                        is SessionItem.Theme -> Color(0xFF10B981) // Emerald
                                    }
                                    val alpha = if (i <= state.currentIndex) 1.0f else 0.25f
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxHeight()
                                            .background(kindColor.copy(alpha = alpha))
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Top Info Bar
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(
                                    onClick = {
                                        if (state.currentIndex > 0) showQuitDialog = true else onExit()
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = "Back",
                                        tint = RemoraTextSecondary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "${state.currentIndex + 1} OF ${plan.items.size}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp,
                                        color = RemoraTextMuted
                                    )

                                    val daysLate = calculateDaysLate(item.dueAt)
                                    if (daysLate >= 3) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(
                                            shape = RoundedCornerShape(4.dp),
                                            color = GradeHard.copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                text = "$daysLate DAYS LATE",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = GradeHard,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                // Kind Tag
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = RemoraCardBgElevated,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                                ) {
                                    Text(
                                        text = item.kind.uppercase(),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = when (item) {
                                            is SessionItem.Verse -> RemoraAccent
                                            is SessionItem.Anchor -> RemoraGold
                                            is SessionItem.Introduce -> RemoraGold
                                            is SessionItem.Theme -> Color(0xFF10B981)
                                        },
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }

                        // Middle Content based on Item Kind
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .padding(vertical = 12.dp)
                        ) {
                            when (item) {
                                is SessionItem.Introduce -> {
                                    IntroduceCard(item = item, onReady = { viewModel.advanceIntroduce() })
                                }
                                is SessionItem.Anchor -> {
                                    AnchorCard(
                                        item = item,
                                        input = state.anchorInput,
                                        isRevealed = state.isRevealed,
                                        judgement = state.anchorJudgement,
                                        onInputChange = { viewModel.setAnchorInput(it) },
                                        onCheck = { viewModel.checkAnchorAnswer() },
                                        onGrade = { viewModel.gradeCurrent(it) }
                                    )
                                }
                                is SessionItem.Theme -> {
                                    ThemeCard(
                                        item = item,
                                        isRevealed = state.isRevealed,
                                        onReveal = { viewModel.revealAnswer() },
                                        onGrade = { viewModel.gradeCurrent(it) }
                                    )
                                }
                                is SessionItem.Verse -> {
                                    VerseCard(
                                        item = item,
                                        state = state,
                                        viewModel = viewModel
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun calculateDaysLate(dueAt: Long): Int {
    if (dueAt >= Long.MAX_VALUE) return 0
    val now = System.currentTimeMillis()
    if (dueAt >= now) return 0
    return ((now - dueAt) / (24 * 60 * 60 * 1000L)).toInt()
}

@Composable
private fun IntroduceCard(
    item: SessionItem.Introduce,
    onReady: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .width(208.dp)
                .height(156.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(RemoraCardBgElevated)
                .border(1.dp, RemoraCardBorder, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            BookCoverImage(bookKey = item.bookKey, contentDescription = item.bookName)
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "INTRODUCING CHAPTER ${item.chapter}",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = RemoraGold
        )

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = item.bookName,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = RemoraTextPrimary
        )

        Spacer(modifier = Modifier.height(14.dp))

        Surface(
            shape = RoundedCornerShape(8.dp),
            color = RemoraCardBgElevated,
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
            modifier = Modifier.fillMaxWidth(0.9f)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = item.word,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    color = RemoraAccent,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = item.scene,
                    fontSize = 14.sp,
                    color = RemoraTextSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp
                )

                if (!item.prevWord.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Follows: ${item.prevWord}",
                        fontSize = 12.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextMuted
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onReady,
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
            modifier = Modifier.fillMaxWidth(0.85f).height(48.dp)
        ) {
            Text("Got it — Start Drill", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun AnchorCard(
    item: SessionItem.Anchor,
    input: String,
    isRevealed: Boolean,
    judgement: com.example.telugubible.util.AnchorJudgement?,
    onInputChange: (String) -> Unit,
    onCheck: () -> Unit,
    onGrade: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = item.bookName.uppercase(),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                color = RemoraTextMuted
            )

            Spacer(modifier = Modifier.height(6.dp))

            when (item.direction) {
                AnchorDirection.N2W -> {
                    Text(
                        text = "Chapter ${item.chapter}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "What is the anchor word?",
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
                AnchorDirection.W2N -> {
                    Text(
                        text = item.word,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraAccent
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Which chapter is anchored by this word?",
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
                AnchorDirection.P2W -> {
                    Text(
                        text = item.scene,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "What is the anchor word?",
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            if (!isRevealed) {
                OutlinedTextField(
                    value = input,
                    onValueChange = onInputChange,
                    singleLine = true,
                    placeholder = {
                        Text(
                            text = if (item.direction == AnchorDirection.W2N) "Chapter number" else "Type anchor word...",
                            color = RemoraTextMuted
                        )
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = if (item.direction == AnchorDirection.W2N) KeyboardType.Number else KeyboardType.Text,
                        imeAction = ImeAction.Done,
                        capitalization = KeyboardCapitalization.Characters
                    ),
                    keyboardActions = KeyboardActions(onDone = { onCheck() }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder,
                        focusedContainerColor = RemoraCardBgElevated,
                        unfocusedContainerColor = RemoraCardBgElevated
                    ),
                    modifier = Modifier.fillMaxWidth(0.9f)
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onCheck,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    modifier = Modifier.fillMaxWidth(0.9f).height(46.dp)
                ) {
                    Text("Check Answer", fontWeight = FontWeight.Bold)
                }
            } else {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RemoraCardBgElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth(0.9f)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Anchor: ${item.word}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Chapter ${item.chapter} · ${item.scene}",
                            fontSize = 13.sp,
                            color = RemoraTextSecondary,
                            textAlign = TextAlign.Center
                        )

                        if (judgement != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            val verdictText = when (judgement.verdict) {
                                AnchorVerdict.CORRECT -> "Exact match! ✓"
                                AnchorVerdict.NEAR -> "Near match (~)"
                                AnchorVerdict.WRONG -> if (judgement.confusedWith != null) {
                                    "Confused with Chapter ${judgement.confusedWith.chapter} (${judgement.confusedWith.word})"
                                } else {
                                    "Incorrect"
                                }
                            }
                            val verdictColor = when (judgement.verdict) {
                                AnchorVerdict.CORRECT -> GradeEasy
                                AnchorVerdict.NEAR -> GradeHard
                                AnchorVerdict.WRONG -> GradeBlank
                            }
                            Text(text = verdictText, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = verdictColor)
                        }
                    }
                }
            }
        }

        if (isRevealed) {
            Column(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Button(
                    onClick = {
                        val score = when (judgement?.verdict) {
                            AnchorVerdict.CORRECT -> 5
                            AnchorVerdict.NEAR -> 4
                            AnchorVerdict.WRONG -> 2
                            null -> 4
                        }
                        onGrade(score)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(46.dp)
                ) {
                    Text("Continue", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ThemeCard(
    item: SessionItem.Theme,
    isRevealed: Boolean,
    onReveal: () -> Unit,
    onGrade: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .width(180.dp)
                    .height(135.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(RemoraCardBgElevated)
                    .border(1.dp, RemoraCardBorder, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                BookCoverImage(bookKey = item.bookKey, contentDescription = item.bookName)
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = item.bookName,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = RemoraTextPrimary
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "What is this book's theme?",
                fontSize = 13.sp,
                fontStyle = FontStyle.Italic,
                color = RemoraTextMuted
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (isRevealed) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = item.themeWord,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraAccent
                    )
                    if (item.keyWord.isNotBlank()) {
                        Text(
                            text = item.keyWord.uppercase(),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraGold
                        )
                    }
                    if (item.subtitle.isNotBlank()) {
                        Text(
                            text = item.subtitle,
                            fontSize = 13.sp,
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
                        .width(120.dp)
                        .height(24.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(RemoraCardBorder)
                )
            }
        }

        if (!isRevealed) {
            Button(
                onClick = onReveal,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorderHover)
            ) {
                Text("Tap to reveal", fontWeight = FontWeight.SemiBold, color = RemoraTextSecondary)
            }
        } else {
            Button(
                onClick = { onGrade(4) },
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(46.dp)
            ) {
                Text("Continue", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun VerseCard(
    item: SessionItem.Verse,
    state: DailySessionUiState,
    viewModel: DailySessionViewModel
) {
    val rawActive = item.textEn.ifBlank { item.textTe }
    val activeText = rawActive
        .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<[^>]+>"), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .trim()
    val isEnglish = item.textEn.isNotBlank()
    val cuedText = remember(activeText) {
        CueUtils.cueString(activeText, CueLevel.fromRepetition(item.repetition))
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            // Verse Reference
            Text(
                text = "${item.bookName} ${item.displayRef}",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = RemoraTextPrimary
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Mode Selector Pills
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PracticeMode.MENU_MODES.forEach { mode ->
                    val isSelected = state.activeVerseMode == mode
                    Surface(
                        onClick = { viewModel.setVerseMode(mode) },
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) RemoraAccent.copy(alpha = 0.2f) else RemoraCardBgElevated,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) RemoraAccent else RemoraCardBorder
                        )
                    ) {
                        Text(
                            text = mode.label,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) RemoraAccentLight else RemoraTextMuted,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Verse Drill View
            when (state.activeVerseMode) {
                PracticeMode.TYPING -> {
                    TypingMode(
                        text = activeText,
                        onAttempt = { accuracy, committed ->
                            viewModel.recordTypingAttempt(committed, accuracy)
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                PracticeMode.FIRST_LETTER -> {
                    FirstLetterMode(
                        text = activeText,
                        onComplete = { ratio ->
                            viewModel.updateHintRatio(ratio)
                            viewModel.revealAnswer()
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                PracticeMode.ERASER -> {
                    EraserMode(
                        text = activeText,
                        onComplete = { ratio ->
                            viewModel.updateEraserRatio(ratio)
                            viewModel.revealAnswer()
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                PracticeMode.SCRAMBLE -> {
                    ScrambleMode(
                        text = activeText,
                        onComplete = { acc ->
                            viewModel.recordScrambleAttempt(acc)
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                PracticeMode.SPEECH -> {
                    SpeechMode(
                        text = activeText,
                        languageCode = if (isEnglish) "en-US" else "te-IN",
                        onAttempt = { acc, committed ->
                            viewModel.recordSpeechAttempt(acc, committed)
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                PracticeMode.LISTEN, PracticeMode.READ, PracticeMode.IMMERSED -> {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = RemoraCardBgElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(modifier = Modifier.padding(18.dp)) {
                            // Maximize to Immerse button
                            Surface(
                                onClick = { viewModel.setVerseMode(PracticeMode.IMMERSED) },
                                shape = CircleShape,
                                color = RemoraAccent.copy(alpha = 0.15f),
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(
                                        Icons.Default.Fullscreen,
                                        contentDescription = "Immerse Reading",
                                        tint = RemoraAccent,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            if (state.isRevealed) {
                                Text(
                                    text = activeText,
                                    fontSize = 16.sp,
                                    lineHeight = 24.sp,
                                    color = RemoraTextPrimary,
                                    modifier = Modifier.padding(end = 36.dp)
                                )
                            } else {
                                Text(
                                    text = cuedText,
                                    fontSize = 16.sp,
                                    lineHeight = 24.sp,
                                    color = RemoraTextMuted,
                                    modifier = Modifier.padding(end = 36.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (!state.isRevealed && state.activeVerseMode == PracticeMode.READ) {
            Button(
                onClick = { viewModel.revealAnswer() },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorderHover)
            ) {
                Text("Show Answer", fontWeight = FontWeight.Bold, color = RemoraTextPrimary)
            }
        } else if (state.isRevealed) {
            Column(modifier = Modifier.fillMaxWidth()) {
                if (state.activeVerseMode == PracticeMode.SPEECH && state.verseAccuracy != null) {
                    val acc = state.verseAccuracy
                    Text(
                        text = "Recitation accuracy: $acc%",
                        fontSize = 12.sp,
                        color = if (acc >= 75) GradeEasy else RemoraGold,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                Button(
                    onClick = { viewModel.gradeCurrent(4) },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(46.dp)
                ) {
                    Text(
                        text = if (state.currentIndex >= (state.plan?.items?.size ?: 0) - 1) "Complete Session" else "Next Question",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
