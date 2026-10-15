package com.example.telugubible.ui.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChapterReaderScreen(
    viewModel: ReaderViewModel,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()

    // Scroll to top when book or chapter changes
    LaunchedEffect(state.currentBook?.id, state.currentChapter) {
        listState.scrollToItem(0)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val bookTitle = if (state.language == BibleLanguage.TELUGU) {
                        state.currentBook?.nameTe ?: ""
                    } else {
                        state.currentBook?.nameEn ?: ""
                    }
                    Surface(
                        onClick = { viewModel.toggleBookSelector(true) },
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "$bookTitle ${state.currentChapter}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "▼", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                },
                actions = {
                    // Typography / Settings Button
                    IconButton(onClick = { viewModel.toggleSettings(true) }) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = state.fontSizeScale.label,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 4.dp,
                shadowElevation = 8.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilledTonalButton(
                        onClick = { viewModel.previousChapter() },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("← Previous")
                    }

                    Text(
                        text = "Ch ${state.currentChapter} / ${state.currentBook?.chapters ?: 1}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Button(
                        onClick = { viewModel.nextChapter() },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Next →")
                    }
                }
            }
        },
        modifier = modifier
    ) { innerPadding ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val baseFontSize = 18.sp * state.fontSizeScale.multiplier
            val baseLineHeight = baseFontSize * 1.6f

            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 20.dp),
                contentPadding = PaddingValues(top = 12.dp, bottom = 48.dp)
            ) {
                // Chapter Illustration Card
                item(key = "header_illustration") {
                    val bookKey = state.currentBook?.key ?: "genesis"
                    val imageUrl = "https://kanakaiah.github.io/chapters/$bookKey/ch${state.currentChapter}.jpg"

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 20.dp)
                    ) {
                        AsyncNativeImage(
                            url = imageUrl,
                            contentDescription = "Chapter Illustration",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clip(RoundedCornerShape(16.dp))
                        )
                    }
                }

                // Verses List
                items(state.verses, key = { it.id }) { verse ->
                    val isParagraphStart = verse.verse in state.paragraphBreaks && verse.verse > 1
                    val verseText = if (state.language == BibleLanguage.TELUGU) {
                        verse.textTe ?: verse.textEn ?: ""
                    } else {
                        verse.textEn ?: verse.textTe ?: ""
                    }

                    if (isParagraphStart) {
                        Spacer(modifier = Modifier.height(14.dp))
                    }

                    val annotatedText = buildAnnotatedString {
                        withStyle(
                            SpanStyle(
                                fontSize = (baseFontSize.value * 0.65f).sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                baselineShift = BaselineShift.Superscript
                            )
                        ) {
                            append("${verse.verse} ")
                        }
                        append(verseText)
                    }

                    Text(
                        text = annotatedText,
                        fontSize = baseFontSize,
                        lineHeight = baseLineHeight,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                    )
                }
            }
        }

        // Book and Chapter selector sheet
        if (state.showBookSelector) {
            BookSelectorSheet(
                books = state.books,
                currentBook = state.currentBook,
                onDismiss = { viewModel.toggleBookSelector(false) },
                onSelect = { book, chapter ->
                    viewModel.selectBookAndChapter(book, chapter)
                }
            )
        }

        // Settings sheet
        if (state.showSettings) {
            SettingsSheet(
                fontSizeScale = state.fontSizeScale,
                language = state.language,
                onIncreaseFontSize = { viewModel.increaseFontSize() },
                onDecreaseFontSize = { viewModel.decreaseFontSize() },
                onResetFontSize = { viewModel.resetFontSize() },
                onLanguageChange = { viewModel.setLanguage(it) },
                onDismiss = { viewModel.toggleSettings(false) }
            )
        }

        // Strong's Concordance Dialog
        state.selectedStrongs?.let { entry ->
            StrongsDialog(
                entry = entry,
                onDismiss = { viewModel.dismissStrongs() }
            )
        }
    }
}

@Composable
fun AsyncNativeImage(
    url: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop
) {
    var imageBitmap by remember(url) { mutableStateOf<androidx.compose.ui.graphics.ImageBitmap?>(null) }

    LaunchedEffect(url) {
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.instanceFollowRedirects = true
                conn.connect()
                if (conn.responseCode == 200) {
                    val stream = conn.inputStream
                    val dec = android.graphics.BitmapFactory.decodeStream(stream)
                    if (dec != null) {
                        imageBitmap = dec.asImageBitmap()
                    }
                }
            } catch (_: Exception) {
                // Silently fallback to placeholder box
            }
        }
    }

    if (imageBitmap != null) {
        androidx.compose.foundation.Image(
            bitmap = imageBitmap!!,
            contentDescription = contentDescription,
            contentScale = contentScale,
            modifier = modifier
        )
    } else {
        Box(
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "✝",
                fontSize = 28.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
            )
        }
    }
}

