package com.example.telugubible.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.BackupInspector
import com.example.telugubible.data.model.BackupPreview
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

data class SettingsUiState(
    val settings: AppSettings = AppSettings(),
    val backupJson: String? = null,
    val toastMessage: String? = null,
    val settingsRevision: Int = 0,
    val isLoading: Boolean = true,
    val backupPreview: BackupPreview? = null,
    val isInspectingBackup: Boolean = false,
    val isRestoring: Boolean = false,
    val isClearing: Boolean = false,
    val backupError: String? = null
)

class SettingsViewModel @JvmOverloads constructor(
    application: Application,
    private val repository: BibleRepository = BibleRepository(application),
    private val backupDispatcher: CoroutineDispatcher = Dispatchers.Default
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()
    private val settingsMutex = Mutex()
    private var pendingWrites = 0
    private var preparedBackup: String? = null

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

    fun generateBackup(onError: () -> Unit = {}, onReady: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val json = settingsMutex.withLock { repository.exportUserDataJson() }
                BackupFileIO.checkSize(json.length)
                withContext(backupDispatcher) { BackupInspector.inspect(json) }
                _uiState.update { it.copy(backupJson = json) }
                onReady(json)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                onError()
                val message = if (e is BackupTooLargeException) "Backup exceeds the 10 million character limit." else "Couldn't create the backup. Please try again."
                _uiState.update { it.copy(toastMessage = message) }
            }
        }
    }

    fun prepareRestore(json: String) {
        if (_uiState.value.isInspectingBackup || _uiState.value.isRestoring || _uiState.value.isClearing) return
        preparedBackup = null
        _uiState.update { it.copy(isInspectingBackup = true, backupPreview = null, backupError = null) }
        viewModelScope.launch {
            try {
                val preview = withContext(backupDispatcher) { BackupFileIO.checkSize(json.length); BackupInspector.inspect(json) }
                preparedBackup = json
                _uiState.update { it.copy(backupPreview = preview) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val message = if (e is BackupTooLargeException) "This backup exceeds the 10 million character limit. Your data has not changed."
                    else "This file is not a supported Remora backup. Your data has not changed."
                _uiState.update { it.copy(backupError = message) }
            } finally {
                _uiState.update { it.copy(isInspectingBackup = false) }
            }
        }
    }

    fun cancelRestorePreview() {
        if (_uiState.value.isRestoring) return
        preparedBackup = null
        _uiState.update { it.copy(backupPreview = null, backupError = null) }
    }

    fun confirmPreparedRestore(onComplete: (Boolean) -> Unit) {
        val json = preparedBackup ?: return
        restoreBackup(json) { success ->
            if (success) preparedBackup = null
            onComplete(success)
        }
    }

    fun restoreBackup(jsonString: String, onComplete: (Boolean) -> Unit) {
        if (_uiState.value.isRestoring || _uiState.value.isClearing) return
        _uiState.update { it.copy(isRestoring = true, backupError = null) }
        viewModelScope.launch {
            try {
                val success = settingsMutex.withLock { repository.restoreUserDataJson(jsonString) }
                if (success) {
                    val reloaded = repository.getAppSettings()
                    _uiState.update { it.copy(settings = reloaded, settingsRevision = it.settingsRevision + 1, backupPreview = null, toastMessage = "Backup restored.") }
                } else {
                    _uiState.update { it.copy(backupError = "Couldn't restore this backup. Your data has not changed.") }
                }
                onComplete(success)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _uiState.update { it.copy(backupError = "Couldn't confirm the restore. Check your data before trying again.") }
                onComplete(false)
            } finally {
                _uiState.update { it.copy(isRestoring = false) }
            }
        }
    }

    fun clearAllData(onComplete: () -> Unit) {
        if (_uiState.value.isRestoring || _uiState.value.isClearing) return
        _uiState.update { it.copy(isClearing = true) }
        viewModelScope.launch {
            try {
                settingsMutex.withLock { repository.clearAllUserData() }
                val reloaded = repository.getAppSettings()
                _uiState.update { it.copy(settings = reloaded, settingsRevision = it.settingsRevision + 1, toastMessage = "All user data cleared") }
                onComplete()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _uiState.update { it.copy(toastMessage = "Couldn't clear the data. Please check and try again.") }
            } finally {
                _uiState.update { it.copy(isClearing = false) }
            }
        }
    }

    fun clearToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
