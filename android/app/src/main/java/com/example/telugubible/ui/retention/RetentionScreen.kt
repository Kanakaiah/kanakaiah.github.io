package com.example.telugubible.ui.retention

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
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
    val scrollState = rememberScrollState()

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
                                text = "Retention needs about a week of reviews before it can tell you anything. Keep going.",
                                fontSize = 14.sp,
                                color = RemoraTextSecondary,
                                lineHeight = 20.sp
                            )
                            Text(
                                text = "This screen will show what you'd still recall unaided — not how much you've practised.",
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
                            text = "recalled on the first try, last 30 days",
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
                                    text = "${state.overdueCount} items overdue. This counts only what you've actually reviewed.",
                                    fontSize = 12.sp,
                                    color = RemoraAccentLight
                                )
                            }
                        }
                    }

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
                                        text = "You're forgetting faster than the schedule assumes. Shortening every interval brings reviews forward across the board.",
                                        fontSize = 13.sp,
                                        color = RemoraTextSecondary,
                                        lineHeight = 19.sp
                                    )
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        listOf(Pair(0.70, "30% shorter"), Pair(0.85, "15% shorter"), Pair(1.0, "Normal")).forEach { (scaleVal, label) ->
                                            val isSelected = (state.intervalScale == scaleVal)
                                            Button(
                                                onClick = { viewModel.setIntervalScale(scaleVal) },
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = if (isSelected) RemoraAccent else RemoraCardBgElevated,
                                                    contentColor = if (isSelected) Color.White else RemoraTextSecondary
                                                ),
                                                border = androidx.compose.foundation.BorderStroke(
                                                    1.dp,
                                                    if (isSelected) RemoraAccent else RemoraCardBorder
                                                ),
                                                shape = RoundedCornerShape(6.dp),
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                modifier = Modifier.height(36.dp)
                                            ) {
                                                Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
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
                                    text = "ARE YOUR GRADES HONEST?",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccent,
                                    letterSpacing = 2.sp
                                )
                                val gapMsg = when {
                                    gap.gap >= 0.5 -> "You grade yourself about ${String.format(Locale.US, "%.1f", gap.gap)} of a grade above what you actually typed, across ${gap.n} measured attempts. Intervals are running longer than the recall behind them."
                                    gap.gap <= -0.5 -> "You grade yourself harder than the words you produced, across ${gap.n} measured attempts. Nothing is broken — you may just be scoring on meaning rather than wording."
                                    else -> "Your grades match what you actually produced, across ${gap.n} measured attempts."
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
                                text = "${state.coldAvailableCount} items have gone 30+ days without a successful recall. A check asks 5 of them and changes nothing — no grades, no schedule.",
                                fontSize = 13.sp,
                                color = RemoraTextSecondary,
                                lineHeight = 19.sp
                            )
                            Button(
                                onClick = { viewModel.startColdCheck() },
                                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Text("Run a cold check", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Text(
                                text = "Nothing has been away long enough yet. This becomes available once something you once knew has had 30+ days to fade — the waiting is what makes it mean anything.",
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
                if (state.adherence.started > 0) {
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
                                text = "More than a third of sessions go unfinished. If that started recently, the day's work has probably become too long or too hard — shorten it before trusting any retention number above.",
                                fontSize = 13.sp,
                                color = RemoraAccentLight,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }

                // Leeches (Costing you the most)
                if (state.leeches.isNotEmpty()) {
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
                            text = "These keep slipping. Reword the hook, split the passage, or set it aside — more repetitions is the one thing that reliably won't help.",
                            fontSize = 13.sp,
                            color = RemoraTextSecondary,
                            lineHeight = 18.sp
                        )
                    }
                }

                // Active days footer
                Text(
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
            onUpdateAnswer = { viewModel.updateColdAnswer(it) },
            onReveal = { viewModel.revealColdAnswer() },
            onNext = { viewModel.nextColdItem() },
            onClose = { viewModel.closeColdCheck() }
        )
    }
}

