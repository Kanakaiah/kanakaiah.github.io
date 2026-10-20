package com.example.telugubible.ui.practice

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.util.AnchorDirection
import com.example.telugubible.util.AnchorJudge
import com.example.telugubible.util.AnchorJudgement
import com.example.telugubible.util.AnchorSibling
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AnchorDrillItem(
    val bookId: Int,
    val bookName: String,
    val bookKey: String,
    val chapter: Int,
    val word: String,
    val scene: String,
    val repetition: Int = 0,
    val interval: Int = 0,
    val siblings: List<AnchorSibling> = emptyList()
)

data class AnchorDrillUiState(
    val queue: List<AnchorDrillItem> = emptyList(),
    val currentIndex: Int = 0,
    val direction: AnchorDirection = AnchorDirection.N2W,
    val isRevealed: Boolean = false,
    val typedInput: String = "",
    val judgement: AnchorJudgement? = null,
    val books: List<Book> = emptyList(),
    val selectedBookId: Int? = null,
    val isLoading: Boolean = true,
    val isFinished: Boolean = false
) {
    val currentItem: AnchorDrillItem?
        get() = queue.getOrNull(currentIndex)
}

class AnchorDrillViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(AnchorDrillUiState())
    val uiState: StateFlow<AnchorDrillUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData(initialBookId: Int? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, selectedBookId = initialBookId) }
            val books = repository.getBooks()
            val bookMap = books.associateBy { it.id }

            buildQueue(initialBookId, bookMap)
            _uiState.update { it.copy(books = books, isLoading = false) }
        }
    }

    fun selectBook(bookId: Int?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, selectedBookId = bookId, currentIndex = 0) }
            val books = repository.getBooks()
            val bookMap = books.associateBy { it.id }
            buildQueue(bookId, bookMap)
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    private suspend fun buildQueue(bookId: Int?, bookMap: Map<Int, Book>) {
        val allProgress = repository.getAllChapterProgress().associateBy { "${it.bookId}:${it.chapter}" }
        val now = System.currentTimeMillis()

        val items = mutableListOf<AnchorDrillItem>()

        if (bookId != null) {
            // Drill this specific book in chapter order
            val anchors = repository.getChapterAnchors(bookId)
            val book = bookMap[bookId]
            val bookName = book?.nameEn ?: "Book $bookId"
            val bookKey = book?.key ?: "GEN"
            val siblings = anchors.map { AnchorSibling(it.chapter, it.word) }

            anchors.forEach { a ->
                val progress = allProgress["$bookId:${a.chapter}"]
                items.add(
                    AnchorDrillItem(
                        bookId = bookId,
                        bookName = bookName,
                        bookKey = bookKey,
                        chapter = a.chapter,
                        word = a.word,
                        scene = a.scene,
                        repetition = progress?.repetition ?: 0,
                        interval = progress?.interval ?: 0,
                        siblings = siblings
                    )
                )
            }
        } else {
            // Find chapters due for review across all books
            val dueList = allProgress.values.filter { it.nextDueDate <= now }.sortedBy { it.nextDueDate }
            val targetProgress = if (dueList.isNotEmpty()) dueList else allProgress.values.take(30)

            val anchorsByBook = mutableMapOf<Int, List<com.example.telugubible.data.model.ChapterAnchor>>()

            for (p in targetProgress) {
                val bookAnchors = anchorsByBook.getOrPut(p.bookId) {
                    repository.getChapterAnchors(p.bookId)
                }
                val anchor = bookAnchors.find { it.chapter == p.chapter }
                val book = bookMap[p.bookId]
                if (anchor != null && book != null) {
                    val siblings = bookAnchors.map { AnchorSibling(it.chapter, it.word) }
                    items.add(
                        AnchorDrillItem(
                            bookId = p.bookId,
                            bookName = book.nameEn,
                            bookKey = book.key,
                            chapter = p.chapter,
                            word = anchor.word,
                            scene = anchor.scene,
                            repetition = p.repetition,
                            interval = p.interval,
                            siblings = siblings
                        )
                    )
                }
            }

            // Fallback: if no progress exists yet, start with Genesis
            if (items.isEmpty()) {
                val genId = 1
                val anchors = repository.getChapterAnchors(genId)
                val book = bookMap[genId]
                val bookName = book?.nameEn ?: "Genesis"
                val bookKey = book?.key ?: "GEN"
                val siblings = anchors.map { AnchorSibling(it.chapter, it.word) }
                anchors.forEach { a ->
                    items.add(
                        AnchorDrillItem(
                            bookId = genId,
                            bookName = bookName,
                            bookKey = bookKey,
                            chapter = a.chapter,
                            word = a.word,
                            scene = a.scene,
                            repetition = 0,
                            interval = 0,
                            siblings = siblings
                        )
                    )
                }
            }
        }

        _uiState.update {
            it.copy(
                queue = items,
                currentIndex = 0,
                isRevealed = false,
                typedInput = "",
                judgement = null,
                isFinished = items.isEmpty()
            )
        }
    }

    fun setDirection(direction: AnchorDirection) {
        _uiState.update {
            it.copy(
                direction = direction,
                isRevealed = false,
                typedInput = "",
                judgement = null
            )
        }
    }

    fun onInputChange(input: String) {
        _uiState.update { it.copy(typedInput = input) }
    }

    fun checkAnswer() {
        val state = _uiState.value
        val item = state.currentItem ?: return

        val judgement = AnchorJudge.judgeByDirection(
            typed = state.typedInput,
            direction = state.direction,
            word = item.word,
            chapter = item.chapter,
            siblings = item.siblings
        )

        _uiState.update {
            it.copy(
                judgement = judgement,
                isRevealed = true
            )
        }
    }

    fun reveal() {
        _uiState.update { it.copy(isRevealed = true) }
    }

    fun gradeCurrent(score: Int) {
        val state = _uiState.value
        val item = state.currentItem ?: return

        viewModelScope.launch {
            repository.gradeChapterAnchor(item.bookId, item.chapter, score)

            val nextIndex = state.currentIndex + 1
            if (nextIndex >= state.queue.size) {
                _uiState.update { it.copy(isFinished = true, currentIndex = nextIndex) }
            } else {
                val nextItem = state.queue.getOrNull(nextIndex)
                // Auto rotate direction if known cold
                val autoDirection = if (nextItem != null) {
                    AnchorJudge.directionFor(nextItem.repetition, hasArt = true)
                } else state.direction

                _uiState.update {
                    it.copy(
                        currentIndex = nextIndex,
                        direction = autoDirection,
                        isRevealed = false,
                        typedInput = "",
                        judgement = null
                    )
                }
            }
        }
    }

    fun restart() {
        selectBook(_uiState.value.selectedBookId)
    }
}
