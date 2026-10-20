package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(
    fontSizeScale: FontSizeScale,
    language: BibleLanguage,
    readerTheme: ReaderTheme = ReaderTheme.OBSIDIAN,
    readerFontFamily: ReaderFontFamily = ReaderFontFamily.MERRIWEATHER,
    onIncreaseFontSize: () -> Unit,
    onDecreaseFontSize: () -> Unit,
    onResetFontSize: () -> Unit,
    onLanguageChange: (BibleLanguage) -> Unit,
    onThemeChange: (ReaderTheme) -> Unit = {},
    onFontFamilyChange: (ReaderFontFamily) -> Unit = {},
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = "Reading Settings",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            // 1. Theme Palette Selector (Obsidian, Umber, Sepia, Paper)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Theme Palette",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    ReaderTheme.entries.forEach { theme ->
                        val isSelected = theme == readerTheme
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = theme.backgroundColor,
                            border = BorderStroke(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) theme.accentColor else Color.Gray.copy(alpha = 0.3f)
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .clickable { onThemeChange(theme) }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(10.dp)
                                            .clip(CircleShape)
                                            .background(theme.accentColor)
                                    )
                                    Text(
                                        text = theme.label,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = theme.textColor
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 2. Typography Font Style (Serif vs Sans)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Font Family",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(3.dp),
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ReaderFontFamily.values().forEach { font ->
                            val isSelected = readerFontFamily == font
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSelected) readerTheme.accentColor else Color.Transparent)
                                    .clickable { onFontFamilyChange(font) }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = font.label,
                                    fontSize = 12.sp,
                                    fontFamily = font.fontFamily,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else readerTheme.secondaryTextColor
                                )
                            }
                        }
                    }
                }
            }

            // 3. Text Size Control
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Text Size",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilledTonalButton(
                        onClick = onDecreaseFontSize,
                        enabled = fontSizeScale != FontSizeScale.XS,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("−", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }

                    Surface(
                        onClick = onResetFontSize,
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier
                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(8.dp))
                            .padding(horizontal = 20.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = fontSizeScale.label,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    FilledTonalButton(
                        onClick = onIncreaseFontSize,
                        enabled = fontSizeScale != FontSizeScale.XL,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("+", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // 4. Translation Switcher
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Bible Translation",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    FilterChip(
                        selected = language == BibleLanguage.TELUGU,
                        onClick = { onLanguageChange(BibleLanguage.TELUGU) },
                        label = { Text("తెలుగు (IRV)", fontWeight = FontWeight.Bold) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChip(
                        selected = language == BibleLanguage.ENGLISH,
                        onClick = { onLanguageChange(BibleLanguage.ENGLISH) },
                        label = { Text("English (BSB)", fontWeight = FontWeight.Bold) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SettingsSheetPreview() {
    MaterialTheme {
        SettingsSheet(
            fontSizeScale = FontSizeScale.M,
            language = BibleLanguage.TELUGU,
            readerTheme = ReaderTheme.OBSIDIAN,
            readerFontFamily = ReaderFontFamily.MERRIWEATHER,
            onIncreaseFontSize = {},
            onDecreaseFontSize = {},
            onResetFontSize = {},
            onLanguageChange = {},
            onThemeChange = {},
            onFontFamilyChange = {},
            onDismiss = {}
        )
    }
}
