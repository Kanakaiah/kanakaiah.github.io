package com.example.telugubible.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SettingsUiState(
    val settings: AppSettings = AppSettings(),
    val backupJson: String? = null,
    val toastMessage: String? = null,
    val isLoading: Boolean = false
)

class SettingsViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            val s = repository.getAppSettings()
            com.example.telugubible.theme.RemoraThemeState.themeName = s.theme
            _uiState.update { it.copy(settings = s) }
        }
    }

    fun updateSettings(transform: (AppSettings) -> AppSettings) {
        val updated = transform(_uiState.value.settings)
        _uiState.update { it.copy(settings = updated) }
        viewModelScope.launch {
            repository.saveAppSettings(updated)
        }
    }

    fun setTheme(theme: String) {
        com.example.telugubible.theme.RemoraThemeState.themeName = theme
        updateSettings { it.copy(theme = theme) }
    }

    fun setFontSize(size: Float) {
        updateSettings { it.copy(fontSize = size) }
    }

    fun setTtsEnabled(enabled: Boolean) {
        updateSettings { it.copy(ttsEnabled = enabled) }
    }

    fun setRecallMasking(enabled: Boolean) {
        updateSettings { it.copy(recallMasking = enabled) }
    }

    fun setBionicReading(enabled: Boolean) {
        updateSettings { it.copy(bionicReading = enabled) }
    }

    fun setBibleVersion(version: String) {
        updateSettings { it.copy(bibleVersion = version) }
    }

    fun setAnchorReveal(reveal: String) {
        updateSettings { it.copy(anchorReveal = reveal) }
    }

    fun setDailyChapterTarget(target: Int) {
        updateSettings { it.copy(dailyChapterTarget = target) }
    }

    fun setStreakIncludesChapters(enabled: Boolean) {
        updateSettings { it.copy(streakIncludesChapters = enabled) }
    }

    fun setChapterDisplayPreset(preset: String) {
        when (preset) {
            "study" -> updateSettings {
                it.copy(
                    showSectionHeadings = true,
                    showVerseNumbers = true,
                    showParagraphMarks = true,
                    showCrossRefMarkers = true
                )
            }
            "reading" -> updateSettings {
                it.copy(
                    showSectionHeadings = true,
                    showVerseNumbers = true,
                    showParagraphMarks = false,
                    showCrossRefMarkers = false
                )
            }
            "clean" -> updateSettings {
                it.copy(
                    showSectionHeadings = false,
                    showVerseNumbers = false,
                    showParagraphMarks = false,
                    showCrossRefMarkers = false
                )
            }
        }
    }

    fun toggleReadingOption(key: String) {
        updateSettings { s ->
            when (key) {
                "showSectionHeadings" -> s.copy(showSectionHeadings = !s.showSectionHeadings)
                "showVerseNumbers" -> s.copy(showVerseNumbers = !s.showVerseNumbers)
                "showParagraphMarks" -> s.copy(showParagraphMarks = !s.showParagraphMarks)
                "showCrossRefMarkers" -> s.copy(showCrossRefMarkers = !s.showCrossRefMarkers)
                else -> s
            }
        }
    }

    fun generateBackup(onReady: (String) -> Unit) {
        viewModelScope.launch {
            val json = repository.exportUserDataJson()
            _uiState.update { it.copy(backupJson = json, toastMessage = "Backup generated successfully") }
            onReady(json)
        }
    }

    fun restoreBackup(jsonString: String, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            val success = repository.restoreUserDataJson(jsonString)
            if (success) {
                val reloaded = repository.getAppSettings()
                _uiState.update { it.copy(settings = reloaded, toastMessage = "Data restored successfully!") }
            } else {
                _uiState.update { it.copy(toastMessage = "Failed to restore: Invalid backup file") }
            }
            onComplete(success)
        }
    }

    fun clearAllData(onComplete: () -> Unit) {
        viewModelScope.launch {
            repository.clearAllUserData()
            val reloaded = repository.getAppSettings()
            _uiState.update { it.copy(settings = reloaded, toastMessage = "All user data cleared") }
            onComplete()
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
