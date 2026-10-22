package com.example.telugubible.ui.bible

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.commentary.CommentaryData
import com.example.telugubible.data.model.CommentaryEntry
import com.example.telugubible.data.model.CommentarySection
import com.example.telugubible.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommentarySheet(
    bookId: Int? = null,
    bookNameEn: String? = null,
    initialSeriesId: String? = null,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val allSeries = CommentaryData.ALL_SERIES
    val defaultSeries = when {
        initialSeriesId != null -> allSeries.firstOrNull { it.id == initialSeriesId } ?: allSeries.first()
        bookId != null -> CommentaryData.getSeriesForBook(bookId) ?: allSeries.first()
        else -> allSeries.first()
    }
    var currentSeries by remember(initialSeriesId, bookId) { mutableStateOf(defaultSeries) }
    var filterToBook by remember(bookId) { mutableStateOf(bookId != null && bookNameEn != null) }

    val sections = if (filterToBook && bookId != null && bookNameEn != null && currentSeries.bookIds.contains(bookId)) {
        CommentaryData.getSectionsForBook(bookId, bookNameEn)
    } else {
        currentSeries.sections
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = RemoraCardBg,
        scrimColor = Color.Black.copy(alpha = 0.6f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = RemoraCardBorderHover) },
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${currentSeries.icon} ${currentSeries.title}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = if (filterToBook && bookNameEn != null) "Scholarly guides for $bookNameEn" else currentSeries.subtitle,
                        fontSize = 13.sp,
                        color = RemoraTextSecondary
                    )
                }

                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = RemoraTextMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Series Selector Horizontal Scroll
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                allSeries.forEach { s ->
                    val isSelected = s.id == currentSeries.id
                    Surface(
                        onClick = {
                            currentSeries = s
                            filterToBook = false
                        },
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) RemoraAccent.copy(alpha = 0.2f) else RemoraCardBgElevated,
                        border = BorderStroke(1.dp, if (isSelected) RemoraAccent else RemoraCardBorder)
                    ) {
                        Text(
                            text = "${s.icon} ${s.title.substringBefore(" Commentary").substringBefore(" /")}",
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) RemoraAccentLight else RemoraTextSecondary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
                        )
                    }
                }
            }

            if (bookNameEn != null && currentSeries.bookIds.contains(bookId ?: 0)) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (filterToBook) "Filtered to $bookNameEn" else "Showing full series",
                        fontSize = 12.sp,
                        color = RemoraTextMuted
                    )
                    TextButton(
                        onClick = { filterToBook = !filterToBook },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = if (filterToBook) "Show whole series" else "Filter to $bookNameEn",
                            fontSize = 13.sp,
                            color = RemoraAccent
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (sections.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No commentary data available for this section.",
                        fontSize = 13.sp,
                        color = RemoraTextMuted
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    sections.forEach { section ->
                        item {
                            CommentarySectionView(section = section)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CommentarySectionView(
    section: CommentarySection,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Section Header
        Text(
            text = section.heading.uppercase(),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = RemoraAccent
        )

        if (section.description.isNotBlank()) {
            Text(
                text = section.description,
                fontSize = 13.sp,
                color = RemoraTextMuted
            )
        }

        // Entries
        section.entries.forEach { entry ->
            CommentaryEntryCard(entry = entry)
        }

        // Section Note / Reading strategy
        if (section.note.isNotBlank()) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = RemoraCardBgElevated,
                border = BorderStroke(1.dp, RemoraCardBorderHover),
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "STRATEGY NOTE",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                        color = RemoraGold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = section.note,
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        color = RemoraTextSecondary
                    )
                }
            }
        }
    }
}

@Composable
fun CommentaryEntryCard(
    entry: CommentaryEntry,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = RemoraCardBgElevated,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Rank / Series Tag
                if (entry.rank.isNotBlank()) {
                    val badgeColor = when (entry.rank) {
                        "WBC" -> Color(0xFFF59E0B) // Amber
                        "NICOT", "NICNT" -> Color(0xFF3B82F6) // Blue
                        "BECNT" -> Color(0xFF10B981) // Emerald
                        "NAC" -> Color(0xFFF97316) // Orange
                        "NIGTC" -> Color(0xFF8B5CF6) // Violet
                        "PNTC" -> Color(0xFF6366F1) // Indigo
                        "TYNDALE", "TOTC" -> Color(0xFF14B8A6) // Teal
                        "ANCHOR" -> Color(0xFFEC4899) // Pink
                        "HERMENEIA" -> Color(0xFFEF4444) // Red
                        else -> RemoraAccent
                    }
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = badgeColor.copy(alpha = 0.15f),
                        border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.4f))
                    ) {
                        Text(
                            text = entry.rank,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = badgeColor,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                }

                if (entry.reference.isNotBlank()) {
                    Text(
                        text = entry.reference,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = RemoraTextMuted
                    )
                }
            }

            // Author and Title
            Text(
                text = entry.person,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = RemoraTextPrimary
            )

            // Quote / Appraisal
            Text(
                text = "\"${entry.quote}\"",
                fontSize = 14.sp,
                fontStyle = FontStyle.Italic,
                lineHeight = 20.sp,
                color = RemoraTextSecondary
            )

            // In-depth note
            if (entry.note.isNotBlank()) {
                Text(
                    text = entry.note,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    color = RemoraTextMuted
                )
            }
        }
    }
}
