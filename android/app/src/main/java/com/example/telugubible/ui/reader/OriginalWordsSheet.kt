package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Original Words",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
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
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = RemoraAccent)
                }
            } else if (words.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No original words found for this verse.",
                        color = RemoraTextSecondary,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 520.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(words) { word ->
                        OriginalWordCard(
                            word = word,
                            onClick = {
                                word.entry?.let { onSelectStrongs(it) }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OriginalWordCard(
    word: OriginalWord,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBgElevated,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = word.entry != null, onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (word.english.isNotBlank()) {
                        Text(
                            text = word.english,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                    }
                    if (!word.entry?.lemma.isNullOrBlank()) {
                        Text(
                            text = word.entry!!.lemma!!,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = RemoraGold
                        )
                    }
                }

                if (!word.strongsId.isNullOrBlank()) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = RemoraAccent.copy(alpha = 0.2f),
                        border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.4f))
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

            if (!word.entry?.xlit.isNullOrBlank() || !word.entry?.pron.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                val phonetics = listOfNotNull(
                    word.entry?.xlit?.let { "*$it*" },
                    word.entry?.pron?.let { "/$it/" }
                ).joinToString("  •  ")
                Text(
                    text = phonetics,
                    fontSize = 13.sp,
                    fontStyle = FontStyle.Italic,
                    color = RemoraTextSecondary
                )
            }

            if (!word.entry?.strongsDef.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = word.entry!!.strongsDef!!.trim(),
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    color = RemoraTextSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
