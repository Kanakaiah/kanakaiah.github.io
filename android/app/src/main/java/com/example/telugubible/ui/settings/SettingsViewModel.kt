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
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class SettingsUiState(
    val settings: AppSettings = AppSettings(),
    val backupJson: String? = null,
    val toastMessage: String? = null,
    val settingsRevision: Int = 0,
    val isLoading: Boolean = true
)

class SettingsViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application)
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()
    private val settingsMutex = Mutex()
    private var pendingWrites = 0

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            settingsMutex.withLock {
                val s = repository.getAppSettings()
                if (pendingWrites == 0) _uiState.update { it.copy(settings = s, isLoading = false) }
            }
        }
    }

    fun updateSettings(transform: (AppSettings) -> AppSettings) {
        if (_uiState.value.isLoading) return
        val updated = transform(_uiState.value.settings)
        _uiState.update { it.copy(settings = updated) }
        pendingWrites++
        viewModelScope.launch {
            try {
                settingsMutex.withLock {
                    repository.saveAppSettings(updated)
                    _uiState.update { it.copy(settingsRevision = it.settingsRevision + 1) }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _uiState.update { it.copy(toastMessage = "Couldn't save settings. Please check them and try again.") }
            } finally {
                pendingWrites--
                if (pendingWrites == 0) loadSettings()
            }
        }
    }

    fun setTheme(theme: String) {
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
                _uiState.update { it.copy(settings = reloaded, settingsRevision = it.settingsRevision + 1, toastMessage = "Data restored successfully!") }
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
            _uiState.update { it.copy(settings = reloaded, settingsRevision = it.settingsRevision + 1, toastMessage = "All user data cleared") }
            onComplete()
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
