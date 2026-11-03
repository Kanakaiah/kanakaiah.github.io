package com.example.telugubible.ui.practice

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.telugubible.util.AnchorDirection
import com.example.telugubible.util.AnchorVerdict
import com.example.telugubible.ui.common.ChapterPlateImage

@Composable
fun AnchorDrill(viewModel: AnchorDrillViewModel, onExit: () -> Unit, modifier: Modifier = Modifier) {
    val state by viewModel.uiState.collectAsState()
    BackHandler { if (!state.isGrading) onExit() }
    AnchorDrillContent(state, viewModel::setDirection, viewModel::onInputChange,
        viewModel::checkAnswer, viewModel::reveal, viewModel::gradeCurrent, viewModel::restart, onExit, modifier,
        onSelectBook = viewModel::selectBook)
}

@Composable
internal fun AnchorDrillContent(
    state: AnchorDrillUiState,
    onDirection: (AnchorDirection) -> Unit,
    onInput: (String) -> Unit,
    onCheck: () -> Unit,
    onReveal: () -> Unit,
    onGrade: (Int) -> Unit,
    onRestart: () -> Unit,
    onExit: () -> Unit,
    modifier: Modifier = Modifier,
    onSelectBook: (Int?) -> Unit = {},
    artwork: @Composable (AnchorDrillItem, String) -> Unit = { item, description -> ChapterPracticeArtwork(item, description) }
) {
    val focus = LocalFocusManager.current
    StudyPracticeLayout(modifier, Triple(state.currentIndex, state.direction, state.isFinished)) {
        PracticeHeader("Chapter anchors", "Connect each chapter with its anchor word.", state.currentIndex,
            if (state.isFinished) 0 else state.queue.size, onExit, "Back to verse practice", exitEnabled = !state.isGrading)
        if (state.books.isNotEmpty()) {
            var showBooks by remember { mutableStateOf(false) }
            Box {
                OutlinedButton(onClick = { showBooks = true }, enabled = !state.isGrading && !state.isLoading) {
                    val selected = state.books.firstOrNull { it.id == state.selectedBookId }?.nameEn ?: "All books"
                    Text("Book: $selected")
                }
                DropdownMenu(expanded = showBooks, onDismissRequest = { showBooks = false }) {
                    DropdownMenuItem(text = { Text("All books") }, onClick = { showBooks = false; onSelectBook(null) })
                    state.books.forEach { book ->
                        DropdownMenuItem(text = { Text(book.nameEn) }, onClick = { showBooks = false; onSelectBook(book.id) })
                    }
                }
            }
        }
        when {
            state.isLoading -> CircularProgressIndicator()
            state.isFinished || state.queue.isEmpty() -> {
                PracticeEndCard(state.queue.isEmpty(), "Anchor practice complete", onRestart, onExit, "Back to verses")
            }
            else -> state.currentItem?.let { item ->
                var expanded by remember { mutableStateOf(false) }
                val directionLabels = mapOf(AnchorDirection.N2W to "Number → Word",
                    AnchorDirection.W2N to "Word → Number", AnchorDirection.P2W to "Plate → Word")
                Box {
                    FilledTonalButton(onClick = { expanded = true }, enabled = !state.isGrading && !state.isRevealed) {
                        Text(directionLabels.getValue(state.direction))
                    }
                    DropdownMenu(expanded, onDismissRequest = { expanded = false }) {
                        directionLabels.forEach { (direction, label) ->
                            DropdownMenuItem(text = { Text(label) }, onClick = { expanded = false; onDirection(direction) })
                        }
                    }
                }
                Text(item.bookName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(if (state.direction == AnchorDirection.W2N) item.word else "Chapter ${item.chapter}",
                    style = MaterialTheme.typography.headlineLarge.copy(fontFamily = FontFamily.Serif))
                Text(if (state.direction == AnchorDirection.W2N) "Which chapter has this anchor word?" else "What is this chapter’s anchor word?",
                    style = MaterialTheme.typography.bodyLarge)
                if (state.direction == AnchorDirection.P2W && !state.isRevealed) {
                    Text("Chapter cue", style = MaterialTheme.typography.titleSmall)
                    artwork(item, "Chapter illustration cue")
                }
                if (!state.isRevealed) {
                    OutlinedTextField(value = state.typedInput, onValueChange = onInput,
                        label = { Text(if (state.direction == AnchorDirection.W2N) "Chapter number" else "Anchor word") },
                        keyboardOptions = KeyboardOptions(keyboardType = if (state.direction == AnchorDirection.W2N) KeyboardType.Number else KeyboardType.Text, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { if (state.typedInput.isNotBlank()) { focus.clearFocus(); onCheck() } }),
                        modifier = Modifier.fillMaxWidth())
                    Button(onClick = { focus.clearFocus(); onCheck() }, enabled = state.typedInput.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Check answer") }
                    OutlinedButton(onClick = { focus.clearFocus(); onReveal() }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Show anchor") }
                } else {
                    state.judgement?.let { judgement ->
                        val feedback = when (judgement.verdict) {
                            AnchorVerdict.CORRECT -> "Correct answer"
                            AnchorVerdict.NEAR -> "Close — compare your answer below"
                            AnchorVerdict.WRONG -> judgement.confusedWith?.let { "That anchor belongs to Chapter ${it.chapter}: ${it.word}" } ?: "Review the anchor below"
                        }
                        Text(feedback, style = MaterialTheme.typography.titleMedium)
                    }
                    StudyAnswerCard("Chapter ${item.chapter}", item.word, item.scene)
                    artwork(item, "Chapter illustration")
                    if (state.typedInput.isNotBlank()) Text("Your answer: ${state.typedInput}", style = MaterialTheme.typography.bodyLarge)
                    ReviewGrades(5, onGrade, enabled = !state.isGrading && state.gradingError == null)
                    if (state.isGrading) Text("Saving review…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    state.gradingError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
}

@Composable
private fun ChapterPracticeArtwork(item: AnchorDrillItem, description: String) {
    Box(Modifier.widthIn(max = 420.dp).fillMaxWidth().aspectRatio(1.7f)
        .semantics(mergeDescendants = true) { contentDescription = description }
        .testTag("chapter-practice-art")) {
        ChapterPlateImage(item.bookKey, item.chapter, contentDescription = null, modifier = Modifier.fillMaxSize())
    }
}
