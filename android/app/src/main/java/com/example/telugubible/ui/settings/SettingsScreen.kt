package com.example.telugubible.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onBack: () -> Unit,
    onDataCleared: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var selectedCategory by rememberSaveable { mutableStateOf(SettingsCategory.APPEARANCE) }
    val listState = rememberLazyListState()
    LaunchedEffect(selectedCategory) { listState.scrollToItem(0) }

    var showClearDataConfirm by remember { mutableStateOf(false) }
    var showRestoreDialog by remember { mutableStateOf(false) }
    var restoreInputText by remember { mutableStateOf("") }
    var showBackupDialog by remember { mutableStateOf(false) }
    var exportedBackupText by remember { mutableStateOf("") }
    BackHandler(enabled = state.isRestoring || state.isClearing || state.isInspectingBackup) { }

    val createDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        if (uri != null) {
            viewModel.generateBackup(onReady = { json ->
                scope.launch {
                    val saved = withContext(Dispatchers.IO) {
                        runCatching { BackupFileIO.write({ context.contentResolver.openOutputStream(uri) }, json) }.isSuccess
                    }
                    Toast.makeText(context, if (saved) "Backup saved." else "Couldn't save the backup file.", Toast.LENGTH_SHORT).show()
                }
            })
        }
    }

    val openDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            scope.launch {
                val result = withContext(Dispatchers.IO) {
                    runCatching { BackupFileIO.read { context.contentResolver.openInputStream(uri) } }
                }
                result.fold(onSuccess = viewModel::prepareRestore,
                    onFailure = { error -> Toast.makeText(context, if (error is BackupTooLargeException) "Backup exceeds the 10 million character limit." else "Couldn't read the selected backup file.", Toast.LENGTH_SHORT).show() })
            }
        }
    }

    LaunchedEffect(state.toastMessage) {
        state.toastMessage?.let { msg ->
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            viewModel.clearToast()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Settings",
                        style = MaterialTheme.typography.titleLarge,
                        color = RemoraTextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = RemoraTextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = RemoraBackground
                )
            )
        },
        containerColor = RemoraBackground,
        modifier = modifier.fillMaxSize()
    ) { paddingValues ->
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = paddingValues.calculateTopPadding() + 8.dp,
                bottom = 40.dp
            ),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                SettingsCategoryTabs(selectedCategory) { selectedCategory = it }
            }
            if (selectedCategory != SettingsCategory.DATA) {
                item {
                    if (state.isLoading) {
                        CircularProgressIndicator()
                    } else {
                        SettingsCategoryContent(selectedCategory, state.settings, viewModel::updateSettings, viewModel::setChapterDisplayPreset)
                    }
                }
            }
            if (selectedCategory == SettingsCategory.DATA && state.isLoading) {
                item { CircularProgressIndicator() }
            }
            if (selectedCategory == SettingsCategory.DATA && !state.isLoading) {
                item {
                    DataManagementContent(
                        onExportFile = {
                            val date = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                            createDocumentLauncher.launch("remora_backup_$date.json")
                        },
                        onImportFile = { openDocumentLauncher.launch(arrayOf("application/json", "text/*", "*/*")) },
                        onExportText = { viewModel.generateBackup(onReady = { exportedBackupText = it; showBackupDialog = true }) },
                        onImportText = { restoreInputText = ""; showRestoreDialog = true },
                        onClear = { showClearDataConfirm = true }
                    )
                }
            }
        }
    }

    // Dialog: Confirm Clear All
    if (showClearDataConfirm) {
        AlertDialog(
            onDismissRequest = { if (!state.isClearing) showClearDataConfirm = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = RemoraDanger)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Clear All Data?", color = RemoraTextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Text(
                    "This permanently removes saved verses, collections, chapter and book progress, review history, settings and cached text from this device. Export a backup first if you want to keep them.",
                    color = RemoraTextSecondary,
                    fontSize = 13.sp
                )
            },
            containerColor = RemoraCardBg,
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.clearAllData {
                            showClearDataConfirm = false
                            Toast.makeText(context, "All user data deleted", Toast.LENGTH_SHORT).show()
                            onDataCleared()
                        }
                    },
                    enabled = !state.isClearing,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text(if (state.isClearing) "Clearing…" else "Clear data", color = MaterialTheme.colorScheme.onError)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDataConfirm = false }, enabled = !state.isClearing) {
                    Text("Cancel", color = RemoraTextSecondary)
                }
            }
        )
    }

    // Dialog: Exported Backup
    if (showBackupDialog) {
        AlertDialog(
            onDismissRequest = { showBackupDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Download, contentDescription = null, tint = RemoraAccent)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("User Data Backup", color = RemoraTextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column {
                    Text(
                        "Your backup has been generated. You can copy the JSON data or share it:",
                        color = RemoraTextSecondary,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = RemoraBackground,
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                    ) {
                        LazyColumn(modifier = Modifier.padding(8.dp)) {
                            item {
                                Text(
                                    text = exportedBackupText,
                                    fontSize = 11.sp,
                                    color = RemoraTextSecondary,
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            },
            containerColor = RemoraCardBg,
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("Remora Backup", exportedBackupText))
                            Toast.makeText(context, "Backup copied to clipboard!", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Copy JSON")
                    }
                    Button(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "application/json"
                                putExtra(Intent.EXTRA_TEXT, exportedBackupText)
                                putExtra(Intent.EXTRA_TITLE, "Remora_Backup.json")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Backup JSON"))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                        border = BorderStroke(1.dp, RemoraCardBorder)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(14.dp), tint = RemoraTextPrimary)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Share", color = RemoraTextPrimary)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showBackupDialog = false }) {
                    Text("Close", color = RemoraTextSecondary)
                }
            }
        )
    }

    // Dialog: Restore Backup
    if (showRestoreDialog) {
        AlertDialog(
            onDismissRequest = { showRestoreDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Upload, contentDescription = null, tint = RemoraAccent)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Restore from JSON", color = RemoraTextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column {
                    Text(
                        "Paste a previously exported Remora backup JSON below:",
                        color = RemoraTextSecondary,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = restoreInputText,
                        onValueChange = { restoreInputText = it },
                        placeholder = { Text("Paste JSON here...", color = RemoraTextMuted, fontSize = 12.sp) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = RemoraBackground,
                            unfocusedContainerColor = RemoraBackground,
                            focusedBorderColor = RemoraAccent,
                            unfocusedBorderColor = RemoraCardBorder,
                            focusedTextColor = RemoraTextPrimary,
                            unfocusedTextColor = RemoraTextPrimary
                        )
                    )
                }
            },
            containerColor = RemoraCardBg,
            confirmButton = {
                Button(
                    onClick = {
                        if (restoreInputText.isNotBlank()) {
                            val json = restoreInputText
                            restoreInputText = ""
                            showRestoreDialog = false
                            viewModel.prepareRestore(json)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
                ) {
                    Text("Review backup")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRestoreDialog = false }) {
                    Text("Cancel", color = RemoraTextSecondary)
                }
            }
        )
    }

    if (state.isInspectingBackup) {
        AlertDialog(onDismissRequest = {}, title = { Text("Checking backup") },
            text = { Text("Reading the backup before showing its contents.") },
            confirmButton = { CircularProgressIndicator() })
    }
    state.backupPreview?.let { preview ->
        BackupPreviewDialog(preview, state.isRestoring, state.backupError,
            onCancel = viewModel::cancelRestorePreview,
            onRestore = { viewModel.confirmPreparedRestore { success -> if (success) onDataCleared() } })
    }
    if (state.backupError != null && state.backupPreview == null && !state.isInspectingBackup) {
        AlertDialog(onDismissRequest = viewModel::cancelRestorePreview,
            title = { Text("Backup unavailable") }, text = { Text(state.backupError!!) },
            confirmButton = { TextButton(onClick = viewModel::cancelRestorePreview) { Text("Close") } })
    }
}
