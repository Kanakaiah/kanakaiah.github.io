package com.example.telugubible.ui.bible

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.*
import com.example.telugubible.ui.common.ChapterPlateImage
import com.example.telugubible.ui.practice.ChainDrill
import com.example.telugubible.util.BookNameUtils
import kotlinx.coroutines.launch

@Composable
fun BookGuideScreen(
    viewModel: BookGuideViewModel,
    bookId: Int,
    onBack: () -> Unit,
    onOpenReader: (bookId: Int, chapter: Int) -> Unit,
    onSelectBook: (Int) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var commentary by remember { mutableStateOf(false) }
    var preachers by remember { mutableStateOf(false) }
    var drill by remember { mutableStateOf<Triple<String, List<ChapterAnchor>, Int>?>(null) }
    LaunchedEffect(bookId) { viewModel.loadBookGuide(bookId, preserveUi = true) }
    LaunchedEffect(state.toastMessage) {
        state.toastMessage?.let { Toast.makeText(context, it, Toast.LENGTH_SHORT).show(); viewModel.clearToast() }
    }
    BookGuideContent(state, onBack, onOpenReader, onSelectBook,
        viewModel::toggleShowAllAnchors, viewModel::toggleBlockCollapse, viewModel::toggleAnchorReveal,
        { label, anchors, index -> viewModel.resetChainSaveState(); drill = Triple(label, anchors, index) },
        { viewModel.addKeyVerseToLibrary(it) },
        { sentence ->
            (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("Memory sentence", sentence.replace("**", "")))
            Toast.makeText(context, "Memory sentence copied", Toast.LENGTH_SHORT).show()
        }, { commentary = true }, { preachers = true }, modifier)
    if (commentary && state.book != null) CommentarySheet(state.book!!.id, state.book!!.nameEn, onDismiss = { commentary = false })
    if (preachers) PreachersSheet(onDismiss = { preachers = false })
    drill?.let { (label, anchors, index) ->
        ChainDrill(bookId = bookId, blockIndex = index, label = label, anchors = anchors,
            onClose = { drill = null }, onGradeChain = { viewModel.gradeBlockChain(index, label, it) },
            nextIntervalDays = state.chainSavedInterval, isSaving = state.isChainSaving, saveError = state.chainSaveError,
            onRestartChain = viewModel::resetChainSaveState)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun BookGuideContent(
    state: BookGuideUiState,
    onBack: () -> Unit,
    onOpenReader: (Int, Int) -> Unit,
    onSelectBook: (Int) -> Unit,
    onShowAll: () -> Unit,
    onToggleBlock: (Int) -> Unit,
    onToggleAnchor: (Int) -> Unit,
    onDrill: (String, List<ChapterAnchor>, Int) -> Unit,
    onAddVerse: (String) -> Unit,
    onCopy: (String) -> Unit,
    onCommentaries: () -> Unit,
    onPreachers: () -> Unit,
    modifier: Modifier = Modifier
) {
    val list = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var chooseChapter by rememberSaveable { mutableStateOf(false) }
    var chooseBook by rememberSaveable { mutableStateOf(false) }
    val book = state.book
    val guide = state.guide
    val index = state.books.indexOfFirst { it.id == book?.id }
    val previous = state.books.getOrNull(index - 1)
    val next = if (index >= 0) state.books.getOrNull(index + 1) else null
    Scaffold(modifier.fillMaxSize(), topBar = {
        Surface {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 8.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back to Bible") }
                Text(book?.let { BookNameUtils.getBookDisplayName(it, state.activeVersion) } ?: "Book guide",
                    style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            }
        }
    }, bottomBar = {
        if (book != null) Surface(color = MaterialTheme.colorScheme.surfaceContainer) {
            Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { previous?.let { onSelectBook(it.id) } }, enabled = previous != null && !state.isLoading) {
                    Icon(Icons.Default.ChevronLeft, "Previous book")
                }
                FilledTonalButton(onClick = { chooseBook = true }, enabled = !state.isLoading) { Text("All books") }
                IconButton(onClick = { next?.let { onSelectBook(it.id) } }, enabled = next != null && !state.isLoading) {
                    Icon(Icons.Default.ChevronRight, "Next book")
                }
            }
        }
    }) { padding ->
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.TopCenter) {
            when {
                state.isLoading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                book == null -> Text("Book unavailable", Modifier.padding(24.dp))
                else -> {
                    val groups = remember(guide) { anchorGroups(guide) }
                    val chapterThemesIndex = 1 + (if (guide?.blocks.isNullOrEmpty()) 0 else 1)
                    val keyVersesIndex = chapterThemesIndex +
                        (if (groups.isEmpty()) 0 else 1 + groups.sumOf { (_, anchors, block) -> 1 + if (block in state.collapsedBlocks) 0 else anchors.size })
                    val memoryIndex = keyVersesIndex + (if (guide?.keyVerses.isNullOrEmpty()) 0 else 1)
                    LazyColumn(state = list, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(20.dp),
                        modifier = Modifier.widthIn(max = 840.dp).fillMaxSize()) {
                        item(key = "overview") {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("${if (book.testament == "OT") "Old Testament" else "New Testament"} · ${book.chapters} chapters", style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (book.themeWord.isNotBlank()) Text(book.themeWord, style = MaterialTheme.typography.headlineMedium.copy(fontFamily = FontFamily.Serif))
                                val subtitle = guide?.subtitle?.takeIf { it.isNotBlank() } ?: book.subtitle
                                if (subtitle.isNotBlank()) Text(subtitle, style = MaterialTheme.typography.bodyLarge)
                                guide?.structureFormula?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.titleMedium) }
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(onClick = { onOpenReader(book.id, 1) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Read chapter 1") }
                                    OutlinedButton(onClick = { chooseChapter = true }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Choose chapter") }
                                }
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (groups.isNotEmpty()) TextButton(onClick = { scope.launch { list.animateScrollToItem(chapterThemesIndex) } }) { Text("Jump to chapter themes") }
                                    if (!guide?.keyVerses.isNullOrEmpty()) TextButton(onClick = { scope.launch { list.animateScrollToItem(keyVersesIndex) } }) { Text("Jump to key verses") }
                                    if (!guide?.memorySentence.isNullOrBlank()) TextButton(onClick = { scope.launch { list.animateScrollToItem(memoryIndex) } }) { Text("Jump to memory sentence") }
                                }
                                if (guide == null) Text("Study guide unavailable. You can still read every chapter.")
                            }
                        }
                        if (!guide?.blocks.isNullOrEmpty()) item(key = "structure") {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Book structure", style = MaterialTheme.typography.titleLarge)
                                guide!!.blocks.forEach { block ->
                                    Card(onClick = { onOpenReader(book.id, block.chapters.split('-', '–').first().trim().toIntOrNull() ?: 1) },
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), shape = RoundedCornerShape(24.dp)) {
                                        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text("Chapters ${block.chapters}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                                            Text(block.label, style = MaterialTheme.typography.titleMedium)
                                            if (block.description.isNotBlank()) Text(block.description, style = MaterialTheme.typography.bodyMedium)
                                        }
                                    }
                                }
                            }
                        }
                        if (groups.isNotEmpty()) item(key = "anchors-heading") {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Chapter themes", style = MaterialTheme.typography.titleLarge, modifier = Modifier.align(Alignment.CenterVertically))
                                TextButton(onClick = onShowAll) { Text(if (state.showAllAnchors) "Hide all" else "Reveal all") }
                            }
                        }
                        groups.forEach { (label, anchors, block) ->
                            val collapsed = block in state.collapsedBlocks
                            item(key = "group-$block") {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(label, style = MaterialTheme.typography.titleMedium)
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { onToggleBlock(block) }) { Text(if (collapsed) "Expand group" else "Collapse group") }
                                        if (anchors.size > 1) FilledTonalButton(onClick = { onDrill(label, anchors, block) }) {
                                            Text(if (state.blockProgress[block]?.isDue == true) "Review chapter chain" else "Practice chapter chain")
                                        }
                                    }
                                }
                            }
                            if (!collapsed) items(anchors, key = { "anchor-${it.chapter}" }) { anchor ->
                                GuideAnchorCard(anchor, book.key, state.showAllAnchors || anchor.chapter in state.revealedAnchors,
                                    state.gradedAnchorsOnThisPass[anchor.chapter], { onToggleAnchor(anchor.chapter) }, { onOpenReader(book.id, anchor.chapter) })
                            }
                        }
                        if (!guide?.keyVerses.isNullOrEmpty()) item(key = "key-verses") {
                            GuideKeyVerses(guide!!.keyVerses, state.userVerseKeys, onAddVerse)
                        }
                        guide?.memorySentence?.takeIf { it.isNotBlank() }?.let { sentence ->
                            item(key = "memory") {
                                Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
                                    Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text("Memory sentence", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                                            IconButton(onClick = { onCopy(sentence) }) { Icon(Icons.Default.ContentCopy, "Copy memory sentence") }
                                        }
                                        Text(buildAnnotatedMemorySentence(sentence, guide.anchors, MaterialTheme.colorScheme.primary),
                                            style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif))
                                    }
                                }
                            }
                        }
                        item(key = "study-tools") {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Study resources", style = MaterialTheme.typography.titleLarge)
                                FilledTonalButton(onClick = onCommentaries, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Browse commentaries") }
                                OutlinedButton(onClick = onPreachers, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Theologians") }
                            }
                        }
                    }
                }
            }
        }
    }
    if (chooseChapter && book != null) {
        AlertDialog(onDismissRequest = { chooseChapter = false }, title = { Text("Choose chapter") },
            text = { LazyVerticalGrid(GridCells.Adaptive(64.dp), Modifier.heightIn(max = 400.dp)) {
                items(book.chapters) { i ->
                    TextButton(onClick = { chooseChapter = false; onOpenReader(book.id, i + 1) },
                        modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Read chapter ${i + 1}" }) { Text("${i + 1}") }
                }
            } }, confirmButton = { TextButton(onClick = { chooseChapter = false }) { Text("Done") } })
    }
    if (chooseBook) GuideBookPicker(state.books, state.activeVersion, { chooseBook = false }, { chooseBook = false; onSelectBook(it) })
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun GuideAnchorCard(anchor: ChapterAnchor, bookKey: String, revealed: Boolean, interval: Int?, onReveal: () -> Unit, onRead: () -> Unit) {
    Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
        ChapterPlateImage(bookKey, anchor.chapter, "Chapter ${anchor.chapter} illustration", Modifier.fillMaxWidth().aspectRatio(4f / 3f))
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Chapter ${anchor.chapter}", style = MaterialTheme.typography.titleMedium)
            if (revealed || interval != null) {
                Text(anchor.word, style = MaterialTheme.typography.headlineSmall)
                Text(anchor.scene, style = MaterialTheme.typography.bodyLarge)
                val links = listOfNotNull(anchor.prevWord?.let { "After $it" }, anchor.nextWord?.let { "Before $it" })
                if (links.isNotEmpty()) Text(links.joinToString(" · "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (interval != null) Text("Next review in $interval days", style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (interval == null) FilledTonalButton(onClick = onReveal) { Text(if (revealed) "Hide anchor" else "Show anchor") }
                OutlinedButton(onClick = onRead) { Text("Read chapter ${anchor.chapter}") }
            }
        }
    }
}

@Composable
private fun GuideKeyVerses(verses: List<GuideKeyVerse>, saved: Set<Triple<Int, Int, Int>>, onAdd: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Key verses", style = MaterialTheme.typography.titleLarge)
        verses.forEach { verse ->
            val match = Regex("(\\d+)[:.](\\d+)").find(verse.ref)
            val isSaved = match != null && Triple(verse.bookId, match.groupValues[1].toInt(), match.groupValues[2].toInt()) in saved
            Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(verse.ref, style = MaterialTheme.typography.titleMedium)
                    val text = verse.text.replace(Regex("<[^>]+>"), "").replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").trim()
                    Text(text, style = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Serif))
                    if (isSaved) Text("In your memory library", style = MaterialTheme.typography.labelLarge)
                    else FilledTonalButton(onClick = { onAdd(verse.ref) }) { Text("Add to memory") }
                }
            }
        }
    }
}

