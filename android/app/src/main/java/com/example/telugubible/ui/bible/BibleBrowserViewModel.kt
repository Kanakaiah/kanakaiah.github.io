package com.example.telugubible.ui.bible

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.db.BibleDatabaseHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BibleBrowserUiState(
    val allBooks: List<Book> = emptyList(),
    val filteredBooks: List<Book> = emptyList(),
    val currentTestament: String = "ALL",
    val currentSection: String = "All",
    val searchQuery: String = "",
    val isLoading: Boolean = true,
    val activeVersion: String = "LSB"
)

class BibleBrowserViewModel @JvmOverloads constructor(application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(BibleBrowserUiState())
    val uiState: StateFlow<BibleBrowserUiState> = _uiState.asStateFlow()

    init {
        loadBooks()
    }

    private fun loadBooks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val books = repository.getBooks()
            val settings = repository.getAppSettings()
            val ver = settings.bibleVersion.ifBlank { "LSB" }
            _uiState.update {
                it.copy(
                    allBooks = books,
                    activeVersion = ver,
                    filteredBooks = applyFilter(books, it.currentTestament, it.currentSection, it.searchQuery),
                    isLoading = false
                )
            }
        }
    }

    fun refreshVersion() {
        viewModelScope.launch {
            val version = repository.getAppSettings().bibleVersion.ifBlank { "LSB" }
            _uiState.update { it.copy(activeVersion = version) }
        }
    }

    fun setTestament(testament: String) {
        val state = _uiState.value
        val filtered = applyFilter(state.allBooks, testament, "All", state.searchQuery)
        _uiState.update {
            it.copy(
                currentTestament = testament,
                currentSection = "All",
                filteredBooks = filtered
            )
        }
    }

    fun setSection(section: String) {
        val state = _uiState.value
        val filtered = applyFilter(state.allBooks, state.currentTestament, section, state.searchQuery)
        _uiState.update {
            it.copy(
                currentSection = section,
                filteredBooks = filtered
            )
        }
    }

    fun setSearchQuery(query: String) {
        val state = _uiState.value
        val filtered = applyFilter(state.allBooks, state.currentTestament, state.currentSection, query)
        _uiState.update {
            it.copy(
                searchQuery = query,
                filteredBooks = filtered
            )
        }
    }

    private fun applyFilter(books: List<Book>, testament: String, section: String, query: String): List<Book> {
        val q = query.trim().lowercase()

        // If actively searching, search across ALL books in both testaments
        if (q.isNotEmpty()) {
            return books.filter { b ->
                b.nameEn.lowercase().contains(q) ||
                b.nameTe.lowercase().contains(q) ||
                b.themeWord.lowercase().contains(q) ||
                b.keyWord.lowercase().contains(q) ||
                b.subtitle.lowercase().contains(q)
            }
        }

        return books.filter { b ->
            val matchTestament = testament == "ALL" || b.testament.equals(testament, ignoreCase = true)
            val matchSection = section == "All" || b.section.equals(section, ignoreCase = true)
            matchTestament && matchSection
        }
    }
}
