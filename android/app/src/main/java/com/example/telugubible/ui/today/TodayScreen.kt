package com.example.telugubible.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookMasteryCounts
import com.example.telugubible.util.BookNameUtils

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
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
            val totalDueChapters = state.dueChaptersByBook.values.sum()

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 12.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Header Row: "Today" on left, "X-day streak" pill + Settings on right
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp, bottom = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Today",
                            fontSize = 34.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Serif,
                            color = RemoraTextPrimary,
                            letterSpacing = (-0.5).sp
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(
                                shape = RoundedCornerShape(22.dp),
                                color = RemoraCardBg,
                                border = BorderStroke(1.dp, RemoraCardBorder),
                                modifier = Modifier.clickable { onNavigateToRetention() }
                            ) {
                                Text(
                                    text = "${state.streak}-day streak",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextPrimary,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
                                )
                            }

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

                // 1. Hero Review Card ("REVIEW", "X verses are due", "From: All", "Order: Weakest", "Start review")
                item {
                    ReviewHeroCard(
                        dueCount = state.dueCount,
                        totalVersesCount = state.verses.size,
                        collections = state.collections,
                        selectedCollectionId = state.selectedCollectionId,
                        reviewOrder = state.reviewOrder,
                        onSelectCollection = { viewModel.selectCollection(it) },
                        onSelectOrder = { viewModel.setReviewOrder(it) },
                        onStartSession = { collectionId -> onStartSession(collectionId) }
                    )
                }

                // 2. Collections Section (Verse Groups + Book Themes + Chapter Themes — NO individual verse cards)
                item {
                    CollectionsSection(
                        collections = state.collections,
                        dueThemesCount = state.dueThemesCount,
                        secureThemesCount = state.secureThemesCount,
                        dueChaptersCount = totalDueChapters,
                        secureChaptersCount = state.totalSecureChapters,
                        totalChaptersCount = state.totalBibleChapters,
                        onAddVerses = { viewModel.toggleAddDialog(true) },
                        onNewCollection = { showNewCollectionDialog = true },
                        onInspectCollection = { collectionId ->
                            viewModel.setInspectingCollection(collectionId)
                        },
                        onReviewCollection = { collectionId ->
                            viewModel.selectCollection(collectionId)
                            onStartSession(collectionId)
                        },
                        onReviewBookThemes = onNavigateToThemes,
                        onOpenChapterThemesBookPicker = {
                            viewModel.setShowChapterThemeBookPicker(true)
                        }
                    )
                }
            }
        }

        // Collection Verses Inspection Sheet (When tapping a collection card's body)
        state.inspectingCollectionId?.let { inspectId ->
            val collectionItem = state.collections.find { it.id == inspectId }
            val generalTopicId = state.topics.find { it.name.equals("General", ignoreCase = true) }?.id
            val versesInCollection = remember(state.verses, inspectId, generalTopicId) {
                when {
                    inspectId == DEFAULT_GENERAL_COLLECTION_ID || (generalTopicId != null && inspectId == generalTopicId) -> {
                        state.verses.filter { it.topicIds.isEmpty() || (generalTopicId != null && it.topicIds.contains(generalTopicId)) }
                    }
                    else -> state.verses.filter { it.topicIds.contains(inspectId) }
                }
            }
            if (collectionItem != null) {
                CollectionVersesSheet(
                    collection = collectionItem,
                    verses = versesInCollection,
                    displayLanguage = state.displayLanguage,
                    canDeleteCollection = inspectId != DEFAULT_GENERAL_COLLECTION_ID,
                    onDismiss = { viewModel.setInspectingCollection(null) },
                    onReviewCollection = {
                        viewModel.setInspectingCollection(null)
                        viewModel.selectCollection(inspectId)
                        onStartSession(inspectId)
                    },
                    onAddVersesToCollection = {
                        viewModel.setInspectingCollection(null)
                        viewModel.toggleAddDialog(true)
                    },
                    onDeleteCollection = {
                        viewModel.setInspectingCollection(null)
                        viewModel.deleteTopic(inspectId)
                    },
                    onSelectVerse = { verse ->
                        viewModel.selectVerseForDetail(verse)
                    },
                    onRemoveVerse = { verseId ->
                        viewModel.removeVerse(verseId)
                    }
                )
            }
        }

        // 66-Book Selector Sheet for Chapter Themes Memorization
        if (state.showChapterThemeBookPicker) {
            ChapterThemeBookPickerSheet(
                books = state.books,
                masteryByBook = state.masteryByBook,
                dueChaptersByBook = state.dueChaptersByBook,
                activeVersion = state.activeVersion,
                onDismiss = { viewModel.setShowChapterThemeBookPicker(false) },
                onSelectBook = { bookId ->
                    viewModel.setShowChapterThemeBookPicker(false)
                    onFocusBookPractice(bookId)
                }
            )
        }

        // Verse Detail Sheet (When inspecting a verse inside a collection sheet)
        state.selectedVerseForDetail?.let { detailVerse ->
            val filteredList = state.verses
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
                    viewModel.setInspectingCollection(null)
                    onNavigateToPractice(detailVerse.id)
                },
                onReadInChapter = {
                    viewModel.selectVerseForDetail(null)
                    viewModel.setInspectingCollection(null)
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

        // Add Verse Sheet
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

        // Manage Topics Sheet
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
                            onClick = {}
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = RemoraCardBgElevated,
                        border = BorderStroke(1.dp, RemoraCardBorder),
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
                                textAlign = TextAlign.Center
                            )
                            Text(
                                text = "${progress.current} of ${progress.total} loaded...",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = RemoraAccentLight,
                                textAlign = TextAlign.Center
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
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }

        // New Collection Dialog
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
    totalVersesCount: Int,
    collections: List<CollectionCardItem>,
    selectedCollectionId: String?,
    reviewOrder: ReviewOrder,
    onSelectCollection: (String?) -> Unit,
    onSelectOrder: (ReviewOrder) -> Unit,
    onStartSession: (String?) -> Unit
) {
    val selectedCollection = collections.find { it.id == selectedCollectionId }
    val displayDue = selectedCollection?.dueCount ?: dueCount
    val minutes = kotlin.math.max(1, kotlin.math.ceil(displayDue * 0.5).toInt())
    var scopeMenuExpanded by remember { mutableStateOf(false) }
    var orderMenuExpanded by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = RemoraCardBg,
        border = BorderStroke(1.dp, RemoraCardBorder),
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
                text = when {
                    displayDue > 0 -> "$displayDue ${if (displayDue == 1) "verse is" else "verses are"} due"
                    totalVersesCount == 0 -> "0 verses are due"
                    else -> "All caught up"
                },
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = RemoraTextPrimary,
                letterSpacing = (-0.3).sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Subtitle: "About 6 minutes. Weakest verses come first."
            Text(
                text = if (displayDue > 0) {
                    "About $minutes ${if (minutes == 1) "minute" else "minutes"}. ${reviewOrder.subtitleHint}"
                } else if (totalVersesCount == 0) {
                    "Add verses or a collection below to start memorizing."
                } else {
                    "No verses due right now. ${reviewOrder.subtitleHint}"
                },
                fontSize = 14.sp,
                color = RemoraTextSecondary,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(18.dp))

            // Two Side-by-Side Dropdowns: "From: All ⌄" and "Order: Weakest ⌄"
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Left Dropdown: From
                Box(modifier = Modifier.weight(1f)) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = RemoraCardBgElevated,
                        border = BorderStroke(1.dp, RemoraCardBorder),
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
                                text = "From: ${selectedCollection?.name ?: "All"}",
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.Medium,
                                color = RemoraTextPrimary,
                                maxLines = 1
                            )
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowDown,
                                contentDescription = "Select collection",
                                tint = RemoraTextSecondary,
                                modifier = Modifier.size(18.dp)
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
                                    text = "All",
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

                // Right Dropdown: Order
                Box(modifier = Modifier.weight(1f)) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = RemoraCardBgElevated,
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { orderMenuExpanded = true }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Order: ${reviewOrder.label}",
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.Medium,
                                color = RemoraTextPrimary,
                                maxLines = 1
                            )
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowDown,
                                contentDescription = "Select order",
                                tint = RemoraTextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    DropdownMenu(
                        expanded = orderMenuExpanded,
                        onDismissRequest = { orderMenuExpanded = false },
                        modifier = Modifier.background(RemoraCardBgElevated)
                    ) {
                        ReviewOrder.entries.forEach { orderOption ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        text = orderOption.label,
                                        fontWeight = if (reviewOrder == orderOption) FontWeight.Bold else FontWeight.Normal,
                                        color = if (reviewOrder == orderOption) RemoraAccent else RemoraTextPrimary
                                    )
                                },
                                onClick = {
                                    onSelectOrder(orderOption)
                                    orderMenuExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Primary Start review button (Solid Gold with dark text, rounded corners matching mockup)
            Button(
                onClick = { onStartSession(selectedCollectionId) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = RemoraAccent,
                    contentColor = Color(0xFF141414)
                ),
                shape = RoundedCornerShape(10.dp),
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
    dueThemesCount: Int,
    secureThemesCount: Int,
    dueChaptersCount: Int,
    secureChaptersCount: Int,
    totalChaptersCount: Int,
    onAddVerses: () -> Unit,
    onNewCollection: () -> Unit,
    onInspectCollection: (String) -> Unit,
    onReviewCollection: (String) -> Unit,
    onReviewBookThemes: () -> Unit,
    onOpenChapterThemesBookPicker: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Section Header: "Collections" on left, "Add verses" & "New" on right
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Collections",
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = RemoraTextPrimary
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Add verses",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = RemoraAccent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { onAddVerses() }
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                )
                Text(
                    text = "New",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = RemoraAccent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { onNewCollection() }
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
        }

        // 1. User Verse Collections (General, Top 100 if added, custom groups)
        collections.forEach { item ->
            val subtitle = if (item.isPreset) {
                "${item.dueCount} due · ${item.learnedCount} of ${item.totalCount} learned"
            } else {
                "${item.dueCount} due · ${item.totalCount} ${if (item.totalCount == 1) "verse" else "verses"}"
            }
            val progressFraction = if (item.totalCount > 0) {
                // Use learned ratio if any learned, or a subtle minimum fill when verses exist
                val learnedRatio = item.learnedCount.toFloat() / item.totalCount.coerceAtLeast(1)
                if (learnedRatio > 0f) learnedRatio.coerceIn(0f, 1f)
                else (item.dueCount.toFloat() / item.totalCount.coerceAtLeast(1)).coerceIn(0f, 1f)
            } else 0f

            CollectionCard(
                title = item.name,
                subtitle = subtitle,
                progressFraction = progressFraction,
                onCardClick = { onInspectCollection(item.id) },
                onReviewClick = { onReviewCollection(item.id) }
            )
        }

        // 2. Book Themes Collection Card (All 66 Book Themes)
        val bookThemeSubtitle = "$dueThemesCount due · $secureThemesCount of 66 learned"
        val bookThemeProgress = (secureThemesCount.toFloat() / 66f).coerceIn(0f, 1f)
        CollectionCard(
            title = "Book Themes",
            subtitle = bookThemeSubtitle,
            progressFraction = bookThemeProgress,
            onCardClick = onReviewBookThemes,
            onReviewClick = onReviewBookThemes
        )

        // 3. Chapter Themes Collection Card (Select from 66 Books -> Chapter Theme Memorization)
        val totalCh = totalChaptersCount.coerceAtLeast(1189)
        val chapterThemeSubtitle = "$dueChaptersCount due · $secureChaptersCount of $totalCh learned"
        val chapterThemeProgress = (secureChaptersCount.toFloat() / totalCh).coerceIn(0f, 1f)
        CollectionCard(
            title = "Chapter Themes",
            subtitle = chapterThemeSubtitle,
            progressFraction = chapterThemeProgress,
            onCardClick = onOpenChapterThemesBookPicker,
            onReviewClick = onOpenChapterThemesBookPicker
        )
    }
}

