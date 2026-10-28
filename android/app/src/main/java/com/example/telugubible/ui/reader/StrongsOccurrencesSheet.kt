package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.data.model.Verse
import com.example.telugubible.theme.*
import com.example.telugubible.util.StrongsParser
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StrongsOccurrencesSheet(
    strongsEntry: StrongsEntry,
    occurrences: List<StrongsOccurrence>,
    isLoading: Boolean,
    errorMessage: String?,
    onNavigateToVerse: (bookId: Int, chapter: Int, verse: Int) -> Unit,
    onLookupOfflineVerse: suspend (bookId: Int, chapter: Int, verse: Int) -> Verse?,
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
                        text = "Word Occurrences",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    val lemmaPart = if (!strongsEntry.lemma.isNullOrBlank()) "${strongsEntry.lemma} " else ""
                    val countPart = if (isLoading) "Searching..." else "${occurrences.size} verses"
                    Text(
                        text = "$lemmaPart(${strongsEntry.id}) — $countPart",
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

            when {
                isLoading -> {
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
                                text = "Searching entire Bible...",
                                fontSize = 14.sp,
                                color = RemoraTextSecondary
                            )
                        }
                    }
                }
                errorMessage != null -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth().padding(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = errorMessage,
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
                occurrences.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No occurrences found for this word.",
                            color = RemoraTextSecondary,
                            fontSize = 14.sp
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(bottom = 28.dp)
                    ) {
                        items(occurrences) { occ ->
                            OccurrenceCard(
                                occurrence = occ,
                                onNavigateToVerse = onNavigateToVerse,
                                onLookupOfflineVerse = onLookupOfflineVerse
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OccurrenceCard(
    occurrence: StrongsOccurrence,
    onNavigateToVerse: (bookId: Int, chapter: Int, verse: Int) -> Unit,
    onLookupOfflineVerse: suspend (bookId: Int, chapter: Int, verse: Int) -> Verse?
) {
    var activeTranslation by remember { mutableStateOf<String?>(null) } // "te", "en", or null
    var cachedVerse by remember { mutableStateOf<Verse?>(null) }
    var isLoadingTranslation by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val annotatedKjv = remember(occurrence.cleanText, occurrence.highlightRanges) {
        StrongsParser.buildOccurrenceAnnotatedString(
            cleanText = occurrence.cleanText,
            highlightRanges = occurrence.highlightRanges,
            highlightColor = RemoraAccent,
            highlightBgColor = RemoraAccent.copy(alpha = 0.22f)
        )
    }

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
            // Card Top Row: Book Chapter:Verse + "Read Chapter" button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${occurrence.bookName} ${occurrence.chapter}:${occurrence.verse}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )

                Surface(
                    shape = CircleShape,
                    color = RemoraAccent.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.3f)),
                    modifier = Modifier.clickable {
                        onNavigateToVerse(occurrence.bookId, occurrence.chapter, occurrence.verse)
                    }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "Read Chapter",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = RemoraAccentLight
                        )
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            tint = RemoraAccentLight,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // KJV Verse Text with Highlighted Lemma Rendering
            Text(
                text = annotatedKjv,
                fontSize = 15.sp,
                fontFamily = FontFamily.Serif,
                lineHeight = 23.sp,
                color = RemoraTextPrimary
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Version tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = Color.White.copy(alpha = 0.08f)
                ) {
                    Text(
                        text = "KJV",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextSecondary,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}
