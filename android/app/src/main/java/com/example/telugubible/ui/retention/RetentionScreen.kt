package com.example.telugubible.ui.retention

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.telugubible.data.model.RetentionBucket
import com.example.telugubible.theme.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RetentionScreen(
    viewModel: RetentionViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    RetentionContent(state, onBack, viewModel::setIntervalScale, viewModel::startColdCheck,
        viewModel::updateColdAnswer, viewModel::revealColdAnswer, viewModel::nextColdItem, viewModel::closeColdCheck)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RetentionContent(
    state: com.example.telugubible.data.model.RetentionUiState,
    onBack: () -> Unit,
    onSetIntervalScale: (Double) -> Unit,
    onStartColdCheck: () -> Unit,
    onUpdateColdAnswer: (String) -> Unit,
    onRevealColdAnswer: () -> Unit,
    onNextColdItem: () -> Unit,
    onCloseColdCheck: () -> Unit
) {
    val scrollState = rememberScrollState()
    var showDetails by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Retention",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = RemoraTextSecondary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = RemoraBackground)
            )
        },
        containerColor = RemoraBackground
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = RemoraAccent)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(28.dp)
            ) {
                val tooEarly = state.headline.attempts < 5

                if (tooEarly) {
                    // Not enough reviews empty state
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = RemoraCardBg,
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Not enough reviews yet",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                            Text(
                                text = "At least five eligible reviews are needed to show this estimate.",
                                fontSize = 14.sp,
                                color = RemoraTextSecondary,
                                lineHeight = 20.sp
                            )
                            Text(
                                text = "Eligible reviews have a previous interval and use little or no prompting.",
                                fontSize = 13.sp,
                                color = RemoraTextMuted,
                                lineHeight = 18.sp
                            )
                        }
                    }
                } else {
                    // Headline Metric
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        val ratePct = state.headline.rate?.let { "${(it * 100).roundToInt()}%" } ?: "—"
                        Text(
                            text = ratePct,
                            fontSize = 52.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary,
                            letterSpacing = (-1).sp
                        )
                        Text(
                            text = "successful low-cue reviews in the last 30 days",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraTextSecondary
                        )
                        Text(
                            text = "across ${state.headline.attempts} reviews",
                            fontSize = 12.sp,
                            color = RemoraTextMuted
                        )
                        if (state.overdueCount > 0) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    Icons.Default.WarningAmber,
                                    contentDescription = null,
                                    tint = RemoraAccent,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "${state.overdueCount} items overdue",
                                    fontSize = 12.sp,
                                    color = RemoraAccentLight
                                )
                            }
                        }
                    }

                    if (showDetails) {
                    // Forgetting Curve ("How long it holds")
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "HOW LONG IT HOLDS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 2.sp
                        )

                        // Compose Bar Chart
                        ForgettingCurveChart(curve = state.curve)

                        Text(
                            text = state.curveSummary,
                            fontSize = 14.sp,
                            color = RemoraTextSecondary,
                            lineHeight = 20.sp
                        )

                        // Shortening recommendation
                        if (state.needsShortening) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = RemoraAccent.copy(alpha = 0.08f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.35f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text(
                                        text = "Some interval results are below the current target. You can adjust future intervals.",
                                        fontSize = 13.sp,
                                        color = RemoraTextSecondary,
                                        lineHeight = 19.sp
                                    )
                                    Column(
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        listOf(Pair(0.70, "30% shorter"), Pair(0.85, "15% shorter"), Pair(1.0, "Normal")).forEach { (scaleVal, label) ->
                                            val isSelected = (state.intervalScale == scaleVal)
                                            Button(
                                                onClick = { onSetIntervalScale(scaleVal) },
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = if (isSelected) RemoraAccent else RemoraCardBgElevated,
                                                    contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else RemoraTextSecondary
                                                ),
                                                border = androidx.compose.foundation.BorderStroke(
                                                    1.dp,
                                                    if (isSelected) RemoraAccent else RemoraCardBorder
                                                ),
                                                shape = RoundedCornerShape(6.dp),
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                                            ) {
                                                Text(text = if (isSelected) "$label (selected)" else label, style = MaterialTheme.typography.labelLarge)
                                            }
                                        }
                                    }
                                    Text(
                                        text = "Applies to intervals as they're earned. Nothing already scheduled moves.",
                                        fontSize = 11.sp,
                                        color = RemoraTextMuted
                                    )
                                }
                            }
                        }
                    }

                    // Honesty Gap (if measured attempts exist)
                    state.honestyGap?.let { gap ->
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "GRADES AND MEASURED ATTEMPTS",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccent,
                                    letterSpacing = 2.sp
                                )
                                val gapMsg = when {
                                    gap.gap >= 0.5 -> "Your average grade was ${String.format(Locale.US, "%.1f", gap.gap)} above the estimate from measured accuracy, across ${gap.n} attempts."
                                    gap.gap <= -0.5 -> "Your average grade was ${String.format(Locale.US, "%.1f", -gap.gap)} below the estimate from measured accuracy, across ${gap.n} attempts."
                                    else -> "Your average grade was close to the estimate from measured accuracy, across ${gap.n} attempts."
                                }
                                Text(
                                    text = gapMsg,
                                    fontSize = 13.sp,
                                    color = RemoraTextSecondary,
                                    lineHeight = 19.sp
                                )
                            }
                        }
                    }

                    // By Layer
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "BY LAYER",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 2.sp
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                                state.byLayer.forEachIndexed { idx, layer ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = layer.label,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = RemoraTextPrimary
                                        )
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            val rateStr = layer.rate?.let { "${(it * 100).roundToInt()}%" } ?: "—"
                                            Text(
                                                text = rateStr,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = RemoraTextPrimary
                                            )
                                            Text(
                                                text = "${layer.attempts} reviews",
                                                fontSize = 12.sp,
                                                color = RemoraTextMuted
                                            )
                                        }
                                    }
                                    if (idx < state.byLayer.size - 1) {
                                        HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)
                                    }
                                }
                            }
                        }
                    }
                    }
                }

                TextButton(onClick = { showDetails = !showDetails }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text(if (showDetails) "Hide detailed statistics" else "Show detailed statistics")
                }

                // Cold Check Card
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RemoraCardBg,
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "COLD CHECK",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 2.sp
                        )

                        if (state.coldAvailableCount > 0) {
                            Text(
                                text = "${state.coldAvailableCount} items are available for this check. It does not change grades or review schedules.",
                                fontSize = 13.sp,
                                color = RemoraTextSecondary,
                                lineHeight = 19.sp
                            )
                            Button(
                                onClick = onStartColdCheck,
                                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Text("Run a cold check", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Text(
                                text = "No items currently qualify for a cold check.",
                                fontSize = 13.sp,
                                color = RemoraTextSecondary,
                                lineHeight = 19.sp
                            )
                        }

                        state.lastColdCheck?.let { last ->
                            val sdf = SimpleDateFormat("MMM d, yyyy", Locale.US)
                            Text(
                                text = "Last check: ${last.correct} of ${last.total}, after a median ${last.medianColdFor} days away · ${sdf.format(Date(last.ts))}",
                                fontSize = 12.sp,
                                color = RemoraTextMuted
                            )
                        }
                    }
                }

                // Adherence (if sessions started)
                if (showDetails && state.adherence.started > 0) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "ARE YOU FINISHING?",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 2.sp
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Sessions finished", fontSize = 14.sp, color = RemoraTextPrimary)
                                    val rateStr = state.adherence.completionRate?.let { "${(it * 100).roundToInt()}%" } ?: "—"
                                    Text(
                                        text = "$rateStr of ${state.adherence.started}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextPrimary
                                    )
                                }
                                state.adherence.meanMinutes?.let { mins ->
                                    HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Typical session", fontSize = 14.sp, color = RemoraTextPrimary)
                                        Text("$mins min", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = RemoraTextPrimary)
                                    }
                                }
                                state.adherence.meanAbandonAt?.let { atIndex ->
                                    HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("When you stop early", fontSize = 14.sp, color = RemoraTextPrimary)
                                        Text("item $atIndex", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = RemoraTextPrimary)
                                    }
                                }
                            }
                        }

                        if ((state.adherence.completionRate ?: 1.0) < 0.60) {
                            Text(
                                text = "Some sessions were left unfinished. Completed reviews remain saved.",
                                fontSize = 13.sp,
                                color = RemoraAccentLight,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }

                // Leeches (Costing you the most)
                if (showDetails && state.leeches.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "COSTING YOU THE MOST",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 2.sp
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                                state.leeches.forEachIndexed { idx, leech ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = leech.label,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = RemoraTextPrimary
                                        )
                                        Text(
                                            text = "${leech.lapses} lapses · ${leech.attempts} reviews",
                                            fontSize = 12.sp,
                                            color = RemoraTextMuted
                                        )
                                    }
                                    if (idx < state.leeches.size - 1) {
                                        HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)
                                    }
                                }
                            }
                        }
                        Text(
                            text = "These items have more recorded lapses. You can revisit them in practice.",
                            fontSize = 13.sp,
                            color = RemoraTextSecondary,
                            lineHeight = 18.sp
                        )
                    }
                }

                // Active days footer
                if (showDetails) Text(
                    text = "Reviewed on ${state.activeDaysCount} of the last 45 days.",
                    fontSize = 13.sp,
                    color = RemoraTextMuted,
                    modifier = Modifier.padding(bottom = 24.dp)
                )
            }
        }
    }

    // Cold Check Interactive Modal
    if (state.isColdCheckActive) {
        ColdCheckDialog(
            state = state,
            onUpdateAnswer = onUpdateColdAnswer,
            onReveal = onRevealColdAnswer,
            onNext = onNextColdItem,
            onClose = onCloseColdCheck
        )
    }
}