@Composable
private fun CollectionCard(
    title: String,
    subtitle: String,
    progressFraction: Float,
    onCardClick: () -> Unit,
    onReviewClick: () -> Unit
) {
    Surface(
        onClick = onCardClick,
        shape = RoundedCornerShape(14.dp),
        color = RemoraCardBg,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 16.dp)
            ) {
                Text(
                    text = title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Serif,
                    color = RemoraTextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = subtitle,
                    fontSize = 13.5.sp,
                    color = RemoraTextSecondary
                )
                Spacer(modifier = Modifier.height(10.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(1.5.dp))
                        .background(RemoraCardBorder)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progressFraction.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(RemoraAccent)
                    )
                }
            }

            // Pill-shaped Review button with exact rounded corners from mockup
            OutlinedButton(
                onClick = onReviewClick,
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.65f)),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = RemoraAccent
                ),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp)
            ) {
                Text(
                    text = "Review",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = RemoraAccent
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollectionVersesSheet(
    collection: CollectionCardItem,
    verses: List<UserMemoryVerse>,
    displayLanguage: DisplayLanguage,
    canDeleteCollection: Boolean,
    onDismiss: () -> Unit,
    onReviewCollection: () -> Unit,
    onAddVersesToCollection: () -> Unit,
    onDeleteCollection: () -> Unit,
    onSelectVerse: (UserMemoryVerse) -> Unit,
    onRemoveVerse: (Long) -> Unit
) {
    val isEnglish = displayLanguage == DisplayLanguage.ENGLISH

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = RemoraCardBg,
        modifier = Modifier.fillMaxHeight(0.88f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = collection.name,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Serif,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = "${verses.size} ${if (verses.size == 1) "verse" else "verses"} · ${collection.dueCount} due",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary
                    )
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (canDeleteCollection) {
                        IconButton(onClick = onDeleteCollection) {
                            Icon(
                                Icons.Default.DeleteOutline,
                                contentDescription = "Delete collection",
                                tint = RemoraTextMuted
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = onReviewCollection,
                        shape = RoundedCornerShape(22.dp),
                        border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.65f)),
                        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 6.dp)
                    ) {
                        Text("Review", color = RemoraAccent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = RemoraTextSecondary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = RemoraCardBorder)
            Spacer(modifier = Modifier.height(12.dp))

            if (verses.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 40.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.MenuBook,
                        contentDescription = null,
                        tint = RemoraTextMuted,
                        modifier = Modifier.size(40.dp)
                    )
                    Text(
                        text = "No verses in ${collection.name} yet.",
                        fontSize = 14.sp,
                        color = RemoraTextSecondary
                    )
                    Button(
                        onClick = onAddVersesToCollection,
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF141414), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Add verses", color = Color(0xFF141414), fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(verses, key = { it.id }) { verse ->
                        val refText = verse.fullRef(isEnglish)
                        val rawText = (if (isEnglish) verse.textEn else verse.textTe)
                            ?: (if (isEnglish) verse.textTe else verse.textEn) ?: ""
                        val cleanText = rawText
                            .replace(Regex("<[^>]+>"), "")
                            .replace("&nbsp;", " ")
                            .trim()

                        Surface(
                            onClick = { onSelectVerse(verse) },
                            shape = RoundedCornerShape(12.dp),
                            color = RemoraCardBgElevated,
                            border = BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(end = 12.dp)
                                ) {
                                    Text(
                                        text = refText,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraTextPrimary
                                    )
                                    if (cleanText.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = cleanText,
                                            fontSize = 13.sp,
                                            color = RemoraTextSecondary,
                                            maxLines = 2
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { onRemoveVerse(verse.id) },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        Icons.Default.DeleteOutline,
                                        contentDescription = "Remove verse",
                                        tint = RemoraTextMuted,
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChapterThemeBookPickerSheet(
    books: List<Book>,
    masteryByBook: Map<Int, BookMasteryCounts>,
    dueChaptersByBook: Map<Int, Int>,
    activeVersion: String,
    onDismiss: () -> Unit,
    onSelectBook: (Int) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedTestament by remember { mutableStateOf("ALL") } // "ALL", "OT", "NT"

    val filteredBooks = remember(books, searchQuery, selectedTestament) {
        books.filter { book ->
            val matchesTestament = when (selectedTestament) {
                "OT" -> book.id in 1..39
                "NT" -> book.id in 40..66
                else -> true
            }
            val matchesQuery = searchQuery.isBlank() ||
                book.nameEn.contains(searchQuery, ignoreCase = true) ||
                book.nameTe.contains(searchQuery, ignoreCase = true)
            matchesTestament && matchesQuery
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = RemoraCardBg,
        modifier = Modifier.fillMaxHeight(0.92f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Chapter Themes",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Serif,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = "Select a book from the 66 books to memorize its chapter themes",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = RemoraTextSecondary)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Search input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search 66 books...", color = RemoraTextMuted, fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = RemoraTextMuted) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = RemoraTextMuted)
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = RemoraCardBgElevated,
                    unfocusedContainerColor = RemoraCardBgElevated,
                    focusedTextColor = RemoraTextPrimary,
                    unfocusedTextColor = RemoraTextPrimary,
                    focusedBorderColor = RemoraAccent,
                    unfocusedBorderColor = RemoraCardBorder
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Testament filter pills (All 66, Old Testament, New Testament)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    "ALL" to "All (66)",
                    "OT" to "Old Testament (39)",
                    "NT" to "New Testament (27)"
                ).forEach { (key, label) ->
                    val isSelected = selectedTestament == key
                    Surface(
                        onClick = { selectedTestament = key },
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) RemoraAccent else RemoraCardBgElevated,
                        border = BorderStroke(1.dp, if (isSelected) RemoraAccent else RemoraCardBorder)
                    ) {
                        Text(
                            text = label,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Color(0xFF141414) else RemoraTextSecondary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredBooks, key = { it.id }) { book ->
                    val mastery = masteryByBook[book.id]
                    val secure = mastery?.secure ?: 0
                    val total = book.chapters
                    val due = dueChaptersByBook[book.id] ?: 0
                    val displayName = BookNameUtils.getBookDisplayName(book, activeVersion)
                    val fraction = (secure.toFloat() / total.coerceAtLeast(1)).coerceIn(0f, 1f)

                    Surface(
                        onClick = { onSelectBook(book.id) },
                        shape = RoundedCornerShape(12.dp),
                        color = RemoraCardBgElevated,
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(end = 14.dp)
                            ) {
                                Text(
                                    text = displayName,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Serif,
                                    color = RemoraTextPrimary
                                )
                                Spacer(modifier = Modifier.height(3.dp))
                                Text(
                                    text = "$due due · $secure of $total chapters learned",
                                    fontSize = 12.5.sp,
                                    color = if (due > 0) RemoraAccentLight else RemoraTextSecondary
                                )
                                Spacer(modifier = Modifier.height(8.dp))
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

                            OutlinedButton(
                                onClick = { onSelectBook(book.id) },
                                shape = RoundedCornerShape(22.dp),
                                border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.65f)),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = RemoraAccent),
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
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
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
                            border = BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.clickable {
                                val matchedPreset = presetCollections.find {
                                    it.title.equals(suggestion, ignoreCase = true) ||
                                        (suggestion.equals("Top 100", ignoreCase = true) && it.id == "top_100")
                                }
                                if (matchedPreset != null) {
                                    onAddPreset(matchedPreset.id)
                                    onDismiss()
                                } else if (suggestion.equals("Top 100", ignoreCase = true)) {
                                    onAddPreset("top_100")
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
                        val matchedPreset = presetCollections.find {
                            it.title.equals(trimmed, ignoreCase = true) ||
                                (trimmed.equals("Top 100", ignoreCase = true) && it.id == "top_100")
                        }
                        if (matchedPreset != null) {
                            onAddPreset(matchedPreset.id)
                        } else if (trimmed.equals("Top 100", ignoreCase = true)) {
                            onAddPreset("top_100")
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
