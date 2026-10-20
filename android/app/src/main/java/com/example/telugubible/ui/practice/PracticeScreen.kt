package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import com.example.telugubible.util.CueUtils

enum class PracticeSubject {
    SESSION,
    VERSES,
    ANCHORS,
    THEMES
}

@Composable
fun PracticeScreen(
    viewModel: PracticeViewModel,
    onNavigateToBible: () -> Unit,
    initialSubject: PracticeSubject = PracticeSubject.SESSION,
    modifier: Modifier = Modifier
) {
    var activeSubject by remember(initialSubject) { mutableStateOf(initialSubject) }

    if (activeSubject == PracticeSubject.SESSION) {
        val sessionViewModel: DailySessionViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
        DailySessionPlayer(
            viewModel = sessionViewModel,
            onExit = { activeSubject = PracticeSubject.VERSES },
            modifier = modifier
        )
        return
    }

    if (activeSubject == PracticeSubject.ANCHORS) {
        val anchorViewModel: AnchorDrillViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
        AnchorDrill(
            viewModel = anchorViewModel,
            onExit = { activeSubject = PracticeSubject.VERSES },
            modifier = modifier
        )
        return
    }

    if (activeSubject == PracticeSubject.THEMES) {
        val themeViewModel: ThemeDrillViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
        ThemeDrill(
            viewModel = themeViewModel,
            onExit = { activeSubject = PracticeSubject.VERSES },
            modifier = modifier
        )
        return
    }

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
                    onBrowseBible = onNavigateToBible,
                    onPracticeAnchors = { activeSubject = PracticeSubject.ANCHORS },
                    onPracticeThemes = { activeSubject = PracticeSubject.THEMES }
                )
            }
            else -> {
                val verse = state.currentVerse
                if (verse != null) {
                    val isEnglish = state.displayLanguage == DisplayLanguage.ENGLISH
                    val bookName = if (isEnglish) verse.bookNameEn else verse.bookNameTe
                    val badgeText = if (isEnglish) "BSB" else "IRV"
                    val activeText = (if (isEnglish) verse.textEn else verse.textTe)
                        ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""

                    if (state.activeMode == PracticeMode.IMMERSED) {
                        ImmersedReader(
                            verse = verse,
                            index = state.currentIndex,
                            total = state.verses.size,
                            onPrev = { viewModel.prevVerse() },
                            onNext = { viewModel.nextVerse() },
                            onExit = { viewModel.setPracticeMode(PracticeMode.FLASHCARD) },
                            isAutoPlaying = state.isTtsSpeaking,
                            onToggleAutoPlay = { viewModel.toggleTts() },
                            isEnglish = isEnglish,
                            bionicReading = state.bionicReading,
                            recallMasking = state.recallMasking,
                            serifTypography = state.serifTypography
                        )
                        return@Box
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(bottom = 72.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Top Header: Progress Indicator & Mode Switcher
                        Column {
                            // Subject Switcher (Verses vs Chapter Anchors)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 12.dp),
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = RemoraCardBgElevated,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .horizontalScroll(rememberScrollState())
                                            .padding(3.dp)
                                    ) {
                                        Surface(
                                            onClick = { activeSubject = PracticeSubject.SESSION },
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color.Transparent
                                        ) {
                                            Text(
                                                text = "Daily Session 🔥",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraGold,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                            )
                                        }
                                        Surface(
                                            onClick = { /* already in verses */ },
                                            shape = RoundedCornerShape(16.dp),
                                            color = RemoraAccent
                                        ) {
                                            Text(
                                                text = "Memory Verses",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                            )
                                        }
                                        Surface(
                                            onClick = { activeSubject = PracticeSubject.ANCHORS },
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color.Transparent
                                        ) {
                                            Text(
                                                text = "Chapter Anchors",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraTextSecondary,
                                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp)
                                            )
                                        }
                                        Surface(
                                            onClick = { activeSubject = PracticeSubject.THEMES },
                                            shape = RoundedCornerShape(16.dp),
                                            color = Color.Transparent
                                        ) {
                                            Text(
                                                text = "Book Themes",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraTextSecondary,
                                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp)
                                            )
                                        }
                                    }
                                }
                            }

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

                            Spacer(modifier = Modifier.height(10.dp))

                            // Mode Selector Pills
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                PracticeMode.entries.forEach { mode ->
                                    val isSelected = state.activeMode == mode
                                    Surface(
                                        onClick = { viewModel.setPracticeMode(mode) },
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
                        }

                        // Center Memory Content
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
                                    .padding(20.dp),
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                // Card Top: Reference + Translation Toggle Badge
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

                                // Card Center: Active Drill Mode
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f)
                                        .padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    when (state.activeMode) {
                                        PracticeMode.TYPING -> {
                                            TypingMode(
                                                text = activeText,
                                                onAttempt = { accuracy, committed ->
                                                    viewModel.recordAttempt(accuracy, committed)
                                                },
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }
                                        PracticeMode.FIRST_LETTER -> {
                                            FirstLetterMode(
                                                text = activeText,
                                                onComplete = { ratio ->
                                                    viewModel.recordFirstLetterAttempt(ratio)
                                                },
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }
                                        PracticeMode.ERASER -> {
                                            EraserMode(
                                                text = activeText,
                                                onComplete = { ratio ->
                                                    viewModel.recordEraserAttempt(ratio)
                                                },
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }
                                        PracticeMode.SCRAMBLE -> {
                                            ScrambleMode(
                                                text = activeText,
                                                onComplete = { acc ->
                                                    viewModel.recordScrambleAttempt(acc)
                                                },
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }
                                        PracticeMode.SPEECH -> {
                                            SpeechMode(
                                                text = activeText,
                                                languageCode = if (isEnglish) "en-US" else "te-IN",
                                                onAttempt = { acc, committed ->
                                                    viewModel.recordSpeechAttempt(acc, committed)
                                                },
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }
                                        else -> {
                                            // FLASHCARD (and default for other drill modes)
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
                                    }
                                }

                                // Card Bottom: Stage indicator
                                Text(
                                    text = "Stage ${verse.repetition} · Interval ${verse.interval}d",
                                    fontSize = 12.sp,
                                    color = RemoraTextMuted
                                )
                            }
                        }

                        // Bottom Scoring Bar: 4 Remora Grading Buttons
                        if (state.isRevealed) {
                            val suggested = state.modeAccuracy?.let { CueUtils.suggestedScore(it) }
                            val suggestedLabel = suggested?.let { CueUtils.suggestedLabel(it) }

                            Column {
                                if (state.modeAccuracy != null && suggestedLabel != null) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(bottom = 6.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "${state.modeAccuracy}% of words matched",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = RemoraTextSecondary
                                        )
                                        Text(
                                            text = "Suggested: $suggestedLabel",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = RemoraAccentLight
                                        )
                                    }
                                } else if (state.gradeCeiling < 5) {
                                    val ceilingName = when (state.gradeCeiling) {
                                        4 -> "Good"
                                        3 -> "Hard"
                                        else -> "Blank"
                                    }
                                    val reason = when (state.activeMode) {
                                        PracticeMode.ERASER -> "Words still visible"
                                        PracticeMode.SCRAMBLE -> "Word order mistakes"
                                        PracticeMode.SPEECH -> "Recitation accuracy ${state.modeAccuracy ?: 0}%"
                                        else -> "Hint used"
                                    }
                                    Text(
                                        text = "$reason — best available grade is $ceilingName.",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = GradeHard,
                                        modifier = Modifier.padding(bottom = 6.dp)
                                    )
                                } else {
                                    Text(
                                        text = "HOW WAS YOUR RECALL?",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp,
                                        color = RemoraTextMuted,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    GradeButton(
                                        label = "Blank",
                                        score = 1,
                                        color = GradeBlank,
                                        isSuggested = suggested == 1,
                                        enabled = 1 <= state.gradeCeiling,
                                        onClick = { viewModel.gradeCurrent(1) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    GradeButton(
                                        label = "Hard",
                                        score = 3,
                                        color = GradeHard,
                                        isSuggested = suggested == 3,
                                        enabled = 3 <= state.gradeCeiling,
                                        onClick = { viewModel.gradeCurrent(3) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    GradeButton(
                                        label = "Good",
                                        score = 4,
                                        color = GradeGood,
                                        isSuggested = suggested == 4,
                                        enabled = 4 <= state.gradeCeiling,
                                        onClick = { viewModel.gradeCurrent(4) },
                                        modifier = Modifier.weight(1f)
                                    )
                                    GradeButton(
                                        label = "Easy",
                                        score = 5,
                                        color = GradeEasy,
                                        isSuggested = suggested == 5,
                                        enabled = 5 <= state.gradeCeiling,
                                        onClick = { viewModel.gradeCurrent(5) },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        } else {
                            if (state.activeMode == PracticeMode.FLASHCARD) {
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
}

@Composable
private fun GradeButton(
    label: String,
    score: Int,
    color: Color,
    isSuggested: Boolean = false,
    enabled: Boolean = true,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val opacity = if (enabled) 1.0f else 0.25f

    Surface(
        onClick = { if (enabled) onClick() },
        enabled = enabled,
        shape = RoundedCornerShape(8.dp),
        color = if (isSuggested) color.copy(alpha = 0.28f * opacity) else color.copy(alpha = 0.15f * opacity),
        border = androidx.compose.foundation.BorderStroke(
            if (isSuggested) 2.dp else 1.dp,
            if (isSuggested) color.copy(alpha = opacity) else color.copy(alpha = 0.4f * opacity)
        ),
        modifier = modifier.height(48.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = label,
                fontSize = 13.sp,
                fontWeight = if (isSuggested) FontWeight.ExtraBold else FontWeight.Bold,
                color = color.copy(alpha = opacity)
            )
        }
    }
}

@Composable
private fun FinishedState(
    isEmpty: Boolean,
    onRestart: () -> Unit,
    onBrowseBible: () -> Unit,
    onPracticeAnchors: () -> Unit,
    onPracticeThemes: () -> Unit
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

        Button(
            onClick = onPracticeAnchors,
            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent.copy(alpha = 0.2f)),
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraAccent),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth(0.7f)
        ) {
            Text("Practice Chapter Anchors 🎯", color = RemoraAccentLight, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(10.dp))

        Button(
            onClick = onPracticeThemes,
            colors = ButtonDefaults.buttonColors(containerColor = RemoraGold.copy(alpha = 0.2f)),
            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraGold),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth(0.7f)
        ) {
            Text("Practice Book Themes 📖", color = RemoraGold, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(10.dp))

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
