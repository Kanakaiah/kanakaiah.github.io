package com.example.telugubible.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.*
import com.example.telugubible.util.BionicUtils

@Composable
fun TodayScreen(
    viewModel: TodayViewModel,
    onStartSession: (String?) -> Unit,
    onNavigateToPractice: (Long?) -> Unit,
    onNavigateToReader: (Int, Int) -> Unit,
    onNavigateToRetention: () -> Unit = {},
    onNavigateToGuide: (Int) -> Unit = {},
    onNavigateToThemes: () -> Unit = {},
    onFocusBookPractice: (Int) -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    var showNewCollectionDialog by remember { mutableStateOf(false) }

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
                // Header Row (Mockup: "Today" title on left, Streak Pill + Settings on right)
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp, bottom = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Today",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Serif,
                            color = RemoraTextPrimary,
                            letterSpacing = (-0.5).sp
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Streak Pill
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = RemoraCardBgElevated,
                                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                                modifier = Modifier.clickable { onNavigateToRetention() }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(
                                        Icons.Default.LocalFireDepartment,
                                        contentDescription = null,
                                        tint = RemoraAccent,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "${state.streak}-day streak",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextPrimary
                                    )
                                }
                            }

                            // Settings
                            IconButton(
                                onClick = onNavigateToSettings,
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    Icons.Default.Settings,
                                    contentDescription = "Settings",
                                    tint = RemoraTextSecondary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }

                // 1. Review Hero Card (Mockup: "REVIEW", "X verses are due", "About X minutes", Scope Dropdown, "Start review")
                item {
                    ReviewHeroCard(
                        dueCount = state.dueCount,
                        collections = state.collections,
                        selectedCollectionId = state.selectedCollectionId,
                        onSelectCollection = { viewModel.selectCollection(it) },
                        onStartSession = onStartSession
                    )
                }

                // 2. Collections Section (Mockup: "Collections", "New collection", Collection cards with progress and "Review" pill)
                item {
                    CollectionsSection(
                        collections = state.collections,
                        onNewCollection = { showNewCollectionDialog = true },
                        onReviewCollection = { collectionId ->
                            viewModel.selectCollection(collectionId)
                            onStartSession(collectionId)
                        }
                    )
                }

                // 2. Book Recall (Overdue chapter anchors & 66-card Book Themes)
                item {
                    BookRecallSection(
                        books = state.books,
                        dueChaptersByBook = state.dueChaptersByBook,
                        secureThemesCount = state.secureThemesCount,
                        dueThemesCount = state.dueThemesCount,
                        onBookClick = onNavigateToGuide,
                        onFocusBookPractice = onFocusBookPractice,
                        onThemesClick = onNavigateToThemes
                    )
                }

                // 3. Your Shape — 66-Book Canon Mastery Meter
                item {
                    ShapeMeter(
                        books = state.books,
                        masteryByBook = state.masteryByBook,
                        totalSecure = state.totalSecureChapters,
                        totalChapters = state.totalBibleChapters,
                        onBookClick = onNavigateToGuide,
                        onRetentionClick = onNavigateToRetention
                    )
                }

                // 4. Spaced Repetition Stats Row
                item {
                    SpacedRepetitionSummaryRow(
                        memorizedCount = state.memorizedCount,
                        learningCount = state.learningCount,
                        dueCount = state.dueCount
                    )
                }

                // 5. Search Filter Input
                item {
                    OutlinedTextField(
                        value = state.searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        placeholder = { Text("Search verses...", color = RemoraTextMuted, fontSize = 14.sp) },
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

                // 6. Filter Chips & Sort Controls Row (Matching PWD Dashboard.tsx)
                item {
                    FilterTabs(
                        currentFilter = state.filter,
                        currentSort = state.sortOrder,
                        allCount = state.verses.size,
                        dueCount = state.dueCount,
                        learningCount = state.learningCount,
                        memorizedCount = state.memorizedCount,
                        onSelectFilter = { viewModel.setFilter(it) },
                        onSelectSort = { viewModel.setSortOrder(it) }
                    )
                }

                // 6.5 Topic / Groups Filter Row
                item {
                    TopicFilterRow(
                        topics = state.topics,
                        selectedTopicId = state.selectedTopicId,
                        onSelectTopic = { viewModel.selectTopic(it) },
                        onOpenManageTopics = { viewModel.toggleManageTopicsSheet(true) }
                    )
                }

                // 7. Memory Verse Cards List
                if (state.filteredVerses.isEmpty()) {
                    item {
                        EmptyVerseState(
                            filter = state.filter,
                            isTotalLibraryEmpty = state.verses.isEmpty(),
                            onAddTop100 = { viewModel.addCollection("top_100") },
                            onAddWellKnown = { viewModel.addCollection("well_known") },
                            onOpenAdd = { viewModel.toggleAddDialog(true) }
                        )
                    }
                } else {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            Text(
                                text = "MEMORY VERSES (${state.filteredVerses.size})",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.8.sp,
                                color = RemoraTextMuted
                            )
                        }
                    }

                    items(state.filteredVerses, key = { it.id }) { verse ->
                        RemoraVerseCard(
                            verse = verse,
                            displayLanguage = state.displayLanguage,
                            topics = state.topics,
                            bionicReading = state.bionicReading,
                            recallMasking = state.recallMasking,
                            fontSizeMultiplier = state.fontSizeMultiplier,
                            onClick = { viewModel.selectVerseForDetail(verse) },
                            onPractice = { onNavigateToPractice(verse.id) },
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
                    onNavigateToPractice(detailVerse.id)
                },
                onReadInChapter = {
                    viewModel.selectVerseForDetail(null)
                    onNavigateToReader(detailVerse.bookId, detailVerse.chapter)
                },
                onDelete = {
                    viewModel.removeVerse(detailVerse.id)
                },
                topics = state.topics,
                onToggleTopic = { topicId -> viewModel.toggleVerseTopic(detailVerse.id, topicId) },
                onCreateTopicForVerse = { name -> viewModel.createTopicForVerse(detailVerse.id, name) }
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

        // Add Verse Sheet (Modal Bottom Sheet with 3 Tabs matching PWD)
        if (state.showAddDialog) {
            AddVerseSheet(
                books = state.books,
                topics = state.topics,
                searchResults = state.searchResults,
                isSearching = state.isSearchingInDialog,
                activeVersion = state.activeVersion,
                onDismiss = { viewModel.toggleAddDialog(false) },
                onAddSingleVerse = { bookId, ch, vs, endVs, topicIds -> viewModel.addVerse(bookId, ch, vs, endVs, topicIds) },
                onAddIndividually = { verses, topicIds -> viewModel.addVersesIndividually(verses, topicIds) },
                onAddManualVerse = { ref, text, trans, topicIds -> viewModel.addManualVerse(ref, text, trans, topicIds) },
                onAddCollection = { collId, topicIds -> viewModel.addCollection(collId, topicIds) },
                onSearchVerses = { q, trans -> viewModel.searchVersesForDialog(q, trans) },
                onCreateTopic = { viewModel.createTopic(it) },
                onNavigateToGuides = {
                    viewModel.toggleAddDialog(false)
                    onNavigateToGuide(1)
                }
            )
        }

        // Manage Topics Sheet (Modal Bottom Sheet)
        if (state.showManageTopicsSheet) {
            ManageTopicsSheet(
                topics = state.topics,
                onDismiss = { viewModel.toggleManageTopicsSheet(false) },
                onCreateTopic = { viewModel.createTopic(it) },
                onRenameTopic = { id, name -> viewModel.renameTopic(id, name) },
                onDeleteTopic = { viewModel.deleteTopic(it) }
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

        // Blocking Loading Overlay while adding preset collections (75 / 100 verses)
        state.addingProgress?.let { progress ->
            androidx.compose.ui.window.Dialog(
                onDismissRequest = { /* Block dismissal while loading */ },
                properties = androidx.compose.ui.window.DialogProperties(
                    dismissOnBackPress = false,
                    dismissOnClickOutside = false,
                    usePlatformDefaultWidth = false
                )
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.75f))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = {} // Intercepts all clicks
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = RemoraCardBgElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier
                            .fillMaxWidth(0.85f)
                            .padding(24.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            CircularProgressIndicator(
                                color = RemoraAccent,
                                modifier = Modifier.size(44.dp),
                                strokeWidth = 4.dp
                            )
                            Text(
                                text = "Adding ${progress.collectionName}",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Text(
                                text = "${progress.current} of ${progress.total} loaded...",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = RemoraAccentLight,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            val fraction = if (progress.total > 0) {
                                (progress.current.toFloat() / progress.total).coerceIn(0f, 1f)
                            } else 0f
                            LinearProgressIndicator(
                                progress = { fraction },
                                color = RemoraAccent,
                                trackColor = RemoraCardBorder,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp))
                            )
                            Text(
                                text = "Please wait while passages are prepared...",
                                fontSize = 12.sp,
                                color = RemoraTextMuted,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
        // New Collection Dialog (Mockup: Add Curated or Custom Collection)
        if (showNewCollectionDialog) {
            NewCollectionDialog(
                presetCollections = state.presetCollections,
                onDismiss = { showNewCollectionDialog = false },
                onCreateCustom = { name -> viewModel.createTopic(name) },
                onAddPreset = { presetId -> viewModel.addCollection(presetId, emptyList()) }
            )
        }
    }
}

@Composable
private fun ReviewHeroCard(
    dueCount: Int,
    collections: List<CollectionCardItem>,
    selectedCollectionId: String?,
    onSelectCollection: (String?) -> Unit,
    onStartSession: (String?) -> Unit
) {
    val selectedCollection = collections.find { it.id == selectedCollectionId }
    val displayDue = selectedCollection?.dueCount ?: dueCount
    val minutes = kotlin.math.max(1, kotlin.math.ceil(displayDue * 0.5).toInt())
    var scopeMenuExpanded by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Label: "REVIEW"
            Text(
                text = "REVIEW",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp,
                color = RemoraAccent
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Headline: "12 verses are due"
            Text(
                text = if (displayDue > 0) "$displayDue ${if (displayDue == 1) "verse is" else "verses are"} due" else "All caught up",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = RemoraTextPrimary,
                letterSpacing = (-0.3).sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Subtitle: "About 6 minutes. Weakest verses come first."
            Text(
                text = if (displayDue > 0) {
                    "About $minutes ${if (minutes == 1) "minute" else "minutes"}. Weakest verses come first."
                } else {
                    "Great job! You have reviewed all scheduled verses for today."
                },
                fontSize = 14.sp,
                color = RemoraTextSecondary,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(18.dp))

            // Scope Dropdown Box: "From: All collections  ▼"
            Box(modifier = Modifier.fillMaxWidth()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RemoraCardBgElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { scopeMenuExpanded = true }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "From: ${selectedCollection?.name ?: "All collections"}",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraTextPrimary
                        )
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = "Select collection",
                            tint = RemoraTextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                DropdownMenu(
                    expanded = scopeMenuExpanded,
                    onDismissRequest = { scopeMenuExpanded = false },
                    modifier = Modifier.background(RemoraCardBgElevated)
                ) {
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = "All collections",
                                fontWeight = if (selectedCollectionId == null) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedCollectionId == null) RemoraAccent else RemoraTextPrimary
                            )
                        },
                        onClick = {
                            onSelectCollection(null)
                            scopeMenuExpanded = false
                        }
                    )
                    collections.forEach { collection ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = collection.name,
                                    fontWeight = if (selectedCollectionId == collection.id) FontWeight.Bold else FontWeight.Normal,
                                    color = if (selectedCollectionId == collection.id) RemoraAccent else RemoraTextPrimary
                                )
                            },
                            onClick = {
                                onSelectCollection(collection.id)
                                scopeMenuExpanded = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Primary Start review button (Solid Gold with dark text)
            Button(
                onClick = { onStartSession(selectedCollectionId) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = RemoraAccent,
                    contentColor = Color(0xFF141414)
                ),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text(
                    text = "Start review",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFF141414)
                )
            }
        }
    }
}