@Composable
fun ForgettingCurveChart(curve: List<RetentionBucket>) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            curve.forEach { bucket ->
                val result = bucket.rate?.let { "${(it * 100).roundToInt()}% recalled" } ?: "Not enough reviews"
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("${bucket.label}: $result · ${bucket.attempts} reviews", style = MaterialTheme.typography.bodyMedium)
                    bucket.rate?.let { rate ->
                        LinearProgressIndicator(progress = { rate.toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@Composable
fun ColdCheckDialog(
    state: com.example.telugubible.data.model.RetentionUiState,
    onUpdateAnswer: (String) -> Unit,
    onReveal: () -> Unit,
    onNext: () -> Unit,
    onClose: () -> Unit
) {
    val close = { if (!state.coldCheckSaving) onClose() }
    Dialog(onDismissRequest = close, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize().imePadding().padding(horizontal = 20.dp, vertical = 12.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = close, enabled = !state.coldCheckSaving) {
                        Icon(Icons.Default.Close, contentDescription = "Close cold check")
                    }
                    Text("Cold check", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    if (state.coldCheckFinishedResult == null && state.coldCheckCandidates.isNotEmpty()) {
                        Text("${state.activeColdIndex + 1} of ${state.coldCheckCandidates.size}", style = MaterialTheme.typography.labelLarge)
                    }
                }
                Column(Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()).padding(vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("This check does not change your review schedule.", style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    val result = state.coldCheckFinishedResult
                    if (result != null) {
                        Text("Check complete", style = MaterialTheme.typography.headlineSmall)
                        Text("${result.correct} of ${result.total} answers matched", style = MaterialTheme.typography.titleLarge)
                        Text("The selected items had a median interval of ${result.medianColdFor} days since their last recorded activity or fallback date.",
                            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Button(onClick = close, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Done") }
                    } else {
                        val item = state.coldCheckCandidates.getOrNull(state.activeColdIndex)
                        if (item == null) {
                            Text("No items in this check", style = MaterialTheme.typography.titleLarge)
                            TextButton(onClick = close) { Text("Close") }
                        } else {
                            Text(if (item.kind == "verse") "Verse" else "Chapter theme", style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary)
                            Text(item.prompt, style = MaterialTheme.typography.headlineSmall)
                            Text(if (item.kind == "verse") "Type what you remember." else "Type the chapter theme.",
                                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            OutlinedTextField(value = state.coldCheckAnswerTyped, onValueChange = onUpdateAnswer,
                                label = { Text("Your answer") }, enabled = !state.coldCheckRevealed && !state.coldCheckSaving,
                                modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { if (!state.coldCheckRevealed) onReveal() }))
                            if (state.coldCheckRevealed) {
                                val matched = state.coldCheckCorrectKeys.contains(item.key)
                                Text(if (matched) "Answer matched" else "Answer did not match", style = MaterialTheme.typography.titleMedium)
                                Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
                                    Text(item.answer, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.fillMaxWidth().padding(16.dp))
                                }
                            }
                            if (state.coldCheckSaving) Text("Saving check…", style = MaterialTheme.typography.bodyMedium)
                            state.coldCheckSaveError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
                            if (!state.coldCheckRevealed) {
                                Button(onClick = onReveal, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Check answer") }
                            } else {
                                Button(onClick = onNext, enabled = !state.coldCheckSaving && state.coldCheckSaveError == null,
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                                    Text(if (state.activeColdIndex < state.coldCheckCandidates.size - 1) "Next" else "Finish check")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
