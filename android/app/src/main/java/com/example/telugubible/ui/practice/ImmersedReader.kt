package com.example.telugubible.ui.practice

import android.text.Html
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.RemoraBackground
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.ui.reader.FontSizeScale
import com.example.telugubible.ui.reader.LineSpacing
import com.example.telugubible.ui.reader.ReaderFontFamily
import com.example.telugubible.util.BionicUtils

internal fun immersiveText(source: String): String {
    val withoutNotes = source
        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE), "")
    return Html.fromHtml(withoutNotes, Html.FROM_HTML_MODE_LEGACY).toString()
        .replace('\u00a0', ' ').trim()
}

internal data class PracticePassage(
    val text: String,
    val practiceWords: List<String>,
    val displayedWordIndices: List<Set<Int>>
)

// Leading bold spans and those following a line break are section headings.
// Inline bold words remain part of the verse and its recall score.
internal fun practicePassage(source: String): PracticePassage {
    val start = '\uE000'
    val end = '\uE001'
    val heading = Regex("<b\\b[^>]*>[\\s\\S]*?</b\\s*>", RegexOption.IGNORE_CASE)
    val marked = heading.replace(source) { match ->
        val prefix = source.substring(0, match.range.first).trimEnd()
        if (prefix.isBlank() || Regex("<br\\s*/?>$", RegexOption.IGNORE_CASE).containsMatchIn(prefix))
            "$start${match.value}$end" else match.value
    }
    val decoded = immersiveText(marked)
    val display = StringBuilder()
    val recall = StringBuilder()
    var headingDepth = 0
    for (character in decoded) {
        when (character) {
            start -> headingDepth++
            end -> headingDepth = (headingDepth - 1).coerceAtLeast(0)
            else -> {
                display.append(character)
                recall.append(if (headingDepth > 0 && !character.isWhitespace()) ' ' else character)
            }
        }
    }
    val words = Regex("\\S+").findAll(recall).toList()
    val visible = Regex("\\S+").findAll(display).toList()
    return PracticePassage(display.toString(), words.map { it.value }, visible.map { token ->
        words.withIndex().filter { (_, word) -> word.range.first <= token.range.last && token.range.first <= word.range.last }
            .map { it.index }.toSet()
    })
}

@Composable
fun ImmersedReader(
    verse: UserMemoryVerse,
    index: Int,
    total: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onExit: () -> Unit,
    isAutoPlaying: Boolean,
    onToggleAutoPlay: () -> Unit,
    onStopPlayback: () -> Unit,
    onExposure: (Set<Int>, Int) -> Unit = { _, _ -> },
    isEnglish: Boolean = true,
    bionicReading: Boolean = false,
    recallMasking: Boolean = false,
    serifTypography: Boolean = true,
    modifier: Modifier = Modifier,
    readingSettings: AppSettings = AppSettings()
) {
    val playing by rememberUpdatedState(isAutoPlaying)
    val stopPlayback by rememberUpdatedState(onStopPlayback)
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP && playing) stopPlayback()
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
            stopPlayback()
        }
    }
    BackHandler(onBack = onExit)
    var controlsVisible by remember { mutableStateOf(true) }
    val source = if (isEnglish) verse.textEn.orEmpty().ifBlank { verse.textTe.orEmpty() }
        else verse.textTe.orEmpty().ifBlank { verse.textEn.orEmpty() }
    val passage = remember(source) { practicePassage(source) }
    val text = passage.text
    val sentences = remember(text) { BionicUtils.splitSentences(text) }
    var revealed by remember(verse.id, text) { mutableStateOf(emptySet<Int>()) }
    val size = FontSizeScale.fromMultiplier(readingSettings.fontSize).spSize
    val lineHeight = size * LineSpacing.fromKey(readingSettings.lineSpacing).multiplier
    val family = ReaderFontFamily.fromKey(readingSettings.fontFamily).fontFamily
    val masking = recallMasking || readingSettings.recallMasking
    val bionic = bionicReading || readingSettings.bionicReading
    val ranges = remember(sentences) {
        var start = 0
        sentences.map { sentence ->
            val count = sentence.trim().split(Regex("\\s+")).count { it.isNotEmpty() }
            val range = (start until start + count).flatMap { passage.displayedWordIndices.getOrElse(it) { emptySet() } }.toSet()
            start += count
            range
        }
    }
    val totalWords = passage.practiceWords.size
    val latestExposure by rememberUpdatedState(onExposure)
    LaunchedEffect(verse.id, text, masking, isAutoPlaying) {
        if ((!masking || isAutoPlaying) && totalWords > 0) latestExposure((0 until totalWords).toSet(), totalWords)
    }

    Dialog(onDismissRequest = onExit, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Column(modifier.fillMaxSize().background(RemoraBackground).systemBarsPadding()) {
            if (controlsVisible) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onExit) { Icon(Icons.Default.Close, "Exit immersive reader") }
                    Text(verse.fullRef(isEnglish), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    IconButton(onClick = onToggleAutoPlay) {
                        Icon(if (isAutoPlaying) Icons.Default.Stop else Icons.AutoMirrored.Filled.VolumeUp,
                            if (isAutoPlaying) "Stop reading aloud" else "Read aloud")
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically) {
                if (isAutoPlaying && !controlsVisible) {
                    TextButton(onClick = onToggleAutoPlay) { Text("Stop reading aloud") }
                }
                TextButton(onClick = { controlsVisible = !controlsVisible }) {
                    Text(if (controlsVisible) "Hide controls" else "Show controls")
                }
            }
            key(verse.id, text) {
                Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally) {
                    Column(Modifier.widthIn(max = 620.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        if (!controlsVisible) Text(verse.fullRef(isEnglish), style = MaterialTheme.typography.titleSmall)
                        if (!masking) {
                            Text(BionicUtils.formatBionic(text, bionic), fontSize = size.sp, lineHeight = lineHeight.sp,
                                fontFamily = family, color = RemoraTextPrimary)
                        } else {
                            sentences.forEachIndexed { i, sentence ->
                                if (i in revealed) {
                                    Text(BionicUtils.formatBionic(sentence, bionic), fontSize = size.sp, lineHeight = lineHeight.sp,
                                        fontFamily = family, color = RemoraTextPrimary)
                                } else {
                                    OutlinedButton(onClick = {
                                        latestExposure(ranges[i], totalWords)
                                        revealed = revealed + i
                                    }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                                        Text("Reveal sentence ${i + 1}", textAlign = TextAlign.Center)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (controlsVisible && total > 1) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onPrev, enabled = index > 0) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Previous verse")
                    }
                    Text("${index + 1} of $total", style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
                    IconButton(onClick = onNext, enabled = index < total - 1) {
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, "Next verse")
                    }
                }
            }
        }
    }
}
