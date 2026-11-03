package com.example.telugubible.ui.practice

import androidx.activity.compose.BackHandler
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
import com.example.telugubible.ui.common.ChapterPlateImage
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
    LaunchedEffect(viewModel) {
        if (viewModel.uiState.value.gradingError != null) viewModel.loadSession(forceNew = true)
    }
    val requestExit = {
        if (!state.isGrading) {
            if (!state.isFinished && state.currentIndex > 0) showQuitDialog = true else onExit()
        }
    }
    BackHandler { requestExit() }

    if (showQuitDialog) {
        AlertDialog(
            onDismissRequest = { showQuitDialog = false },
            title = { Text("Leave this session?", color = RemoraTextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Completed reviews stay saved. Unanswered items are not graded.", color = RemoraTextSecondary) },
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
                        .verticalScroll(rememberScrollState())
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
                        text = if (state.outcomes.isNotEmpty()) "Session complete" else "No items in this session",
                        style = MaterialTheme.typography.headlineSmall,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    val summaryText = if (state.outcomes.isNotEmpty()) {
                        "${state.outcomes.size} reviews completed and saved."
                    } else {
                        "There are no items to review right now."
                    }

                    Text(
                        text = summaryText,
                        style = MaterialTheme.typography.bodyLarge,
                        color = RemoraTextSecondary,
                        textAlign = TextAlign.Center
                    )
                    state.sessionWarning?.let {
                        Spacer(Modifier.height(12.dp))
                        Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = onExit,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                    ) {
                        Text("Finish")
                    }
                    if (plan != null && plan.heldBack > 0) {
                        TextButton(onClick = { viewModel.keepGoing() }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                            Text("Practice more (${plan.heldBack} due)")
                        }
                    }
                }
            }
            else -> {
                val plan = state.plan!!
                val item = state.currentItem
                if (item != null) {
                    if (state.isImmersed && item is SessionItem.Verse) {
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
                            index = 0,
                            total = 1,
                            onPrev = {},
                            onNext = {},
                            onExit = viewModel::exitImmersed,
                            isAutoPlaying = state.isTtsSpeaking,
                            onToggleAutoPlay = { viewModel.toggleTts() },
                            onStopPlayback = viewModel::stopTts,
                            onExposure = { seen, total -> viewModel.recordImmersiveExposure(item.verseId, seen, total) },
                            isEnglish = item.textEn.isNotBlank(),
                            readingSettings = state.readingSettings
                        )
                        return@Box
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding(),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        PracticeHeader("Daily practice", "Verses, chapter anchors and book themes",
                            state.currentIndex, plan.items.size, requestExit, exitEnabled = !state.isGrading)
                        if (state.isGrading) Text("Saving review…", style = MaterialTheme.typography.bodyMedium)
                        state.gradingError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
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
                                        onGrade = { viewModel.gradeCurrent(it) },
                                        gradeEnabled = !state.isGrading && state.gradingError == null
                                    )
                                }
                                is SessionItem.Theme -> {
                                    ThemeCard(
                                        item = item,
                                        isRevealed = state.isRevealed,
                                        onReveal = { viewModel.revealAnswer() },
                                        onGrade = { viewModel.gradeCurrent(it) },
                                        gradeEnabled = !state.isGrading && state.gradingError == null
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
internal fun IntroduceCard(
    item: SessionItem.Introduce,
    onReady: () -> Unit,
    artwork: @Composable (SessionItem.Introduce) -> Unit = {
        ChapterPlateImage(
            bookKey = it.bookKey,
            chapter = it.chapter,
            contentDescription = "Chapter illustration",
            modifier = Modifier.fillMaxWidth().aspectRatio(1.7f).clip(RoundedCornerShape(16.dp))
        )
    }
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)
    ) {
        Box(Modifier.widthIn(max = 420.dp).fillMaxWidth()) { artwork(item) }
        Text("New chapter theme", style = MaterialTheme.typography.labelLarge, color = RemoraAccent)
        Text(
            "${item.bookName} ${item.chapter} · ${item.word}",
            style = MaterialTheme.typography.headlineSmall,
            color = RemoraTextPrimary,
            textAlign = TextAlign.Center
        )
        Text(item.scene, style = MaterialTheme.typography.bodyLarge,
            color = RemoraTextSecondary, textAlign = TextAlign.Center)
        if (!item.prevWord.isNullOrBlank()) {
            Text("Follows: ${item.prevWord}", style = MaterialTheme.typography.bodyMedium,
                color = RemoraTextSecondary, textAlign = TextAlign.Center)
        }
        Text("Study the chapter theme, then try recalling it.",
            style = MaterialTheme.typography.bodyMedium, color = RemoraTextSecondary,
            textAlign = TextAlign.Center)
        Button(onClick = onReady, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
            Text("Start practice")
        }
    }
}

@Composable
internal fun AnchorCard(
    item: SessionItem.Anchor,
    input: String,
    isRevealed: Boolean,
    judgement: com.example.telugubible.util.AnchorJudgement?,
    onInputChange: (String) -> Unit,
    onCheck: () -> Unit,
    onGrade: (Int) -> Unit,
    gradeEnabled: Boolean = true
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
                letterSpacing = 1.5.sp,
                color = RemoraTextMuted
            )

            Spacer(modifier = Modifier.height(10.dp))

            when (item.direction) {
                AnchorDirection.N2W -> {
                    Text(
                        text = "Chapter ${item.chapter}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Serif,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "What is the anchor word?",
                        fontSize = 14.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
                AnchorDirection.W2N -> {
                    Text(
                        text = item.word,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraAccent
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Which chapter is anchored by this word?",
                        fontSize = 14.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
                AnchorDirection.P2W -> {
                    ChapterPlateImage(bookKey = item.bookKey, chapter = item.chapter,
                        contentDescription = "Chapter artwork", modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f).clip(RoundedCornerShape(16.dp)))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = item.scene,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Serif,
                        color = RemoraTextPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "What is the anchor word?",
                        fontSize = 14.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

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
                    shape = RoundedCornerShape(16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder,
                        focusedContainerColor = RemoraCardBgElevated,
                        unfocusedContainerColor = RemoraCardBgElevated
                    ),
                    modifier = Modifier.fillMaxWidth(0.92f)
                )

                Spacer(modifier = Modifier.height(18.dp))

                Button(
                    onClick = onCheck,
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent, contentColor = MaterialTheme.colorScheme.onPrimary),
                    modifier = Modifier.fillMaxWidth(0.92f).height(50.dp)
                ) {
                    Text("Check Answer", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                // Modern container-less revealed anchor
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (item.direction != AnchorDirection.P2W) {
                        ChapterPlateImage(bookKey = item.bookKey, chapter = item.chapter,
                            contentDescription = "Chapter artwork", modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f).clip(RoundedCornerShape(16.dp)))
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    Text(
                        text = item.word,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraAccent,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Chapter ${item.chapter} · ${item.scene}",
                        fontSize = 15.sp,
                        color = RemoraTextSecondary,
                        textAlign = TextAlign.Center
                    )

                    if (judgement != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        val verdictText = when (judgement.verdict) {
                            AnchorVerdict.CORRECT -> "Exact match! ✓"
                            AnchorVerdict.NEAR -> "Near match (~)"
                            AnchorVerdict.WRONG -> if (judgement.confusedWith != null) {
                                "Confused with Chapter ${judgement.confusedWith.chapter} (${judgement.confusedWith.word})"
                            } else {
                                "Incorrect"
                            }
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer
                        ) {
                            Text(
                                text = verdictText,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        if (isRevealed) {
            Column(modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) {
                Text("Your result will be saved when you continue.", style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                    enabled = gradeEnabled,
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent, contentColor = MaterialTheme.colorScheme.onPrimary),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                ) {
                    Text("Continue", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
internal fun ThemeCard(
    item: SessionItem.Theme,
    isRevealed: Boolean,
    onReveal: () -> Unit,
    onGrade: (Int) -> Unit,
    gradeEnabled: Boolean = true
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
            // Floating cover art without box container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
                    .clip(RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                BookCoverImage(bookKey = item.bookKey, contentDescription = item.bookName)
            }

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = item.bookName,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Serif,
                color = RemoraTextPrimary
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "What is this book's theme?",
                fontSize = 14.sp,
                fontStyle = FontStyle.Italic,
                color = RemoraTextMuted
            )

            Spacer(modifier = Modifier.height(20.dp))

            if (isRevealed) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = item.themeWord,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RemoraAccent,
                        letterSpacing = 0.5.sp
                    )
                    if (item.keyWord.isNotBlank()) {
                        Text(
                            text = item.keyWord.uppercase(),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraGold,
                            letterSpacing = 1.sp
                        )
                    }
                    if (item.subtitle.isNotBlank()) {
                        Text(
                            text = item.subtitle,
                            fontSize = 14.sp,
                            fontStyle = FontStyle.Italic,
                            color = RemoraTextSecondary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )
                    }
                }
            }
        }

        if (!isRevealed) {
            Button(
                onClick = onReveal,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorderHover)
            ) {
                Text("Tap to reveal", fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = RemoraTextPrimary)
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Continue records Good.", style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(
                onClick = { onGrade(4) },
                enabled = gradeEnabled,
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent, contentColor = MaterialTheme.colorScheme.onPrimary),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
            ) {
                Text("Continue", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
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

            PracticeModePicker(state.activeVerseMode, viewModel::setVerseMode, !state.isGrading && !state.isRevealed)
            Spacer(Modifier.height(12.dp))

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
                        text = remember(rawActive) { practicePassage(rawActive).practiceWords.joinToString(" ") },
                        onComplete = { ratio ->
                            viewModel.updateHintRatio(ratio)
                            viewModel.revealAnswer()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        previouslySeen = (combineExposure(state.firstLetterSeenByVerse[item.verseId],
                            state.immersiveSeenByVerse[item.verseId]) ?: state.firstLetterSeenByVerse[item.verseId])?.seen ?: emptyList(),
                        onSeenChanged = { seen, total -> viewModel.recordFirstLetterSeen(item.verseId, seen, total) }
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
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorderHover)
            ) {
                Text("Show verse", fontWeight = FontWeight.Bold, color = RemoraTextPrimary)
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
                ReviewGrades(state.gradeCeiling, viewModel::gradeCurrent, enabled = !state.isGrading && state.gradingError == null)
            }
        }
    }
}
