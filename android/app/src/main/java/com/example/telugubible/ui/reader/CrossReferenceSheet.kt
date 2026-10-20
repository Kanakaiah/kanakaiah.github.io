package com.example.telugubible.ui.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.theme.RemoraGold
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.theme.RemoraTextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrossReferenceSheet(
    fromRefLabel: String,
    crossReferences: List<CrossReference>,
    language: BibleLanguage,
    onDismiss: () -> Unit,
    onNavigateToTarget: (bookId: Int, chapter: Int, verse: Int) -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false),
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 8.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Cross References",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = fromRefLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = RemoraGold
                    )
                }

                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = RemoraTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (crossReferences.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No cross references recorded for this verse.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = RemoraTextSecondary
                    )
                }
            } else {
                Text(
                    text = "${crossReferences.size} related scriptures",
                    style = MaterialTheme.typography.labelMedium,
                    color = RemoraTextSecondary,
                    modifier = Modifier.padding(bottom = 10.dp)
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f, fill = false),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    items(crossReferences, key = { it.id }) { ref ->
                        val rawText = if (language == BibleLanguage.TELUGU) {
                            ref.targetTextTe ?: ref.targetTextEn ?: ""
                        } else {
                            ref.targetTextEn ?: ref.targetTextTe ?: ""
                        }
                        val annotatedText = remember(rawText) { parseScriptureText(rawText) }

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            tonalElevation = 2.dp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = ref.toBookId != null && ref.toChapter != null) {
                                    if (ref.toBookId != null && ref.toChapter != null) {
                                        onNavigateToTarget(
                                            ref.toBookId,
                                            ref.toChapter,
                                            ref.toVerse ?: 1
                                        )
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = ref.toRef,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraGold
                                    )

                                    if (annotatedText.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = annotatedText,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = RemoraTextPrimary,
                                            maxLines = 3
                                        )
                                    }
                                }

                                if (ref.toBookId != null && ref.toChapter != null) {
                                    Spacer(modifier = Modifier.width(12.dp))
                                    FilledTonalIconButton(
                                        onClick = {
                                            onNavigateToTarget(
                                                ref.toBookId,
                                                ref.toChapter,
                                                ref.toVerse ?: 1
                                            )
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                            contentDescription = "Jump to chapter",
                                            modifier = Modifier.size(18.dp)
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

private fun parseScriptureText(raw: String): AnnotatedString {
    val clean = raw
        .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
        .replace(Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .trim()

    val italicRegex = Regex("<i\\b[^>]*>([\\s\\S]*?)</i>", RegexOption.IGNORE_CASE)
    return buildAnnotatedString {
        var lastIdx = 0
        for (m in italicRegex.findAll(clean)) {
            val normal = clean.substring(lastIdx, m.range.first).replace(Regex("<[^>]+>"), "")
            append(normal)
            withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                val italicText = m.groupValues[1].replace(Regex("<[^>]+>"), "")
                append(italicText)
            }
            lastIdx = m.range.last + 1
        }
        if (lastIdx < clean.length) {
            val remaining = clean.substring(lastIdx).replace(Regex("<[^>]+>"), "")
            append(remaining)
        }
    }
}
