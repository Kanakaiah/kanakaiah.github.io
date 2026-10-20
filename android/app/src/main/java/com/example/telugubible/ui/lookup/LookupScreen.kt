package com.example.telugubible.ui.lookup

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.theme.*

@Composable
fun LookupScreen(
    viewModel: LookupViewModel,
    onNavigateToReader: (Int, Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    var snackbarMessage by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(RemoraBackground)
            .padding(horizontal = 16.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(12.dp))

            // Search Bar
            OutlinedTextField(
                value = state.query,
                onValueChange = { viewModel.setQuery(it) },
                placeholder = {
                    Text(
                        if (state.mode == LookupMode.VERSES)
                            "Search 31,104 verses (Telugu or English)..."
                        else
                            "Search Strong's (G3056, H7225, logos, grace)...",
                        color = RemoraTextMuted,
                        fontSize = 13.sp
                    )
                },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = RemoraTextMuted) },
                trailingIcon = {
                    if (state.query.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setQuery("") }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = RemoraTextMuted)
                        }
                    }
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = {
                    viewModel.performSearch()
                    focusManager.clearFocus()
                }),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = RemoraCardBg,
                    unfocusedContainerColor = RemoraCardBg,
                    focusedTextColor = RemoraTextPrimary,
                    unfocusedTextColor = RemoraTextPrimary,
                    focusedBorderColor = RemoraAccent,
                    unfocusedBorderColor = RemoraCardBorder
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Mode Switcher Tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(RemoraCardBg, shape = RoundedCornerShape(10.dp))
                    .border(1.dp, RemoraCardBorder, shape = RoundedCornerShape(10.dp))
                    .padding(4.dp)
            ) {
                Surface(
                    onClick = { viewModel.setMode(LookupMode.VERSES) },
                    shape = RoundedCornerShape(8.dp),
                    color = if (state.mode == LookupMode.VERSES) RemoraAccent else Color.Transparent,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(modifier = Modifier.padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                        Text(
                            text = "Bible Verses",
                            fontSize = 13.sp,
                            fontWeight = if (state.mode == LookupMode.VERSES) FontWeight.Bold else FontWeight.Medium,
                            color = if (state.mode == LookupMode.VERSES) Color.White else RemoraTextSecondary
                        )
                    }
                }

                Surface(
                    onClick = { viewModel.setMode(LookupMode.STRONGS) },
                    shape = RoundedCornerShape(8.dp),
                    color = if (state.mode == LookupMode.STRONGS) RemoraAccent else Color.Transparent,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(modifier = Modifier.padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                        Text(
                            text = "Strong's Concordance",
                            fontSize = 13.sp,
                            fontWeight = if (state.mode == LookupMode.STRONGS) FontWeight.Bold else FontWeight.Medium,
                            color = if (state.mode == LookupMode.STRONGS) Color.White else RemoraTextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Results List
            if (state.isSearching) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = RemoraAccent)
                }
            } else if (state.hasSearched) {
                if (state.mode == LookupMode.VERSES) {
                    if (state.verseResults.isEmpty()) {
                        EmptyResultView("No verses found matching \"${state.query}\"")
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(bottom = 96.dp)
                        ) {
                            items(state.verseResults, key = { it.id }) { result ->
                                VerseResultCard(
                                    result = result,
                                    onRead = { onNavigateToReader(result.bookId, result.chapter) },
                                    onAddToMemory = {
                                        viewModel.addVerseToMemory(result.bookId, result.chapter, result.verse) {
                                            snackbarMessage = "Added ${result.bookNameEn} ${result.chapter}:${result.verse} to Today"
                                        }
                                    }
                                )
                            }
                        }
                    }
                } else {
                    if (state.strongsResults.isEmpty()) {
                        EmptyResultView("No Strong's entries found matching \"${state.query}\"")
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(bottom = 96.dp)
                        ) {
                            items(state.strongsResults, key = { it.id }) { entry ->
                                StrongsResultCard(entry = entry)
                            }
                        }
                    }
                }
            } else {
                InitialLookupPrompt(state.mode)
            }
        }

        // Notification Snackbar
        snackbarMessage?.let { msg ->
            Snackbar(
                action = {
                    TextButton(onClick = { snackbarMessage = null }) {
                        Text("OK", color = RemoraAccentLight)
                    }
                },
                containerColor = RemoraCardBgElevated,
                contentColor = RemoraTextPrimary,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 80.dp)
            ) {
                Text(msg)
            }
        }
    }
}

@Composable
private fun VerseResultCard(
    result: VerseSearchResult,
    onRead: () -> Unit,
    onAddToMemory: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${result.bookNameEn} ${result.chapter}:${result.verse}",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraAccentLight
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    IconButton(onClick = onAddToMemory, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Add, contentDescription = "Add to Memory", tint = RemoraTextSecondary, modifier = Modifier.size(18.dp))
                    }
                    OutlinedButton(
                        onClick = onRead,
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder)
                    ) {
                        Icon(Icons.Default.MenuBook, contentDescription = null, tint = RemoraTextSecondary, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Read", fontSize = 11.sp, color = RemoraTextSecondary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (!result.textTe.isNullOrBlank()) {
                Text(
                    text = result.textTe,
                    fontSize = 15.sp,
                    lineHeight = 22.sp,
                    color = RemoraTextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            if (!result.textEn.isNullOrBlank()) {
                Text(
                    text = result.textEn,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    color = RemoraTextSecondary
                )
            }
        }
    }
}

@Composable
private fun StrongsResultCard(entry: StrongsEntry) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = RemoraAccent.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = entry.id,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccentLight,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (entry.lang == "G") "Greek" else "Hebrew",
                        fontSize = 12.sp,
                        color = RemoraTextMuted
                    )
                }

                if (!entry.lemma.isNullOrBlank()) {
                    Text(
                        text = entry.lemma,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                }
            }

            if (!entry.xlit.isNullOrBlank() || !entry.pron.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "${entry.xlit ?: ""} ${if (!entry.pron.isNullOrBlank()) "(${entry.pron})" else ""}".trim(),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = RemoraGold
                )
            }

            if (!entry.strongsDef.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = entry.strongsDef,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    color = RemoraTextPrimary
                )
            }

            if (!entry.kjvDef.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Translation: ${entry.kjvDef}",
                    fontSize = 12.sp,
                    color = RemoraTextSecondary
                )
            }
        }
    }
}

@Composable
private fun EmptyResultView(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 60.dp),
        contentAlignment = Alignment.TopCenter
    ) {
        Text(message, color = RemoraTextSecondary, fontSize = 14.sp)
    }
}

@Composable
private fun InitialLookupPrompt(mode: LookupMode) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 60.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Search,
            contentDescription = null,
            tint = RemoraTextMuted,
            modifier = Modifier.size(48.dp)
        )
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = if (mode == LookupMode.VERSES)
                "Search any Telugu or English verse phrase"
            else
                "Search Strong's Greek or Hebrew concordance",
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            color = RemoraTextSecondary
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = if (mode == LookupMode.VERSES)
                "e.g. \"In the beginning\", \"ప్రేమ\", \"grace\", \"devudu\""
            else
                "e.g. \"G3056\", \"H7225\", \"logos\", \"bereshit\"",
            fontSize = 12.sp,
            color = RemoraTextMuted
        )
    }
}
