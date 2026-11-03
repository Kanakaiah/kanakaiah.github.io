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

private fun cleanSpeechText(raw: String): String = raw
    .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
    .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
    .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
    .replace(Regex("<[^>]+>"), "")
    .replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'")
    .trim()

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
    BackHandler { if (!state.isGrading) onExitToToday() }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
            .imePadding()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        val drillHeight = maxOf(320.dp, maxHeight - 280.dp)
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
                    onPracticeThemes = { activeSubject = PracticeSubject.THEMES },
                    onExit = onExitToToday
                )
            }
            else -> {
                val verse = state.currentVerse
                if (verse != null) {
                    val isEnglish = state.displayLanguage == DisplayLanguage.ENGLISH
                    val bookName = if (isEnglish) verse.bookNameEn else verse.bookNameTe
                    val rawText = if (isEnglish) verse.textEn.orEmpty().ifBlank { verse.textTe.orEmpty() }
                        else verse.textTe.orEmpty().ifBlank { verse.textEn.orEmpty() }
                    val activeText = cleanSpeechText(rawText)

                    val verseRef = "$bookName ${verse.chapter}:${verse.verse}" +
                        (verse.endVerse?.takeIf { it > verse.verse }?.let { "–$it" } ?: "")

                    if (state.isImmersed) {
                        ImmersedReader(
                            verse = verse,
                            index = state.currentIndex,
                            total = state.verses.size,
                            onPrev = { viewModel.prevVerse() },
                            onNext = { viewModel.nextVerse() },
                            onExit = viewModel::exitImmersed,
                            isAutoPlaying = state.isTtsSpeaking,
                            onToggleAutoPlay = { viewModel.toggleTts() },
                            onStopPlayback = viewModel::stopTts,
                            onExposure = { seen, total -> viewModel.recordImmersiveExposure(verse.id, state.displayLanguage, seen, total) },
                            isEnglish = isEnglish,
                            bionicReading = state.bionicReading,
                            recallMasking = state.recallMasking,
                            serifTypography = state.serifTypography,
                            readingSettings = state.readingSettings
                        )
                        return@BoxWithConstraints
                    }

                    Column(
                        modifier = Modifier
                            .widthIn(max = 640.dp)
                            .fillMaxSize()
                            .align(Alignment.TopCenter)
                            .verticalScroll(rememberScrollState())
                            .navigationBarsPadding()
                            .padding(bottom = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        PracticeHeader("Verse practice", state.currentCollectionTitle, state.currentIndex, state.verses.size, onExitToToday, exitEnabled = !state.isGrading)
                        Text(verseRef, style = MaterialTheme.typography.headlineSmall.copy(fontFamily = FontFamily.Serif))
                        PracticeModePicker(state.activeMode, viewModel::setPracticeMode, enabled = !state.isGrading && !state.isRevealed && state.gradingError == null)
                        // Drill / Working Area
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .then(if (state.isRevealed || state.activeMode == PracticeMode.READ || state.activeMode == PracticeMode.TYPING) Modifier else Modifier.height(drillHeight))
                                .padding(vertical = 4.dp)
                        ) {
                            key(if (state.activeMode == PracticeMode.LISTEN) "listening" else verse.id, state.activeMode, state.displayLanguage) {
                            if (state.isRevealed && state.activeMode != PracticeMode.LISTEN) {
                                ReviewAnswer(activeText, state.modeCommitted, state.modeAccuracy, showWordDiff = state.activeMode == PracticeMode.TYPING)
                            } else when (state.activeMode) {
                                PracticeMode.SCRAMBLE -> {
                                    ScrambleMode(
                                        text = activeText,
                                        onComplete = { acc ->
                                            viewModel.recordScrambleAttempt(acc)
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
                                        modifier = Modifier.fillMaxSize(),
                                        itemKey = verse.id,
                                        canGoPrevious = state.currentIndex > 0,
                                        canGoNext = state.currentIndex < state.verses.lastIndex,
                                        backgroundQueue = BackgroundListenQueue(
                                            texts = state.verses.map { item ->
                                                cleanSpeechText(if (isEnglish) item.textEn.orEmpty().ifBlank { item.textTe.orEmpty() }
                                                    else item.textTe.orEmpty().ifBlank { item.textEn.orEmpty() })
                                            },
                                            languages = state.verses.map { item ->
                                                if (isEnglish && !item.textEn.isNullOrBlank() || !isEnglish && item.textTe.isNullOrBlank()) "en" else "te"
                                            },
                                            ids = state.verses.map { it.id }.toLongArray(),
                                            index = state.currentIndex,
                                            onPositionChanged = viewModel::seekListeningVerse
                                        )
                                    )
                                }
                                PracticeMode.TYPING -> {
                                    TypingMode(
                                        text = activeText,
                                        onAttempt = { accuracy, committed ->
                                            viewModel.recordAttempt(accuracy, committed)
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        scrollInternally = false
                                    )
                                }
                                PracticeMode.FIRST_LETTER -> {
                                    val exposureKey = "${verse.id}:${state.displayLanguage.name}"
                                    FirstLetterMode(
                                        text = remember(rawText) { practicePassage(rawText).practiceWords.joinToString(" ") },
                                        onComplete = { ratio ->
                                            viewModel.recordFirstLetterAttempt(ratio)
                                        },
                                        modifier = Modifier.fillMaxSize(),
                                        previouslySeen = (combineExposure(firstLetterExposureFor(verse, state.displayLanguage, state.firstLetterSeenByVerse),
                                            state.immersiveSeenByVerse[immersiveExposureKey(verse, state.displayLanguage)])
                                            ?: state.firstLetterSeenByVerse[exposureKey])?.seen ?: emptyList(),
                                        onSeenChanged = { seen, total -> viewModel.recordFirstLetterSeen(exposureKey, seen, total) }
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
                                    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(20.dp)) {
                                        Text("Recall the verse in your own time.", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Button(onClick = viewModel::revealVerse, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Show verse") }
                                    }
                                }
                            }
                            }
                        }
                        if (state.isRevealed && state.activeMode != PracticeMode.LISTEN) {
                            ReviewGrades(state.gradeCeiling, viewModel::gradeCurrent, enabled = !state.isGrading && state.gradingError == null)
                            if (state.isGrading) Text("Saving review…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        state.gradingError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
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
    onPracticeThemes: () -> Unit,
    onExit: () -> Unit
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        PracticeHeader("Practice", "A little practice, every day.", 0, 0, onExit)
        Text(if (isEmpty) "Your practice starts here" else "Practice complete", style = MaterialTheme.typography.headlineMedium)
        Text(if (isEmpty) "Add verses from Today or the Reader to begin." else "You reviewed the verses in this queue.",
            style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Button(onClick = onExit, modifier = Modifier.fillMaxWidth()) { Text("Back to Today") }
        if (!isEmpty) FilledTonalButton(onClick = onRestart, modifier = Modifier.fillMaxWidth()) { Text("Practice again") }
        OutlinedButton(onClick = onBrowseBible, modifier = Modifier.fillMaxWidth()) { Text("Browse Bible") }
        TextButton(onClick = onPracticeAnchors) { Text("Practice chapter anchors") }
        TextButton(onClick = onPracticeThemes) { Text("Practice book themes") }
    }
}
