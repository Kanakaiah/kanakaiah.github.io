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
import androidx.compose.material.icons.filled.Check
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
    readingBook: Book? = null,
    readingChapter: Int = 1,
    hasOpenedReader: Boolean = false,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    var showNewCollectionDialog by remember { mutableStateOf(false) }
    var addToCollectionId by remember { mutableStateOf<String?>(null) }

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
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                item {
                    TodayHeader(state.streak, onNavigateToRetention, onNavigateToSettings,
                        Modifier.widthIn(max = 640.dp).fillMaxWidth())
                }
                item {
                    ReviewHeroCard(
                        dueCount = state.dueCount,
                        totalVersesCount = state.verses.size,
                        collections = state.collections,
                        selectedCollectionId = state.selectedCollectionId,
                        reviewOrder = state.reviewOrder,
                        onSelectCollection = viewModel::selectCollection,
                        onSelectOrder = viewModel::setReviewOrder,
                        onStartSession = onStartSession,
                        onAddVerses = { addToCollectionId = null; viewModel.toggleAddDialog(true) },
                        modifier = Modifier.widthIn(max = 640.dp).fillMaxWidth()
                    )
                }
                val book = readingBook ?: state.books.firstOrNull()
                if (book != null) {
                    item {
                        ReadingCard(
                            book = book,
                            chapter = if (readingBook != null) readingChapter else 1,
                            version = state.activeVersion,
                            hasOpenedReader = hasOpenedReader,
                            onClick = { onNavigateToReader(book.id, if (readingBook != null) readingChapter else 1) },
                            modifier = Modifier.widthIn(max = 640.dp).fillMaxWidth()
                        )
                    }
                }
                item {
                    Box(Modifier.widthIn(max = 640.dp).fillMaxWidth()) {
                        CollectionsSection(
                            collections = state.collections,
                            dueThemesCount = state.dueThemesCount,
                            secureThemesCount = state.secureThemesCount,
                            dueChaptersCount = totalDueChapters,
                            secureChaptersCount = state.totalSecureChapters,
                            totalChaptersCount = state.totalBibleChapters,
                            onAddVerses = { addToCollectionId = null; viewModel.toggleAddDialog(true) },
                            onNewCollection = { showNewCollectionDialog = true },
                            onManageCollections = { viewModel.toggleManageTopicsSheet(true) },
                            onInspectCollection = viewModel::setInspectingCollection,
                            onReviewCollection = { collectionId ->
                                viewModel.selectCollection(collectionId)
                                onStartSession(collectionId)
                            },
                            onReviewBookThemes = onNavigateToThemes,
                            onOpenChapterThemesBookPicker = { viewModel.setShowChapterThemeBookPicker(true) }
                        )
                    }
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
                        addToCollectionId = inspectId.takeUnless { it == DEFAULT_GENERAL_COLLECTION_ID }
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
                onDismiss = { addToCollectionId = null; viewModel.toggleAddDialog(false) },
                onAddSingleVerse = { bookId, ch, vs, endVs, topicIds -> viewModel.addVerse(bookId, ch, vs, endVs, topicIds) },
                onAddIndividually = { verses, topicIds -> viewModel.addVersesIndividually(verses, topicIds) },
                onAddManualVerse = { ref, topicIds -> viewModel.addManualVerse(ref, topicIds) },
                onAddCollection = { collId, topicIds -> viewModel.addCollection(collId, topicIds) },
                onSearchVerses = { q, trans -> viewModel.searchVersesForDialog(q, trans) },
                onCreateTopic = { name, cb -> viewModel.createTopic(name, cb) },
                initialTopicIds = addToCollectionId?.let { setOf(it) } ?: emptySet(),
                searchError = state.searchError,
                addError = state.addError,
                onNavigateToGuides = {
                    addToCollectionId = null
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

        // Notification Banner (Auto-dismissing toast)
        androidx.compose.animation.AnimatedVisibility(
            visible = state.messageBanner != null,
            enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically(initialOffsetY = { it / 2 }),
            exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.slideOutVertically(targetOffsetY = { it / 2 }),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp)
        ) {
            state.messageBanner?.let { msg ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = RemoraCardBgElevated,
                    border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.5f)),
                    shadowElevation = 8.dp,
                    onClick = { viewModel.dismissMessage() }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
                    ) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = RemoraAccentLight,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = msg,
                            color = RemoraTextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
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
                existingNames = state.collections.map { it.name } + state.topics.map { it.name },
                onDismiss = { showNewCollectionDialog = false },
                onCreateCustom = { name -> viewModel.createTopic(name) },
                onAddPreset = { presetId -> viewModel.addCollection(presetId, emptyList()) }
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
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
    onManageCollections: () -> Unit,
    onInspectCollection: (String) -> Unit,
    onReviewCollection: (String) -> Unit,
    onReviewBookThemes: () -> Unit,
    onOpenChapterThemesBookPicker: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Collections", style = MaterialTheme.typography.titleLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilledTonalButton(onClick = onAddVerses) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Add verses")
            }
            TextButton(onClick = onNewCollection) { Text("New collection") }
            TextButton(onClick = onManageCollections) { Text("Manage collections") }
        }

        // 1. User Verse Collections (General, Top 100 if added, custom groups)
        collections.forEach { item ->
            val subtitle = if (item.isPreset) {
                "${item.dueCount} due · ${item.learnedCount} of ${item.totalCount} learned"
            } else {
                "${item.dueCount} due · ${item.totalCount} ${if (item.totalCount == 1) "verse" else "verses"}"
            }
            val progressFraction = (item.learnedCount.toFloat() / item.totalCount.coerceAtLeast(1)).coerceIn(0f, 1f)

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
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth()) {
            Column(
                Modifier.fillMaxWidth().clickable(onClickLabel = "Open $title", onClick = onCardClick)
                    .padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 8.dp)
            ) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Text(subtitle, style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(12.dp))
                LinearProgressIndicator(
                    progress = { progressFraction },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
                )
            }
            TextButton(onClick = onReviewClick, modifier = Modifier.align(Alignment.End).padding(end = 8.dp)) {
                Text("Review")
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null, Modifier.size(18.dp))
            }
        }
    }
}
