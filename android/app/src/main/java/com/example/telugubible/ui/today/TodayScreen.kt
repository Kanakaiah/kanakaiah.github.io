package com.example.telugubible.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.*

@Composable
fun TodayScreen(
    viewModel: TodayViewModel,
    onNavigateToPractice: () -> Unit,
    onNavigateToReader: (Int, Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
    ) {
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RemoraAccent)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 12.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Remora Hero: Daily Practice
                item {
                    RemoraHeroDailyPractice(
                        heroVerse = state.heroVerse,
                        dueCount = state.dueCount,
                        displayLanguage = state.displayLanguage,
                        onStartSession = onNavigateToPractice
                    )
                }

                // 2. Curated Collections Banners (Top 100 & 75 Well-Known)
                item {
                    CuratedCollectionsSection(
                        onAddTop100 = { viewModel.addCollection("top_100") },
                        onAddWellKnown = { viewModel.addCollection("well_known") }
                    )
                }

                // 3. Spaced Repetition Stats Row
                item {
                    SpacedRepetitionSummaryRow(
                        memorizedCount = state.memorizedCount,
                        learningCount = state.learningCount,
                        dueCount = state.dueCount
                    )
                }

                // 4. Translation Language Selector (BSB English vs IRV Telugu)
                item {
                    LanguageSelectorRow(
                        currentLanguage = state.displayLanguage,
                        onSelectLanguage = { viewModel.setDisplayLanguage(it) }
                    )
                }

                // 5. Search Filter Input
                item {
                    OutlinedTextField(
                        value = state.searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        placeholder = { Text("Search verses...", color = RemoraTextMuted, fontSize = 13.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = RemoraTextMuted) },
                        trailingIcon = {
                            if (state.searchQuery.isNotEmpty()) {
                                IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = RemoraTextMuted)
                                }
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = RemoraCardBg,
                            unfocusedContainerColor = RemoraCardBg,
                            focusedTextColor = RemoraTextPrimary,
                            unfocusedTextColor = RemoraTextPrimary,
                            focusedBorderColor = RemoraAccent,
                            unfocusedBorderColor = RemoraCardBorder
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // 6. Filter Chips Row
                item {
                    FilterTabs(
                        currentFilter = state.filter,
                        allCount = state.verses.size,
                        dueCount = state.dueCount,
                        learningCount = state.learningCount,
                        memorizedCount = state.memorizedCount,
                        onSelectFilter = { viewModel.setFilter(it) }
                    )
                }

                // 7. Memory Verse Cards List
                if (state.filteredVerses.isEmpty()) {
                    item {
                        EmptyVerseState(
                            filter = state.filter,
                            onAddTop100 = { viewModel.addCollection("top_100") },
                            onAddWellKnown = { viewModel.addCollection("well_known") },
                            onOpenAdd = { viewModel.toggleAddDialog(true) }
                        )
                    }
                } else {
                    items(state.filteredVerses, key = { it.id }) { verse ->
                        RemoraVerseCard(
                            verse = verse,
                            displayLanguage = state.displayLanguage,
                            onClick = { viewModel.selectVerseForDetail(verse) },
                            onPractice = onNavigateToPractice,
                            onRead = { onNavigateToReader(verse.bookId, verse.chapter) },
                            onDelete = { viewModel.removeVerse(verse.id) }
                        )
                    }
                }
            }
        }

        // Verse Detail Sheet (Modal Bottom Sheet on card tap)
        state.selectedVerseForDetail?.let { detailVerse ->
            val filteredList = state.filteredVerses
            val currentIndex = filteredList.indexOfFirst { it.id == detailVerse.id }
            VerseDetailSheet(
                verse = detailVerse,
                displayLanguage = state.displayLanguage,
                hasPrev = currentIndex > 0,
                hasNext = currentIndex != -1 && currentIndex + 1 < filteredList.size,
                onPrev = { viewModel.selectPreviousVerse() },
                onNext = { viewModel.selectNextVerse() },
                onToggleLanguage = { viewModel.toggleDisplayLanguage() },
                onDismiss = { viewModel.selectVerseForDetail(null) },
                onPractice = {
                    viewModel.selectVerseForDetail(null)
                    onNavigateToPractice()
                },
                onReadInChapter = {
                    viewModel.selectVerseForDetail(null)
                    onNavigateToReader(detailVerse.bookId, detailVerse.chapter)
                },
                onDelete = {
                    viewModel.removeVerse(detailVerse.id)
                }
            )
        }

        // Floating Action Button (+) — Terracotta circle, always visible above navigation
        FloatingActionButton(
            onClick = { viewModel.toggleAddDialog(true) },
            containerColor = RemoraAccent,
            contentColor = Color.White,
            shape = CircleShape,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 20.dp, bottom = 24.dp)
                .size(56.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add Verse", modifier = Modifier.size(26.dp))
        }

        // Add Verse Sheet (Modal Bottom Sheet with 3 Tabs)
        if (state.showAddDialog) {
            AddVerseSheet(
                books = state.books,
                collections = state.presetCollections,
                searchResults = state.searchResults,
                isSearching = state.isSearchingInDialog,
                onDismiss = { viewModel.toggleAddDialog(false) },
                onAddSingleVerse = { bookId, ch, vs -> viewModel.addVerse(bookId, ch, vs) },
                onAddCollection = { collId -> viewModel.addCollection(collId) },
                onSearchVerses = { q -> viewModel.searchVersesForDialog(q) }
            )
        }

        // Notification Snackbar
        state.messageBanner?.let { msg ->
            Snackbar(
                action = {
                    TextButton(onClick = { viewModel.dismissMessage() }) {
                        Text("OK", color = RemoraAccentLight)
                    }
                },
                containerColor = RemoraCardBgElevated,
                contentColor = RemoraTextPrimary,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 80.dp)
            ) {
                Text(msg)
            }
        }
    }
}

