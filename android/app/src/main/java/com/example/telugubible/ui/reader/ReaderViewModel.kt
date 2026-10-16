package com.example.telugubible.ui.reader

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class FontSizeScale(val label: String, val multiplier: Float) {
    XS("XS", 0.85f),
    S("S", 1.00f),
    M("M", 1.15f),
    L("L", 1.30f),
    XL("XL", 1.45f)
}

enum class BibleLanguage(val code: String, val displayName: String) {
    TELUGU("TE", "తెలుగు"),
    ENGLISH("EN", "English")
}

data class ReaderUiState(
    val books: List<Book> = emptyList(),
    val currentBook: Book? = null,
    val currentChapter: Int = 1,
    val verses: List<Verse> = emptyList(),
    val paragraphBreaks: Set<Int> = emptySet(),
    val fontSizeScale: FontSizeScale = FontSizeScale.S,
    val language: BibleLanguage = BibleLanguage.TELUGU,
    val showBookSelector: Boolean = false,
    val showSettings: Boolean = false,
    val selectedStrongs: StrongsEntry? = null,
    val isImmersive: Boolean = false,
    val isLoading: Boolean = true
)

class ReaderViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = BibleRepository(BibleDatabaseHelper(application))

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            val books = repository.getBooks()
            val firstBook = books.firstOrNull { it.id == 1 } ?: books.firstOrNull()
            if (firstBook != null) {
                val verses = repository.getVerses(firstBook.id, 1)
                val breaks = repository.getParagraphBreaks(firstBook.id, 1)
                _uiState.update {
                    it.copy(
                        books = books,
                        currentBook = firstBook,
                        currentChapter = 1,
                        verses = verses,
                        paragraphBreaks = breaks,
                        isLoading = false
                    )
                }
            }
        }
    }

    fun selectBookAndChapterById(bookId: Int, chapter: Int = 1) {
        viewModelScope.launch {
            val books = _uiState.value.books.ifEmpty { repository.getBooks() }
            val target = books.firstOrNull { it.id == bookId } ?: return@launch
            selectBookAndChapter(target, chapter)
        }
    }

    fun selectBookAndChapter(book: Book, chapter: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, showBookSelector = false) }
            val verses = repository.getVerses(book.id, chapter)
            val breaks = repository.getParagraphBreaks(book.id, chapter)
            _uiState.update {
                it.copy(
                    currentBook = book,
                    currentChapter = chapter,
                    verses = verses,
                    paragraphBreaks = breaks,
                    isLoading = false
                )
            }
        }
    }

    fun nextChapter() {
        val currentBook = _uiState.value.currentBook ?: return
        val currentChapter = _uiState.value.currentChapter
        if (currentChapter < currentBook.chapters) {
            selectBookAndChapter(currentBook, currentChapter + 1)
        } else {
            val books = _uiState.value.books
            val nextIndex = books.indexOfFirst { it.id == currentBook.id } + 1
            if (nextIndex < books.size) {
                selectBookAndChapter(books[nextIndex], 1)
            }
        }
    }

    fun previousChapter() {
        val currentBook = _uiState.value.currentBook ?: return
        val currentChapter = _uiState.value.currentChapter
        if (currentChapter > 1) {
            selectBookAndChapter(currentBook, currentChapter - 1)
        } else {
            val books = _uiState.value.books
            val prevIndex = books.indexOfFirst { it.id == currentBook.id } - 1
            if (prevIndex >= 0) {
                val prevBook = books[prevIndex]
                selectBookAndChapter(prevBook, prevBook.chapters)
            }
        }
    }

    fun increaseFontSize() {
        val values = FontSizeScale.entries
        val currentIndex = values.indexOf(_uiState.value.fontSizeScale)
        if (currentIndex < values.size - 1) {
            _uiState.update { it.copy(fontSizeScale = values[currentIndex + 1]) }
        }
    }

    fun decreaseFontSize() {
        val values = FontSizeScale.entries
        val currentIndex = values.indexOf(_uiState.value.fontSizeScale)
        if (currentIndex > 0) {
            _uiState.update { it.copy(fontSizeScale = values[currentIndex - 1]) }
        }
    }

    fun resetFontSize() {
        _uiState.update { it.copy(fontSizeScale = FontSizeScale.S) }
    }

    fun setLanguage(lang: BibleLanguage) {
        _uiState.update { it.copy(language = lang) }
    }

    fun toggleBookSelector(show: Boolean) {
        _uiState.update { it.copy(showBookSelector = show) }
    }

    fun toggleSettings(show: Boolean) {
        _uiState.update { it.copy(showSettings = show) }
    }

    fun toggleImmersive() {
        _uiState.update { it.copy(isImmersive = !it.isImmersive) }
    }

    fun lookupStrongs(id: String) {
        viewModelScope.launch {
            val entry = repository.getStrongs(id)
            _uiState.update { it.copy(selectedStrongs = entry) }
        }
    }

    fun dismissStrongs() {
        _uiState.update { it.copy(selectedStrongs = null) }
    }
}