@Composable
private fun GuideBookPicker(books: List<Book>, version: String, onDismiss: () -> Unit, onSelect: (Int) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Choose book") }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(query, { query = it }, label = { Text("Find a book") }, singleLine = true)
            LazyColumn(Modifier.heightIn(max = 400.dp)) {
                items(books.filter { it.nameEn.contains(query, true) || it.nameTe.contains(query, true) }, key = { it.id }) { book ->
                    TextButton(onClick = { onSelect(book.id) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(BookNameUtils.getBookDisplayName(book, version)) }
                }
            }
        }
    }, confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } })
}

private fun anchorGroups(guide: BookGuide?): List<Triple<String, List<ChapterAnchor>, Int>> {
    if (guide == null || guide.anchors.isEmpty()) return emptyList()
    if (guide.blocks.isEmpty() || (guide.anchors.size == 1 && guide.blocks.size > 1)) return listOf(Triple("All chapters", guide.anchors, 0))
    val groups = guide.blocks.mapIndexedNotNull { index, block ->
        val range = block.chapters.split('-', '–').mapNotNull { it.trim().toIntOrNull() }
        val start = range.firstOrNull() ?: return@mapIndexedNotNull null
        val anchors = guide.anchors.filter { it.chapter in start..(range.getOrNull(1) ?: start) }
        if (anchors.isEmpty()) null else Triple(block.label, anchors, index)
    }
    val covered = groups.flatMap { it.second }.map { it.chapter }.toSet()
    val remaining = guide.anchors.filter { it.chapter !in covered }
    return if (remaining.isEmpty()) groups else groups + Triple("Other chapters", remaining, guide.blocks.size)
}
private fun buildAnnotatedMemorySentence(
    sentence: String,
    anchors: List<com.example.telugubible.data.model.ChapterAnchor>,
    anchorColor: Color
): AnnotatedString {
    return buildAnnotatedString {
        if (sentence.contains("**")) {
            val parts = sentence.split("**")
            parts.forEachIndexed { index, part ->
                if (index % 2 == 1) {
                    // Bold keyword
                    pushStyle(SpanStyle(fontWeight = FontWeight.Bold, color = anchorColor))
                    append(part)
                    pop()
                } else {
                    append(part)
                }
            }
            return@buildAnnotatedString
        }

        // Mnemonic Anchor words in ALL-CAPS (e.g. STRONG, SCARLET, PRIESTS in Joshua)
        val pattern = Regex("\\b[A-Z]{2,}(?:'S)?\\b")
        val matches = pattern.findAll(sentence).toList()
        if (matches.isEmpty()) {
            append(sentence)
            return@buildAnnotatedString
        }

        var lastIdx = 0
        for (m in matches) {
            val start = m.range.first
            val end = m.range.last + 1
            if (start > lastIdx) {
                append(sentence.substring(lastIdx, start))
            }
            pushStyle(SpanStyle(fontWeight = FontWeight.Bold, color = anchorColor))
            append(m.value)
            pop()
            lastIdx = end
        }
        if (lastIdx < sentence.length) {
            append(sentence.substring(lastIdx))
        }
    }
}