@Composable
private fun CollectionsSection(
    collections: List<CollectionCardItem>,
    onNewCollection: () -> Unit,
    onReviewCollection: (String) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Collections",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = RemoraTextPrimary
            )
            Text(
                text = "New collection",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = RemoraAccent,
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .clickable { onNewCollection() }
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            )
        }

        if (collections.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "No collections yet. Tap 'New collection' to add one.",
                    fontSize = 13.sp,
                    color = RemoraTextMuted,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            collections.forEach { item ->
                CollectionCard(
                    item = item,
                    onReview = { onReviewCollection(item.id) }
                )
            }
        }
    }
}

@Composable
private fun CollectionCard(
    item: CollectionCardItem,
    onReview: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.name,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    val statsText = if (item.isPreset) {
                        "${item.dueCount} due · ${item.learnedCount} of ${item.totalCount} learned"
                    } else {
                        "${item.dueCount} due · ${item.totalCount} ${if (item.totalCount == 1) "verse" else "verses"}"
                    }
                    Text(
                        text = statsText,
                        fontSize = 13.sp,
                        color = RemoraTextMuted
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                OutlinedButton(
                    onClick = onReview,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraAccent),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = RemoraAccent
                    ),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Review",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraAccent
                    )
                }
            }

            if (item.totalCount > 0) {
                Spacer(modifier = Modifier.height(12.dp))
                val fraction = (item.learnedCount.toFloat() / item.totalCount.coerceAtLeast(1)).coerceIn(0f, 1f)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(1.5.dp))
                        .background(RemoraCardBorder)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction)
                            .fillMaxHeight()
                            .background(RemoraAccent)
                    )
                }
            }
        }
    }
}

