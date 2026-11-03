package com.example.telugubible.ui.practice

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.theme.*
import com.example.telugubible.util.SM2Engine

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChainDrill(
    bookId: Int,
    blockIndex: Int,
    label: String,
    anchors: List<ChapterAnchor>,
    onClose: () -> Unit,
    onGradeChain: (List<Pair<Int, Boolean>>) -> Unit,
    nextIntervalDays: Int? = null,
    modifier: Modifier = Modifier,
    isSaving: Boolean = false,
    saveError: String? = null,
    onRestartChain: () -> Unit = {}
) {
    val chain = remember(anchors) {
        anchors.filter { it.word.isNotBlank() }
    }

    if (chain.isEmpty()) {
        LaunchedEffect(Unit) { onClose() }
        return
    }

    var position by remember { mutableStateOf(0) }
    var revealed by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<Boolean>>(emptyList()) }
    var finished by remember { mutableStateOf(false) }

    val currentAnchor = chain.getOrNull(position) ?: chain.first()
    val correctCount = results.count { it }

    BackHandler {
        if (!isSaving) onClose()
    }

    fun mark(correct: Boolean) {
        if (!revealed || finished || isSaving) return
        val next = results + correct
        results = next
        revealed = false
        if (position < chain.size - 1) {
            position += 1
        } else {
            finished = true
            val pairs = chain.mapIndexed { index, anchor ->
                val linkCorrect = next.getOrElse(index) { false }
                anchor.chapter to linkCorrect
            }
            onGradeChain(pairs)
        }
    }

    fun restart() {
        if (isSaving || saveError != null) return
        onRestartChain()
        position = 0
        revealed = false
        results = emptyList()
        finished = false
    }

    Dialog(
        onDismissRequest = { if (!isSaving) onClose() },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(RemoraBackground)
                .systemBarsPadding()
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    IconButton(
                        onClick = onClose,
                        enabled = !isSaving,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close drill",
                            tint = RemoraTextSecondary
                        )
                    }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f).padding(horizontal = 8.dp)
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                        )
                        Text(
                            text = if (finished) "CHAIN COMPLETE" else "LINK ${position + 1} OF ${chain.size}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = RemoraTextMuted,
                                letterSpacing = 1.sp
                            )
                        )
                    }

                    Spacer(modifier = Modifier.size(48.dp))
                }

                HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)

                LinearProgressIndicator(progress = { results.size.toFloat() / chain.size }, modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp))

                // Main Content
                if (finished) {
                    // Finished View
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                            .verticalScroll(rememberScrollState()),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "$correctCount / ${chain.size}",
                            style = MaterialTheme.typography.displayMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        when {
                            isSaving -> Text("Saving review…", style = MaterialTheme.typography.bodyMedium)
                            saveError != null -> Text(saveError, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
                            nextIntervalDays != null -> Text("Next chain review in ${SM2Engine.formatInterval(nextIntervalDays)}.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        // Broke the chain section if any errors
                        if (correctCount < chain.size) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "BROKE THE CHAIN",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextMuted,
                                        letterSpacing = 1.2.sp
                                    )
                                )

                                Spacer(modifier = Modifier.height(10.dp))

                                FlowRow(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    chain.forEachIndexed { i, link ->
                                        if (results.getOrElse(i) { true }.not()) {
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = RemoraRed.copy(alpha = 0.12f),
                                                border = androidx.compose.foundation.BorderStroke(
                                                    1.dp,
                                                    RemoraRed.copy(alpha = 0.35f)
                                                ),
                                                modifier = Modifier.padding(horizontal = 3.dp)
                                            ) {
                                                Text(
                                                    text = "${link.chapter} ${link.word}",
                                                    style = MaterialTheme.typography.labelMedium.copy(
                                                        color = RemoraRed,
                                                        fontWeight = FontWeight.Bold
                                                    ),
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(32.dp))
                        }

                        // Bottom Actions
                        OutlinedButton(
                            onClick = { restart() },
                            enabled = !isSaving && saveError == null,
                            modifier = Modifier
                                .fillMaxWidth(0.85f)
                                .heightIn(min = 48.dp),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = RemoraTextSecondary
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Run it again", fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Button(
                            onClick = onClose,
                            enabled = !isSaving,
                            modifier = Modifier
                                .fillMaxWidth(0.85f)
                                .heightIn(min = 48.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = RemoraAccent,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            Text("Done", fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    // Active Link View
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp)
                            .verticalScroll(rememberScrollState()),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        // Upper Cue
                        val cueLabel = if (position == 0) "CHAIN STARTS" else "AFTER"
                        val cueWord = if (position == 0) label else chain[position - 1].word

                        Text(
                            text = cueLabel,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextMuted,
                                letterSpacing = 1.2.sp
                            )
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = cueWord,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextSecondary
                            ),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "↓",
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = RemoraTextMuted,
                                fontSize = 18.sp
                            )
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Target Chapter
                        Text(
                            text = "${currentAnchor.chapter}",
                            style = MaterialTheme.typography.displayMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccent
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        if (revealed) {
                            Text(
                                text = currentAnchor.word,
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraTextPrimary
                                ),
                                textAlign = TextAlign.Center
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .width(130.dp)
                                    .height(30.dp)
                                    .background(RemoraCardBorder, RoundedCornerShape(6.dp))
                            )
                        }

                        Spacer(modifier = Modifier.height(32.dp))

                        // Action Controls
                        if (!revealed) {
                            OutlinedButton(
                                onClick = { revealed = true },
                                modifier = Modifier
                                    .fillMaxWidth(0.85f)
                                    .heightIn(min = 48.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = RemoraCardBg,
                                    contentColor = RemoraTextSecondary
                                )
                            ) {
                                Text(
                                    text = "What comes next?",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp
                                )
                            }
                        } else {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth(0.85f)
                                    .heightIn(min = 48.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Button(
                                    onClick = { mark(false) },
                                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = RemoraRed.copy(alpha = 0.12f),
                                        contentColor = RemoraRed
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        RemoraRed.copy(alpha = 0.35f)
                                    )
                                ) {
                                    Text("Missed", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }

                                Button(
                                    onClick = { mark(true) },
                                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = RemoraGreen.copy(alpha = 0.14f),
                                        contentColor = RemoraGreen
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        RemoraGreen.copy(alpha = 0.35f)
                                    )
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Had it", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
