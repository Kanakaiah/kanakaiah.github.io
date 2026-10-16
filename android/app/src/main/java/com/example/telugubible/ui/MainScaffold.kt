package com.example.telugubible.ui

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.telugubible.theme.*
import com.example.telugubible.ui.bible.BibleBrowserScreen
import com.example.telugubible.ui.bible.BibleBrowserViewModel
import com.example.telugubible.ui.lookup.LookupScreen
import com.example.telugubible.ui.lookup.LookupViewModel
import com.example.telugubible.ui.practice.PracticeScreen
import com.example.telugubible.ui.practice.PracticeViewModel
import com.example.telugubible.ui.reader.ChapterReaderScreen
import com.example.telugubible.ui.reader.ReaderViewModel
import com.example.telugubible.ui.today.TodayScreen
import com.example.telugubible.ui.today.TodayViewModel

enum class RemoraTab(val title: String, val icon: ImageVector) {
    TODAY("Today", Icons.Default.Home),
    LOOKUP("Lookup", Icons.Default.Search),
    PRACTICE("Practice", Icons.Default.TrackChanges),
    BIBLE("Bible", Icons.AutoMirrored.Filled.MenuBook)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScaffold(
    todayViewModel: TodayViewModel = viewModel(),
    bibleBrowserViewModel: BibleBrowserViewModel = viewModel(),
    practiceViewModel: PracticeViewModel = viewModel(),
    lookupViewModel: LookupViewModel = viewModel(),
    readerViewModel: ReaderViewModel = viewModel()
) {
    var selectedTab by remember { mutableStateOf(RemoraTab.TODAY) }
    var isInReaderMode by remember { mutableStateOf(false) }
    var showAboutDialog by remember { mutableStateOf(false) }

    val todayState by todayViewModel.uiState.collectAsState()

    // Helper to open reader
    val openReader: (Int, Int) -> Unit = { bookId, chapter ->
        readerViewModel.selectBookAndChapterById(bookId, chapter)
        isInReaderMode = true
    }

    if (isInReaderMode) {
        ChapterReaderScreen(
            viewModel = readerViewModel,
            onBack = { isInReaderMode = false }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.MenuBook,
                                contentDescription = null,
                                tint = RemoraAccent,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (selectedTab == RemoraTab.BIBLE) "Bible" else "Remora",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = RemoraTextPrimary,
                                letterSpacing = (-0.5).sp
                            )
                        }
                    },
                    actions = {
                        // Streak Pill
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = RemoraCardBgElevated,
                            border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.padding(end = 6.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            ) {
                                Icon(
                                    Icons.Default.LocalFireDepartment,
                                    contentDescription = null,
                                    tint = RemoraGold,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${todayState.streak}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RemoraTextPrimary
                                )
                            }
                        }

                        // Info / About button
                        IconButton(onClick = { showAboutDialog = true }) {
                            Icon(
                                Icons.Outlined.Info,
                                contentDescription = "About",
                                tint = RemoraTextSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = RemoraBackground
                    )
                )
            },
            bottomBar = {
                Surface(
                    color = RemoraCardBg,
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    NavigationBar(
                        containerColor = RemoraCardBg,
                        tonalElevation = 0.dp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .height(64.dp)
                    ) {
                        RemoraTab.entries.forEach { tab ->
                            val isSelected = selectedTab == tab
                            NavigationBarItem(
                                selected = isSelected,
                                onClick = {
                                    selectedTab = tab
                                    if (tab == RemoraTab.TODAY) todayViewModel.loadData()
                                    if (tab == RemoraTab.PRACTICE) practiceViewModel.loadPracticeVerses()
                                },
                                icon = {
                                    Icon(
                                        tab.icon,
                                        contentDescription = tab.title,
                                        modifier = Modifier.size(22.dp)
                                    )
                                },
                                label = {
                                    Text(
                                        text = tab.title,
                                        fontSize = 11.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                    )
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = RemoraAccent,
                                    selectedTextColor = RemoraAccent,
                                    unselectedIconColor = RemoraTextMuted,
                                    unselectedTextColor = RemoraTextMuted,
                                    indicatorColor = RemoraAccent.copy(alpha = 0.15f)
                                )
                            )
                        }
                    }
                }
            },
            containerColor = RemoraBackground
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                Crossfade(targetState = selectedTab, label = "TabCrossfade") { tab ->
                    when (tab) {
                        RemoraTab.TODAY -> TodayScreen(
                            viewModel = todayViewModel,
                            onNavigateToPractice = { selectedTab = RemoraTab.PRACTICE },
                            onNavigateToReader = openReader
                        )
                        RemoraTab.LOOKUP -> LookupScreen(
                            viewModel = lookupViewModel,
                            onNavigateToReader = openReader
                        )
                        RemoraTab.PRACTICE -> PracticeScreen(
                            viewModel = practiceViewModel,
                            onNavigateToBible = { selectedTab = RemoraTab.BIBLE }
                        )
                        RemoraTab.BIBLE -> BibleBrowserScreen(
                            viewModel = bibleBrowserViewModel,
                            onOpenBook = { bookId -> openReader(bookId, 1) }
                        )
                    }
                }
            }
        }
    }

    if (showAboutDialog) {
        AlertDialog(
            onDismissRequest = { showAboutDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.MenuBook, contentDescription = null, tint = RemoraAccent)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Remora Bible", color = RemoraTextPrimary, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Remora is a full native Telugu & English Bible study and memory verse platform.",
                        color = RemoraTextSecondary,
                        fontSize = 14.sp
                    )
                    Text(
                        "• Complete offline SQLite database with all 66 books, 31,104 verses.",
                        color = RemoraTextSecondary,
                        fontSize = 13.sp
                    )
                    Text(
                        "• 14,197 Greek & Hebrew Strong's Concordance entries.",
                        color = RemoraTextSecondary,
                        fontSize = 13.sp
                    )
                    Text(
                        "• SuperMemo-2 (SM-2) spaced repetition memory drill.",
                        color = RemoraTextSecondary,
                        fontSize = 13.sp
                    )
                    Text(
                        "• 100% Native Jetpack Compose architecture.",
                        color = RemoraTextSecondary,
                        fontSize = 13.sp
                    )
                }
            },
            containerColor = RemoraCardBg,
            confirmButton = {
                Button(
                    onClick = { showAboutDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
                ) {
                    Text("Close")
                }
            }
        )
    }
}
