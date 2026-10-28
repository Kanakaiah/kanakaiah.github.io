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
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Visibility
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
    initialSubject: PracticeSubject = PracticeSubject.VERSES,
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

                    if (state.activeMode == PracticeMode.IMMERSED) {
                        ImmersedReader(
                            verse = verse,
                            index = state.currentIndex,
                            total = state.verses.size,
                            onPrev = { viewModel.prevVerse() },
                            onNext = { viewModel.nextVerse() },
                            onExit = { viewModel.setPracticeMode(PracticeMode.READ) },
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

                            // Mode Selector Pills (Read, Erase, Letters, Order, Type, Recite)
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
                                            text = "Chapter ${verse.verseRef}",
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = RemoraTextPrimary
                                        )
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        if (state.activeMode == PracticeMode.READ) {
                                            Surface(
                                                onClick = { viewModel.setPracticeMode(PracticeMode.IMMERSED) },
                                                shape = CircleShape,
                                                color = RemoraAccent.copy(alpha = 0.15f),
                                                modifier = Modifier.size(36.dp)
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
                                        PracticeMode.READ, PracticeMode.IMMERSED -> {
                                            Text(
                                                text = activeText,
                                                fontSize = if (isEnglish) 18.sp else 20.sp,
                                                lineHeight = if (isEnglish) 28.sp else 32.sp,
                                                fontFamily = FontFamily.Serif,
                                                fontWeight = FontWeight.Normal,
                                                color = RemoraTextPrimary,
                                                textAlign = TextAlign.Start,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .verticalScroll(rememberScrollState())
                                            )
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

                        // Bottom Continue Bar (Hidden in Read mode)
                        if (state.activeMode != PracticeMode.READ && state.isRevealed) {
                            Column {
                                if (state.modeAccuracy != null) {
                                    Text(
                                        text = "${state.modeAccuracy}% of words matched",
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
                                        fontWeight = FontWeight.Bold
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
