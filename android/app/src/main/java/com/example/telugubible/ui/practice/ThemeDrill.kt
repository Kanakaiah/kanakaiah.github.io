package com.example.telugubible.ui.practice

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.example.telugubible.ui.common.BookCoverImage
import com.example.telugubible.data.model.Book

@Composable
fun ThemeDrill(viewModel: ThemeDrillViewModel, onExit: () -> Unit, modifier: Modifier = Modifier) {
    val state by viewModel.uiState.collectAsState()
    BackHandler { if (!state.isGrading) onExit() }
    LaunchedEffect(Unit) { viewModel.onScreenEntered() }
    ThemeDrillContent(state, viewModel::setScope, viewModel::revealAnswer, viewModel::gradeCurrent,
        viewModel::skipToNext, viewModel::restart, onExit, modifier)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun ThemeDrillContent(
    state: ThemeDrillUiState,
    onScope: (ThemeScope) -> Unit,
    onReveal: () -> Unit,
    onGrade: (Int) -> Unit,
    onSkip: () -> Unit,
    onRestart: () -> Unit,
    onExit: () -> Unit,
    modifier: Modifier = Modifier,
    cover: @Composable (Book) -> Unit = { book -> BookCoverImage(book.key, "${book.nameEn} cover", Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(24.dp))) }
) {
    StudyPracticeLayout(modifier, Triple(state.currentIndex, state.scope, state.isFinished)) {
        PracticeHeader("Book themes", "Recall the central theme of each book.", state.currentIndex,
            if (state.isFinished) 0 else state.queue.size, onExit, exitEnabled = !state.isGrading)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(ThemeScope.ALL to "Whole Bible", ThemeScope.OT to "Old Testament", ThemeScope.NT to "New Testament").forEach { (scope, label) ->
                FilterChip(selected = state.scope == scope, onClick = { onScope(scope) }, label = { Text(label) },
                    enabled = !state.isLoading && !state.isGrading && state.gradingError == null)
            }
        }
        Text("${state.learnedCount} of ${state.totalCount} themes learned across the Bible",
            style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        when {
            state.isLoading -> CircularProgressIndicator()
            state.isFinished || state.queue.isEmpty() -> PracticeEndCard(state.queue.isEmpty(), "Theme practice complete", onRestart, onExit, "Back to Today")
            else -> state.currentItem?.let { item ->
                cover(item.book)
                Text(item.book.nameEn, style = MaterialTheme.typography.headlineLarge.copy(fontFamily = FontFamily.Serif))
                if (state.isRevealed) {
                    StudyAnswerCard("Book theme", item.book.themeWord, item.book.subtitle, item.book.keyWord)
                    ReviewGrades(5, onGrade, enabled = !state.isGrading && state.gradingError == null)
                    if (state.isGrading) Text("Saving review…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    state.gradingError?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error) }
                } else {
                    Text("What is this book’s theme?", style = MaterialTheme.typography.bodyLarge)
                    Button(onClick = onReveal, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Show theme") }
                }
                TextButton(onClick = onSkip, enabled = !state.isGrading && state.gradingError == null) { Text("Skip without grading") }
            }
        }
    }
}