@Composable
private fun NewCollectionDialog(
    presetCollections: List<PresetCollection>,
    onDismiss: () -> Unit,
    onCreateCustom: (String) -> Unit,
    onAddPreset: (String) -> Unit
) {
    var collectionName by remember { mutableStateOf("") }
    val curatedSuggestions = listOf("Top 100", "Anxiety", "Peace", "Courage", "Faith & Trust", "Salvation")

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = RemoraCardBgElevated,
        title = {
            Text(
                text = "New Collection",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = RemoraTextPrimary
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = collectionName,
                    onValueChange = { collectionName = it },
                    placeholder = { Text("e.g. Hope, Healing, Romans 8", color = RemoraTextMuted, fontSize = 14.sp) },
                    label = { Text("Collection Name", color = RemoraAccent) },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
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

                Text(
                    text = "Or choose a curated collection:",
                    fontSize = 12.sp,
                    color = RemoraTextSecondary,
                    fontWeight = FontWeight.Medium
                )

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    curatedSuggestions.forEach { suggestion ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = RemoraCardBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.clickable {
                                val matchedPreset = presetCollections.find { it.title.equals(suggestion, ignoreCase = true) }
                                if (matchedPreset != null) {
                                    onAddPreset(matchedPreset.id)
                                    onDismiss()
                                } else {
                                    collectionName = suggestion
                                }
                            }
                        ) {
                            Text(
                                text = suggestion,
                                fontSize = 12.sp,
                                color = RemoraAccentLight,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val trimmed = collectionName.trim()
                    if (trimmed.isNotEmpty()) {
                        val matchedPreset = presetCollections.find { it.title.equals(trimmed, ignoreCase = true) }
                        if (matchedPreset != null) {
                            onAddPreset(matchedPreset.id)
                        } else {
                            onCreateCustom(trimmed)
                        }
                        onDismiss()
                    }
                },
                enabled = collectionName.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Create", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = RemoraTextMuted)
            }
        }
    )
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
    currentSort: VerseSortOrder,
    allCount: Int,
    dueCount: Int,
    learningCount: Int,
    memorizedCount: Int,
    onSelectFilter: (VerseFilter) -> Unit,
    onSelectSort: (VerseSortOrder) -> Unit
) {
    var isSortMenuOpen by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f).padding(end = 8.dp)
        ) {
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

        // Sort Dropdown Button matching PWD Dashboard.tsx
        Box {
            Surface(
                onClick = { isSortMenuOpen = true },
                shape = RoundedCornerShape(8.dp),
                color = RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.height(34.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.SwapVert,
                        contentDescription = "Sort",
                        tint = RemoraTextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = currentSort.shortLabel,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraTextPrimary
                    )
                }
            }

            DropdownMenu(
                expanded = isSortMenuOpen,
                onDismissRequest = { isSortMenuOpen = false },
                modifier = Modifier.background(RemoraCardBgElevated)
            ) {
                VerseSortOrder.entries.forEach { sort ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = sort.label,
                                fontSize = 14.sp,
                                fontWeight = if (currentSort == sort) FontWeight.Bold else FontWeight.Normal,
                                color = if (currentSort == sort) RemoraAccent else RemoraTextPrimary
                            )
                        },
                        onClick = {
                            onSelectSort(sort)
                            isSortMenuOpen = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun TopicFilterRow(
    topics: List<Topic>,
    selectedTopicId: String?,
    onSelectTopic: (String?) -> Unit,
    onOpenManageTopics: () -> Unit
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        // "All Groups" Chip
        item {
            val isSelected = selectedTopicId == null
            Surface(
                onClick = { onSelectTopic(null) },
                shape = RoundedCornerShape(8.dp),
                color = if (isSelected) RemoraAccentLight.copy(alpha = 0.2f) else RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isSelected) RemoraAccentLight else RemoraCardBorder
                )
            ) {
                Text(
                    text = "All Groups",
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) RemoraAccentLight else RemoraTextSecondary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        // Individual Topic Chips
        items(topics, key = { it.id }) { topic ->
            val isSelected = selectedTopicId == topic.id
            Surface(
                onClick = { onSelectTopic(topic.id) },
                shape = RoundedCornerShape(8.dp),
                color = if (isSelected) RemoraAccent.copy(alpha = 0.2f) else RemoraCardBg,
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isSelected) RemoraAccent else RemoraCardBorder
                )
            ) {
                Text(
                    text = topic.name,
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) RemoraAccentLight else RemoraTextSecondary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }

        // "Manage Groups" button
        item {
            Surface(
                onClick = onOpenManageTopics,
                shape = RoundedCornerShape(8.dp),
                color = Color.Transparent,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = null,
                        tint = RemoraTextMuted,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Manage Groups",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = RemoraTextMuted
                    )
                }
            }
        }
    }
}

