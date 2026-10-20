package com.example.telugubible.ui.bible

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BlockProgressEntity
import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.BookGuide
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BookGuideUiState(
    val bookId: Int = 1,
    val book: Book? = null,
    val guide: BookGuide? = null,
    val chapterProgress: Map<Int, ChapterProgressEntity> = emptyMap(),
    val blockProgress: Map<Int, BlockProgressEntity> = emptyMap(),
    val revealedAnchors: Set<Int> = emptySet(),
    val showAllAnchors: Boolean = false,
    val collapsedBlocks: Set<Int> = emptySet(),
    val gradedAnchorsOnThisPass: Map<Int, Int> = emptyMap(), // chapter -> interval in days
    val userVerseKeys: Set<Triple<Int, Int, Int>> = emptySet(), // (bookId, chapter, verse)
    val isLoading: Boolean = true,
    val toastMessage: String? = null
)

class BookGuideViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(BookGuideUiState())
    val uiState: StateFlow<BookGuideUiState> = _uiState.asStateFlow()

    fun loadBookGuide(bookId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, bookId = bookId) }
            val book = repository.getBook(bookId)
            val guide = repository.getBookGuide(bookId)
            val progress = repository.getChapterProgress(bookId)
            val blocks = repository.getBlockProgress(bookId)
            val userVerses = repository.getUserMemoryVerses()
            val verseKeys = userVerses.map { Triple(it.bookId, it.chapter, it.verse) }.toSet()

            _uiState.update {
                it.copy(
                    bookId = bookId,
                    book = book,
                    guide = guide,
                    chapterProgress = progress,
                    blockProgress = blocks,
                    userVerseKeys = verseKeys,
                    revealedAnchors = emptySet(),
                    showAllAnchors = false,
                    collapsedBlocks = emptySet(),
                    gradedAnchorsOnThisPass = emptyMap(),
                    isLoading = false
                )
            }
        }
    }

    fun toggleAnchorReveal(chapter: Int) {
        _uiState.update { state ->
            val updated = if (state.revealedAnchors.contains(chapter)) {
                state.revealedAnchors - chapter
            } else {
                state.revealedAnchors + chapter
            }
            state.copy(revealedAnchors = updated)
        }
    }

    fun toggleShowAllAnchors() {
        _uiState.update { state ->
            state.copy(showAllAnchors = !state.showAllAnchors)
        }
    }

    fun toggleBlockCollapse(blockIndex: Int) {
        _uiState.update { state ->
            val updated = if (state.collapsedBlocks.contains(blockIndex)) {
                state.collapsedBlocks - blockIndex
            } else {
                state.collapsedBlocks + blockIndex
            }
            state.copy(collapsedBlocks = updated)
        }
    }

    fun gradeAnchor(chapter: Int, score: Int) {
        val bookId = _uiState.value.bookId
        viewModelScope.launch {
            val updatedEntity = repository.gradeChapterAnchor(bookId, chapter, score)
            _uiState.update { state ->
                val newProgress = state.chapterProgress + (chapter to updatedEntity)
                val newGraded = state.gradedAnchorsOnThisPass + (chapter to updatedEntity.interval)
                state.copy(
                    chapterProgress = newProgress,
                    gradedAnchorsOnThisPass = newGraded
                )
            }
        }
    }

    fun gradeBlockChain(
        blockIndex: Int,
        label: String,
        results: List<Pair<Int, Boolean>>,
        onFinished: (BlockProgressEntity) -> Unit = {}
    ) {
        val bookId = _uiState.value.bookId
        viewModelScope.launch {
            val entity = repository.gradeBlockChain(bookId, blockIndex, label, results)
            val updatedBlocks = repository.getBlockProgress(bookId)
            val updatedChapters = repository.getChapterProgress(bookId)
            _uiState.update { state ->
                state.copy(
                    blockProgress = updatedBlocks,
                    chapterProgress = updatedChapters
                )
            }
            onFinished(entity)
        }
    }

    fun addKeyVerseToLibrary(ref: String): Boolean {
        val currentBook = _uiState.value.book ?: return false
        val parsed = parseReference(ref, currentBook.id) ?: return false

        viewModelScope.launch {
            val added = repository.addUserVerse(parsed.first, parsed.second, parsed.third)
            if (added) {
                _uiState.update { state ->
                    state.copy(
                        userVerseKeys = state.userVerseKeys + Triple(parsed.first, parsed.second, parsed.third),
                        toastMessage = "Added $ref to your memory library!"
                    )
                }
            } else {
                _uiState.update { state ->
                    state.copy(toastMessage = "$ref is already in your library")
                }
            }
        }
        return true
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }

    private fun parseReference(ref: String, defaultBookId: Int): Triple<Int, Int, Int>? {
        // e.g. "Genesis 1:1" or "Romans 3:23"
        val regex = Regex("""(?:[1-3]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)?\s*(\d+)[:.](\d+)""")
        val match = regex.find(ref.trim()) ?: return null
        val chapter = match.groupValues[1].toIntOrNull() ?: return null
        val verse = match.groupValues[2].toIntOrNull() ?: return null
        return Triple(defaultBookId, chapter, verse)
    }
}
