package com.example.telugubible.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
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
    var selectedCategory by rememberSaveable { mutableStateOf(SettingsCategory.APPEARANCE) }
    val listState = rememberLazyListState()
    LaunchedEffect(selectedCategory) { listState.scrollToItem(0) }

    var showClearDataConfirm by remember { mutableStateOf(false) }
    var showRestoreDialog by remember { mutableStateOf(false) }
    var restoreInputText by remember { mutableStateOf("") }
    var showBackupDialog by remember { mutableStateOf(false) }
    var exportedBackupText by remember { mutableStateOf("") }

    val createDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        if (uri != null) {
            viewModel.generateBackup { json ->
                try {
                    context.contentResolver.openOutputStream(uri)?.use { os ->
                        os.write(json.toByteArray(Charsets.UTF_8))
                    }
                    Toast.makeText(context, "Backup saved to device storage!", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(context, "Failed to save backup: " + e.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    val openDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonString = context.contentResolver.openInputStream(uri)?.use { isStream ->
                    isStream.bufferedReader().readText()
                }
                if (!jsonString.isNullOrBlank()) {
                    viewModel.restoreBackup(jsonString) { success ->
                        if (success) {
                            Toast.makeText(context, "Data restored successfully!", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "Failed to restore: Invalid backup file format", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error reading backup file: " + e.message, Toast.LENGTH_SHORT).show()
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
            // 4. Data Management Section
            item {
                SettingsSectionHeader(icon = Icons.Default.Download, title = "Data Management")
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = RemoraCardBg,
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        // Backup
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = "Backup User Data",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                            Text(
                                text = "Export memory verses, chapter progress, and streak to JSON",
                                fontSize = 12.sp,
                                color = RemoraTextSecondary
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = {
                                        val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                                        createDocumentLauncher.launch("remora_backup_$dateStr.json")
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onPrimary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Save File", color = MaterialTheme.colorScheme.onPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                Button(
                                    onClick = {
                                        viewModel.generateBackup { json ->
                                            exportedBackupText = json
                                            showBackupDialog = true
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                                    border = BorderStroke(1.dp, RemoraCardBorder),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(14.dp), tint = RemoraTextSecondary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Copy / Share", color = RemoraTextSecondary, fontSize = 12.sp)
                                }
                            }
                        }

                        HorizontalDivider(color = RemoraCardBorder)

                        // Restore
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = "Restore User Data",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary
                            )
                            Text(
                                text = "Load a previously exported JSON backup file",
                                fontSize = 12.sp,
                                color = RemoraTextSecondary
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = {
                                        openDocumentLauncher.launch(arrayOf("application/json", "text/*", "*/*"))
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onPrimary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Pick File", color = MaterialTheme.colorScheme.onPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                Button(
                                    onClick = {
                                        restoreInputText = ""
                                        showRestoreDialog = true
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraCardBgElevated),
                                    border = BorderStroke(1.dp, RemoraCardBorder),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp), tint = RemoraTextSecondary)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Paste Text", color = RemoraTextSecondary, fontSize = 12.sp)
                                }
                            }
                        }

                        HorizontalDivider(color = RemoraCardBorder)

                        // Clear All Data (Danger Zone)
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraDanger.copy(alpha = 0.08f),
                            border = BorderStroke(1.dp, RemoraDanger.copy(alpha = 0.25f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Danger Zone",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RemoraDanger
                                    )
                                    Text(
                                        text = "Permanently delete all user verses and progress",
                                        fontSize = 11.sp,
                                        color = RemoraDanger.copy(alpha = 0.8f)
                                    )
                                }
                                Button(
                                    onClick = { showClearDataConfirm = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = RemoraDanger),
                                    shape = RoundedCornerShape(6.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text("Clear All", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }
            }
        }
    }

    // Dialog: Confirm Clear All
    if (showClearDataConfirm) {
        AlertDialog(
            onDismissRequest = { showClearDataConfirm = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = RemoraDanger)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Clear All Data?", color = RemoraTextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Text(
                    "This will delete all your added memory verses, chapter anchor progress, streaks, and review history. This action cannot be undone.",
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
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraDanger)
                ) {
                    Text("Yes, Delete All", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDataConfirm = false }) {
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
                            viewModel.restoreBackup(restoreInputText) { success ->
                                if (success) {
                                    showRestoreDialog = false
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
                ) {
                    Text("Restore")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRestoreDialog = false }) {
                    Text("Cancel", color = RemoraTextSecondary)
                }
            }
        )
    }
}

@Composable
private fun SettingsSectionHeader(icon: ImageVector, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = RemoraAccentLight,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = title.uppercase(),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = RemoraAccentLight
        )
    }
}