@Composable
private fun RemoraVerseCard(
    verse: UserMemoryVerse,
    displayLanguage: DisplayLanguage,
    topics: List<Topic> = emptyList(),
    bionicReading: Boolean = false,
    recallMasking: Boolean = false,
    fontSizeMultiplier: Float = 1.0f,
    onClick: () -> Unit = {},
    onPractice: () -> Unit,
    onRead: () -> Unit,
    onDelete: () -> Unit
) {
    val isDue = verse.nextDueDate <= System.currentTimeMillis()
    val isMemorized = verse.status == "memorized"
    val indicatorColor = if (isDue || isMemorized) RemoraGold else RemoraAccent

    var isMaskRevealed by remember(verse.id) { mutableStateOf(false) }
    val isEnglish = displayLanguage == DisplayLanguage.ENGLISH
    val refText = verse.fullRef(isEnglish)
    val rawCurrentText = (if (isEnglish) verse.textEn else verse.textTe)
    val currentVerseText = (rawCurrentText ?: (if (isEnglish) verse.textTe else verse.textEn) ?: "").replace(Regex("<[^>]+>"), "").replace("&nbsp;", " ").trim()

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
                // Header: Ref + Status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = refText,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )

                    Text(
                        text = when {
                            isDue -> "DUE NOW"
                            isMemorized -> "MEMORIZED"
                            else -> "LEARNING"
                        },
                        fontSize = 12.sp,
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
                    val formattedText = remember(currentVerseText, bionicReading) {
                        BionicUtils.formatBionic(currentVerseText, bionicReading)
                    }
                    val isMasked = recallMasking && !isMaskRevealed

                    val cardBaseSize = if (isEnglish) 14.5f else 16.5f
                    val cardScaledSize = (cardBaseSize * fontSizeMultiplier.coerceIn(0.82f, 1.55f)).sp
                    val cardLineHeight = (cardScaledSize.value * 1.55f).sp

                    Text(
                        text = formattedText,
                        fontSize = cardScaledSize,
                        lineHeight = cardLineHeight,
                        color = RemoraTextPrimary,
                        modifier = Modifier
                            .fillMaxWidth()
                            .blur(if (isMasked) 6.dp else 0.dp)
                            .alpha(if (isMasked) 0.5f else 1.0f)
                    )
                }

                // Topic Pills on Card
                if (verse.topicIds.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val verseTopicNames = verse.topicIds.mapNotNull { tId ->
                            topics.firstOrNull { it.id == tId }?.name
                        }
                        for (name in verseTopicNames.take(3)) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = RemoraAccent.copy(alpha = 0.12f),
                                border = androidx.compose.foundation.BorderStroke(0.5.dp, RemoraAccent.copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = name,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraAccentLight,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                        if (verseTopicNames.size > 3) {
                            Text(
                                text = "+${verseTopicNames.size - 3}",
                                fontSize = 11.sp,
                                color = RemoraTextMuted
                            )
                        }
                    }
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
                                    fontSize = 12.sp,
                                    color = if (i < score) RemoraAccent else RemoraTextMuted.copy(alpha = 0.4f)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Mastery: $score/5",
                            fontSize = 12.sp,
                            color = RemoraTextMuted
                        )
                    }

                    // Action buttons
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedButton(
                            onClick = onRead,
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, tint = RemoraTextSecondary, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Read", fontSize = 12.sp, color = RemoraTextSecondary)
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
    isTotalLibraryEmpty: Boolean,
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
        Button(
            onClick = onOpenAdd,
            colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
            shape = RoundedCornerShape(8.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(if (isTotalLibraryEmpty) "Add Your First Verse" else "Add a Verse", fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }

        if (isTotalLibraryEmpty) {
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = "Verses you add are scheduled for review using spaced repetition. You'll see them frequently at first, then at increasing intervals as you secure them in memory.",
                fontSize = 13.sp,
                color = RemoraTextMuted,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                lineHeight = 19.sp,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))
            TextButton(onClick = onAddWellKnown) {
                Text(
                    text = "Or start with 75 well-known passages",
                    color = RemoraAccent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            TextButton(onClick = onAddTop100) {
                Text(
                    text = "Or start with the Top 100 most popular verses",
                    color = RemoraAccent,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
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
