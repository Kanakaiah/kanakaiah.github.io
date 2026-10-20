package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.OriginalWord
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OriginalWordsSheet(
    verseRefLabel: String,
    isOldTestament: Boolean,
    words: List<OriginalWord>,
    isLoading: Boolean,
    onSelectStrongs: (StrongsEntry) -> Unit,
    onViewOccurrences: (String) -> Unit = {},
    onRefClick: (String) -> Unit = {},
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = RemoraCardBg,
        tonalElevation = 6.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Original Words",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "$verseRefLabel • ${if (isOldTestament) "Hebrew" else "Greek"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = RemoraAccentLight
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

            Spacer(modifier = Modifier.height(14.dp))

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        CircularProgressIndicator(color = RemoraAccent)
                        Text(
                            text = "Loading original text and definitions...",
                            fontSize = 14.sp,
                            color = RemoraTextSecondary
                        )
                    }
                }
            } else if (words.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No original words found for this verse.",
                        color = RemoraTextSecondary,
                        fontSize = 14.sp
                    )
                }
            } else {
                val fullVerse = words.joinToString(" ") { it.english }.trim()
                val studyWords = words.filter { !it.strongsId.isNullOrBlank() || it.entry != null }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    // Full Verse Context Banner (React parity)
                    if (fullVerse.isNotBlank()) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = RemoraAccent.copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.2f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = fullVerse,
                                    fontSize = 16.sp,
                                    fontFamily = FontFamily.Serif,
                                    lineHeight = 25.sp,
                                    color = RemoraTextPrimary,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }
                        }
                    }

                    items(studyWords) { word ->
                        OriginalWordCard(
                            word = word,
                            onSelectStrongs = onSelectStrongs,
                            onViewOccurrences = onViewOccurrences,
                            onRefClick = onRefClick
                        )
                    }

                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Definitions from Strong's Exhaustive Concordance (1890)",
                                fontSize = 11.sp,
                                fontStyle = FontStyle.Italic,
                                color = RemoraTextMuted
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OriginalWordCard(
    word: OriginalWord,
    onSelectStrongs: (StrongsEntry) -> Unit,
    onViewOccurrences: (String) -> Unit,
    onRefClick: (String) -> Unit
) {
    val entry = word.entry

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBgElevated,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header Row: English Word translated as + Original Lemma
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "TRANSLATED AS",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraAccentLight,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "\"${word.english}\"",
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                }

                if (!entry?.lemma.isNullOrBlank()) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = entry!!.lemma!!,
                            fontSize = 24.sp,
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            color = RemoraGold
                        )
                        if (!entry.xlit.isNullOrBlank() || !entry.pron.isNullOrBlank()) {
                            val phonetics = listOfNotNull(
                                entry.xlit,
                                entry.pron?.let { "/$it/" }
                            ).joinToString(" • ")
                            Text(
                                text = phonetics,
                                fontSize = 12.sp,
                                fontStyle = FontStyle.Italic,
                                color = RemoraTextSecondary
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Definition Box
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = RemoraCardBg,
                border = BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                ) {
                    // Definition header row with POS and Strong's badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "DEFINITION",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraAccent,
                                letterSpacing = 1.sp
                            )
                            if (!entry?.pos.isNullOrBlank()) {
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = RemoraAccent.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = entry!!.pos!!.uppercase(),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraAccentLight,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.5.dp)
                                    )
                                }
                            }
                        }

                        if (!word.strongsId.isNullOrBlank()) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color.White.copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, RemoraCardBorder)
                            ) {
                                Text(
                                    text = word.strongsId,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccentLight,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (!entry?.strongsDef.isNullOrBlank()) {
                        StrongsRefText(
                            text = entry!!.strongsDef!!.trim(),
                            onRefClick = onRefClick,
                            fontSize = 14.sp,
                            lineHeight = 21.sp,
                            color = RemoraTextPrimary
                        )
                    }

                    if (!entry?.derivation.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "DERIVATION",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        StrongsRefText(
                            text = entry!!.derivation!!.trim(),
                            onRefClick = onRefClick,
                            fontSize = 13.sp,
                            lineHeight = 19.sp,
                            color = RemoraTextSecondary
                        )
                    }

                    if (!entry?.kjvDef.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "KJV TRANSLATIONS",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccent,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = entry!!.kjvDef!!.trim(),
                            fontSize = 13.sp,
                            fontStyle = FontStyle.Italic,
                            lineHeight = 19.sp,
                            color = RemoraTextSecondary
                        )
                    }

                    // View all occurrences button
                    val targetId = word.strongsId ?: entry?.id
                    if (!targetId.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = { onViewOccurrences(targetId) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.35f)),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = RemoraAccent.copy(alpha = 0.1f),
                                contentColor = RemoraAccentLight
                            )
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = "View all occurrences",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