@Composable
private fun RemoraHeroDailyPractice(
    heroVerse: UserMemoryVerse?,
    dueCount: Int,
    displayLanguage: DisplayLanguage,
    onStartSession: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = RemoraAccent,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "DAILY PRACTICE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        color = RemoraAccent
                    )
                }

                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = RemoraCardBgElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                ) {
                    Text(
                        text = if (displayLanguage == DisplayLanguage.ENGLISH) "BSB" else "IRV",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraAccentLight,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (heroVerse != null && dueCount > 0) {
                val isEnglish = displayLanguage == DisplayLanguage.ENGLISH
                val heroRef = if (isEnglish) "${heroVerse.bookNameEn} ${heroVerse.chapter}:${heroVerse.verse}"
                              else "${heroVerse.bookNameTe} ${heroVerse.chapter}:${heroVerse.verse}"
                val targetText = (if (isEnglish) heroVerse.textEn else heroVerse.textTe)
                    ?: heroVerse.textEn ?: heroVerse.textTe ?: ""

                Text(
                    text = heroRef,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )

                Spacer(modifier = Modifier.height(8.dp))

                // First Letter Memory Cue
                val cue = buildFirstLetterCue(targetText)
                if (cue.isNotBlank()) {
                    Text(
                        text = cue,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 1.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 22.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                Text(
                    text = if (dueCount == 1) "1 verse due for review" else "$dueCount verses due for review",
                    fontSize = 13.sp,
                    color = RemoraTextMuted
                )

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onStartSession,
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp)
                ) {
                    Text("Start Session", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                }
            } else {
                Text(
                    text = "All caught up",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "No verses currently due. Review your memorized verses anytime or add more from the curated collections below.",
                    fontSize = 13.sp,
                    color = RemoraTextSecondary,
                    lineHeight = 18.sp
                )
            }
        }
    }
}

