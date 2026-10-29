package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Refresh
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
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.theme.*

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
    onExitToToday: () -> Unit = {},
    initialSubject: PracticeSubject = PracticeSubject.VERSES,
    initialAnchorBookId: Int? = null,
    modifier: Modifier = Modifier
) {
    var activeSubject by remember(initialSubject, initialAnchorBookId) { mutableStateOf(initialSubject) }

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
        LaunchedEffect(initialAnchorBookId) {
            if (initialAnchorBookId != null) {
                anchorViewModel.loadData(initialAnchorBookId)
            }
        }
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
            onExit = {
                activeSubject = PracticeSubject.VERSES
                onExitToToday()
            },
            modifier = modifier
        )
        return
    }

    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
            .padding(horizontal = 16.dp, vertical = 12.dp)
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
                    val rawText = (if (isEnglish) verse.textEn else verse.textTe)
                        ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""
                    val activeText = rawText
                        .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
                        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
                        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
                        .replace(Regex("<[^>]+>"), "")
                        .replace("&nbsp;", " ")
                        .replace("&amp;", "&")
                        .replace("&quot;", "\"")
                        .replace("&#39;", "'")
                        .trim()

                    val verseRef = "$bookName ${verse.chapter}:${verse.verse}"

                    if (state.activeMode == PracticeMode.IMMERSED) {
                        ImmersedReader(
                            verse = verse,
                            index = state.currentIndex,
                            total = state.verses.size,
                            onPrev = { viewModel.prevVerse() },
                            onNext = { viewModel.nextVerse() },
                            onExit = { viewModel.setPracticeMode(PracticeMode.SCRAMBLE) },
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
                            .navigationBarsPadding()
                            .padding(bottom = 8.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Top Header (✕, Reference, Subtitle, Mode Pills, Segmented Dash)
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Row with Close ✕ | Centered Title & Subtitle | Language Switcher
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(
                                    onClick = onExitToToday,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Exit to Today",
                                        tint = RemoraTextPrimary,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }

                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = verseRef,
                                        fontSize = 19.sp,
                                        fontFamily = FontFamily.Serif,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextPrimary,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "${state.currentCollectionTitle} · ${state.currentIndex + 1} of ${state.verses.size} · ${viewModel.getRetentionStage(verse)}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = RemoraTextSecondary,
                                        textAlign = TextAlign.Center
                                    )
                                }

                                Spacer(modifier = Modifier.size(36.dp))
                            }

                            // Horizontal Mode Selector Pills
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                PracticeMode.MENU_MODES.forEach { mode ->
                                    val isSelected = state.activeMode == mode
                                    Surface(
                                        onClick = { viewModel.setPracticeMode(mode) },
                                        shape = RoundedCornerShape(20.dp),
                                        color = if (isSelected) RemoraAccent else Color(0xFF1E1B17),
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isSelected) RemoraAccent else Color(0xFF332D24)
                                        )
                                    ) {
                                        Text(
                                            text = mode.label,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) Color(0xFF14120E) else RemoraTextSecondary,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                                        )
                                    }
                                }
                            }

                            // Segmented Dash Progress Bar (positioned directly under mode pills)
                            if (state.verses.isNotEmpty()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 2.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    state.verses.indices.forEach { idx ->
                                        val isFilled = idx <= state.currentIndex
                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(4.dp)
                                                .clip(RoundedCornerShape(2.dp))
                                                .background(if (isFilled) RemoraAccent else Color(0xFF2C2720))
                                        )
                                    }
                                }
                            }
                        }

                        // Drill / Working Area
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .padding(vertical = 10.dp)
                        ) {
                            when (state.activeMode) {
                                PracticeMode.SCRAMBLE -> {
                                    ScrambleMode(
                                        text = activeText,
                                        onComplete = { acc ->
                                            viewModel.recordScrambleAttempt(acc)
                                            viewModel.gradeCurrent(4)
                                        },
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                                PracticeMode.LISTEN -> {
                                    ListenMode(
                                        verseText = activeText,
                                        isEnglish = isEnglish,
                                        speed = state.audioSpeed,
                                        repeatCount = state.audioRepeatCount,
                                        hideText = state.hideTextInAudio,
                                        autoAdvance = state.autoAdvanceAudio,
                                        onSpeedChange = { viewModel.setAudioSpeed(it) },
                                        onRepeatChange = { viewModel.setAudioRepeatCount(it) },
                                        onHideTextToggle = { viewModel.setHideTextInAudio(it) },
                                        onAutoAdvanceToggle = { viewModel.setAutoAdvanceAudio(it) },
                                        onPrev = { viewModel.prevVerse() },
                                        onNext = { viewModel.nextVerse() },
                                        onComplete = { viewModel.gradeCurrent(4) },
                                        ttsManager = viewModel.getTtsManager(),
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
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
                                PracticeMode.READ, PracticeMode.IMMERSED -> {
                                    Surface(
                                        shape = RoundedCornerShape(16.dp),
                                        color = RemoraCardBgElevated,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxSize()
                                                .padding(20.dp),
                                            verticalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = activeText,
                                                fontSize = if (isEnglish) 20.sp else 22.sp,
                                                lineHeight = if (isEnglish) 30.sp else 34.sp,
                                                fontFamily = FontFamily.Serif,
                                                color = RemoraTextPrimary,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .verticalScroll(rememberScrollState())
                                            )

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                OutlinedButton(
                                                    onClick = { viewModel.prevVerse() },
                                                    shape = RoundedCornerShape(8.dp),
                                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38322A))
                                                ) {
                                                    Text("Previous", color = RemoraTextSecondary)
                                                }

                                                Button(
                                                    onClick = { viewModel.nextVerse() },
                                                    shape = RoundedCornerShape(8.dp),
                                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
                                                ) {
                                                    Text("Next", color = Color(0xFF14120E), fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Bottom Continue Bar (For Typing, First Letters, Blanks, Speech when completed)
                        if (state.activeMode != PracticeMode.LISTEN && state.activeMode != PracticeMode.SCRAMBLE && state.activeMode != PracticeMode.READ) {
                            if (state.isRevealed) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    if (state.modeAccuracy != null) {
                                        Text(
                                            text = "${state.modeAccuracy}% accuracy",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = RemoraTextSecondary,
                                            modifier = Modifier.padding(bottom = 6.dp)
                                        )
                                    }

                                    Button(
                                        onClick = { viewModel.gradeCurrent(4) },
                                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(48.dp)
                                    ) {
                                        Text(
                                            text = if (state.currentIndex >= state.verses.size - 1) "Finish Practice" else "Next Verse",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF14120E)
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
                "You've reviewed all scheduled verses! The Word of God is firmly rooted in your heart.",
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
                Text("Practice Again", fontWeight = FontWeight.Bold, color = Color(0xFF14120E))
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
