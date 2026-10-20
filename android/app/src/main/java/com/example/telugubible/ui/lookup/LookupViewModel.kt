package com.example.telugubible.ui.lookup

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.util.ScriptureRefParser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class LookupMode {
    VERSES, STRONGS
}

data class LookupUiState(
    val query: String = "",
    val mode: LookupMode = LookupMode.VERSES,
    val verseResults: List<VerseSearchResult> = emptyList(),
    val strongsResults: List<StrongsEntry> = emptyList(),
    val isSearching: Boolean = false,
    val hasSearched: Boolean = false
)

class LookupViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = BibleRepository(BibleDatabaseHelper(application))

    private val _uiState = MutableStateFlow(LookupUiState())
    val uiState: StateFlow<LookupUiState> = _uiState.asStateFlow()

    fun setQuery(q: String) {
        _uiState.update { it.copy(query = q) }
        if (q.isBlank()) {
            _uiState.update { it.copy(verseResults = emptyList(), strongsResults = emptyList(), hasSearched = false) }
        }
    }

    fun setMode(mode: LookupMode) {
        _uiState.update { it.copy(mode = mode) }
        val q = _uiState.value.query
        if (q.isNotBlank()) {
            performSearch(q, mode)
        }
    }

    fun performSearch(queryToUse: String = _uiState.value.query, modeToUse: LookupMode = _uiState.value.mode) {
        val q = queryToUse.trim()
        if (q.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSearching = true, hasSearched = true) }
            if (modeToUse == LookupMode.VERSES) {
                val books = repository.getBooks()
                val parsedRefs = ScriptureRefParser.parseReferences(q, books)
                if (parsedRefs.isNotEmpty()) {
                    val booksMap = books.associateBy { it.id }
                    val matchedVerses = mutableListOf<VerseSearchResult>()
                    for (ref in parsedRefs) {
                        for (vNum in ref.verseStart..ref.verseEnd) {
                            val verse = repository.getVerse(ref.bookId, ref.chapter, vNum)
                            val b = booksMap[ref.bookId]
                            if (verse != null && b != null) {
                                matchedVerses.add(
                                    VerseSearchResult(
                                        id = verse.id,
                                        bookId = verse.bookId,
                                        bookKey = b.key,
                                        bookNameEn = b.nameEn,
                                        bookNameTe = b.nameTe,
                                        chapter = verse.chapter,
                                        verse = verse.verse,
                                        textTe = verse.textTe,
                                        textEn = verse.textEn
                                    )
                                )
                            }
                        }
                    }
                    if (matchedVerses.isNotEmpty()) {
                        _uiState.update { it.copy(verseResults = matchedVerses, isSearching = false) }
                        return@launch
                    }
                }
                val results = repository.searchVerses(q, limit = 50)
                _uiState.update { it.copy(verseResults = results, isSearching = false) }
            } else {
                val results = repository.searchStrongs(q, limit = 30)
                _uiState.update { it.copy(strongsResults = results, isSearching = false) }
            }
        }
    }

    fun addVerseToMemory(bookId: Int, chapter: Int, verse: Int, onDone: () -> Unit) {
        viewModelScope.launch {
            repository.addUserVerse(bookId, chapter, verse)
            onDone()
        }
    }
}