@Composable
fun ForgettingCurveChart(curve: List<RetentionBucket>) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom
        ) {
            curve.forEach { bucket ->
                val rate = bucket.rate
                val heightPct = rate?.toFloat() ?: 0.05f
                val barColor = when {
                    rate == null -> RemoraCardBorder
                    rate >= 0.85 -> Color(0xFF10B981) // Emerald
                    rate >= 0.70 -> RemoraGold        // Gold
                    else -> Color(0xFFEF4444)         // Red
                }

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom
                ) {
                    Text(
                        text = rate?.let { "${(it * 100).roundToInt()}%" } ?: "—",
                        fontSize = 10.sp,
                        color = RemoraTextMuted,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.6f)
                            .fillMaxHeight(heightPct.coerceIn(0.06f, 0.82f))
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(barColor)
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = bucket.label,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraTextSecondary
                    )
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
    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = RemoraBackground
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = RemoraTextSecondary)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Cold Check", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = RemoraTextPrimary)
                        if (state.coldCheckFinishedResult == null && state.coldCheckCandidates.isNotEmpty()) {
                            Text(
                                "${state.activeColdIndex + 1} of ${state.coldCheckCandidates.size}",
                                fontSize = 11.sp,
                                color = RemoraTextMuted
                            )
                        }
                    }
                    Box(modifier = Modifier.size(48.dp))
                }

                Spacer(modifier = Modifier.height(24.dp))

                state.coldCheckFinishedResult?.let { result ->
                    // Done screen
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "${result.correct} / ${result.total}",
                            fontSize = 54.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Recalled unaided after a median of ${result.medianColdFor} days away.",
                            fontSize = 15.sp,
                            color = RemoraTextSecondary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Nothing was scheduled or graded by this. Your intervals are exactly where they were.",
                            fontSize = 12.sp,
                            color = RemoraTextMuted,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(28.dp))
                        Button(
                            onClick = onClose,
                            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth(0.7f)
                        ) {
                            Text("Done", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                } ?: run {
                    val current = state.coldCheckCandidates.getOrNull(state.activeColdIndex)
                    if (current != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = RemoraCardBg,
                                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    Text(
                                        text = "${current.kind.uppercase()} · LAST RECALLED ${current.coldForDays} DAYS AGO",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraAccent,
                                        letterSpacing = 1.5.sp
                                    )
                                    Text(
                                        text = current.prompt,
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextPrimary,
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = if (current.kind == "verse") "Type what you remember." else "One word anchor.",
                                        fontSize = 13.sp,
                                        color = RemoraTextMuted
                                    )

                                    OutlinedTextField(
                                        value = state.coldCheckAnswerTyped,
                                        onValueChange = onUpdateAnswer,
                                        placeholder = { Text("Your recollection...", color = RemoraTextMuted) },
                                        modifier = Modifier.fillMaxWidth(),
                                        enabled = !state.coldCheckRevealed,
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = RemoraAccent,
                                            unfocusedBorderColor = RemoraCardBorder,
                                            focusedTextColor = RemoraTextPrimary,
                                            unfocusedTextColor = RemoraTextPrimary
                                        ),
                                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                        keyboardActions = KeyboardActions(onDone = { if (!state.coldCheckRevealed) onReveal() })
                                    )

                                    AnimatedVisibility(visible = state.coldCheckRevealed) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)
                                            val isCorrect = state.coldCheckCorrectKeys.contains(current.key)
                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = if (isCorrect) Color(0xFF10B981).copy(alpha = 0.15f) else Color(0xFFEF4444).copy(alpha = 0.15f),
                                                modifier = Modifier.padding(vertical = 4.dp)
                                            ) {
                                                Text(
                                                    text = if (isCorrect) "✓ Correct" else "✗ Missed",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isCorrect) Color(0xFF10B981) else Color(0xFFEF4444),
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                                )
                                            }
                                            Text(
                                                text = current.answer,
                                                fontSize = 15.sp,
                                                color = RemoraTextSecondary,
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    if (!state.coldCheckRevealed) {
                                        Button(
                                            onClick = onReveal,
                                            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text("Reveal Answer", fontWeight = FontWeight.Bold)
                                        }
                                    } else {
                                        Button(
                                            onClick = onNext,
                                            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                if (state.activeColdIndex < state.coldCheckCandidates.size - 1) "Next" else "Finish",
                                                fontWeight = FontWeight.Bold
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
}