@Composable
private fun CuratedCollectionsSection(
    onAddTop100: () -> Unit,
    onAddWellKnown: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "CURATED COLLECTIONS",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
            color = RemoraTextMuted
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Top 100 Card
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.weight(1f)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "Top 100 Verses",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Most popular global passages.",
                        fontSize = 11.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 15.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = onAddTop100,
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Top 100", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // 75 Well-Known Card
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.weight(1f)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "75 Well-Known",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Essential & encouraging verses.",
                        fontSize = 11.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 15.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = onAddWellKnown,
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraGold),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = RemoraGold, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add 75 Verses", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = RemoraGold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SpacedRepetitionSummaryRow(
    memorizedCount: Int,
    learningCount: Int,
    dueCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        MetricPill(label = "DUE", count = dueCount, color = RemoraAccent, modifier = Modifier.weight(1f))
        MetricPill(label = "LEARNING", count = learningCount, color = GradeGood, modifier = Modifier.weight(1f))
        MetricPill(label = "MEMORIZED", count = memorizedCount, color = GradeEasy, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun MetricPill(
    label: String,
    count: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                color = color
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "$count",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = RemoraTextPrimary
            )
        }
    }
}

@Composable
private fun FilterTabs(
    currentFilter: VerseFilter,
    allCount: Int,
    dueCount: Int,
    learningCount: Int,
    memorizedCount: Int,
    onSelectFilter: (VerseFilter) -> Unit
) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        val items = listOf(
            Triple(VerseFilter.ALL, "All verses", allCount),
            Triple(VerseFilter.DUE, "Review due", dueCount),
            Triple(VerseFilter.LEARNING, "Learning", learningCount),
            Triple(VerseFilter.MEMORIZED, "Memorized", memorizedCount)
        )
        items(items) { (filter, label, count) ->
            val isSelected = currentFilter == filter
            Surface(
                onClick = { onSelectFilter(filter) },
                shape = RoundedCornerShape(8.dp),
                color = if (isSelected) RemoraAccent else RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isSelected) RemoraAccent else RemoraCardBorder
                )
            ) {
                Text(
                    text = "$label ($count)",
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) Color.White else RemoraTextSecondary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
private fun LanguageSelectorRow(
    currentLanguage: DisplayLanguage,
    onSelectLanguage: (DisplayLanguage) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(4.dp)
        ) {
            val isEnglish = currentLanguage == DisplayLanguage.ENGLISH
            Surface(
                onClick = { onSelectLanguage(DisplayLanguage.ENGLISH) },
                shape = RoundedCornerShape(8.dp),
                color = if (isEnglish) RemoraAccent else Color.Transparent,
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "English",
                        fontSize = 13.sp,
                        fontWeight = if (isEnglish) FontWeight.Bold else FontWeight.Medium,
                        color = if (isEnglish) Color.White else RemoraTextSecondary
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isEnglish) Color.White.copy(alpha = 0.2f) else RemoraCardBgElevated
                    ) {
                        Text(
                            text = "BSB",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isEnglish) Color.White else RemoraTextMuted,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }

            val isTelugu = currentLanguage == DisplayLanguage.TELUGU
            Surface(
                onClick = { onSelectLanguage(DisplayLanguage.TELUGU) },
                shape = RoundedCornerShape(8.dp),
                color = if (isTelugu) RemoraAccent else Color.Transparent,
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "తెలుగు",
                        fontSize = 13.sp,
                        fontWeight = if (isTelugu) FontWeight.Bold else FontWeight.Medium,
                        color = if (isTelugu) Color.White else RemoraTextSecondary
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (isTelugu) Color.White.copy(alpha = 0.2f) else RemoraCardBgElevated
                    ) {
                        Text(
                            text = "IRV",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isTelugu) Color.White else RemoraTextMuted,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RemoraVerseCard(
    verse: UserMemoryVerse,
    displayLanguage: DisplayLanguage,
    onClick: () -> Unit = {},
    onPractice: () -> Unit,
    onRead: () -> Unit,
    onDelete: () -> Unit
) {
    val isDue = verse.nextDueDate <= System.currentTimeMillis()
    val isMemorized = verse.status == "memorized"
    val indicatorColor = if (isDue || isMemorized) RemoraGold else RemoraAccent

    var cardLanguage by remember(displayLanguage) { mutableStateOf(displayLanguage) }
    val isEnglish = cardLanguage == DisplayLanguage.ENGLISH
    val refText = if (isEnglish) "${verse.bookNameEn} ${verse.chapter}:${verse.verse}"
                  else "${verse.bookNameTe} ${verse.chapter}:${verse.verse}"
    val badgeText = if (isEnglish) "BSB" else "IRV"
    val currentVerseText = (if (isEnglish) verse.textEn else verse.textTe)
        ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Left color hairline indicator
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(indicatorColor)
            )

            Column(modifier = Modifier.padding(16.dp)) {
                // Header: Ref + Translation badge + Status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = refText,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        // Interactive translation badge: tapping it toggles translation for this card
                        Surface(
                            onClick = {
                                cardLanguage = if (isEnglish) DisplayLanguage.TELUGU else DisplayLanguage.ENGLISH
                            },
                            shape = RoundedCornerShape(4.dp),
                            color = RemoraCardBgElevated,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = badgeText,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraAccentLight
                                )
                                Spacer(modifier = Modifier.width(3.dp))
                                Text(
                                    text = "⇄",
                                    fontSize = 9.sp,
                                    color = RemoraTextMuted
                                )
                            }
                        }
                    }

                    Text(
                        text = when {
                            isDue -> "DUE NOW"
                            isMemorized -> "MEMORIZED"
                            else -> "LEARNING"
                        },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            isDue -> RemoraGold
                            isMemorized -> GradeEasy
                            else -> RemoraAccent
                        }
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Single-Translation Text Block (NO stacked duplicate languages)
                if (currentVerseText.isNotBlank()) {
                    Text(
                        text = currentVerseText,
                        fontSize = if (isEnglish) 14.sp else 16.sp,
                        lineHeight = if (isEnglish) 21.sp else 25.sp,
                        color = RemoraTextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = RemoraCardBorder, thickness = 1.dp)
                Spacer(modifier = Modifier.height(10.dp))

                // Footer: Mastery Dots + Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Mastery Dots (5 dots)
                    val score = verse.repetition.coerceIn(0, 5)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            for (i in 0 until 5) {
                                Text(
                                    text = if (i < score) "●" else "○",
                                    fontSize = 11.sp,
                                    color = if (i < score) RemoraAccent else RemoraTextMuted.copy(alpha = 0.4f)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Mastery: $score/5",
                            fontSize = 11.sp,
                            color = RemoraTextMuted
                        )
                    }

                    // Action buttons
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedButton(
                            onClick = onRead,
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, tint = RemoraTextSecondary, modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Read", fontSize = 11.sp, color = RemoraTextSecondary)
                        }

                        IconButton(
                            onClick = onDelete,
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = RemoraTextMuted, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyVerseState(
    filter: VerseFilter,
    onAddTop100: () -> Unit,
    onAddWellKnown: () -> Unit,
    onOpenAdd: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, tint = RemoraTextMuted, modifier = Modifier.size(44.dp))
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = when (filter) {
                VerseFilter.DUE -> "No verses currently due for review."
                VerseFilter.MEMORIZED -> "No memorized verses yet."
                VerseFilter.LEARNING -> "No verses currently in learning."
                VerseFilter.ALL -> "No verses found in your library."
            },
            fontSize = 14.sp,
            color = RemoraTextSecondary
        )
        Spacer(modifier = Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = onAddTop100,
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Add Top 100", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            OutlinedButton(
                onClick = onAddWellKnown,
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraGold)
            ) {
                Text("Add 75 Well-Known", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = RemoraGold)
            }
        }
    }
}

private fun buildFirstLetterCue(text: String): String {
    return text.split("\\s+".toRegex())
        .take(16)
        .mapNotNull { word ->
            val first = word.firstOrNull { it.isLetterOrDigit() }
            if (first != null) "$first " else null
        }
        .joinToString("")
        .trim() + "..."
}
