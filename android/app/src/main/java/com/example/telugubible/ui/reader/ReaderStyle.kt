package com.example.telugubible.ui.reader

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily

enum class ReaderTheme(
    val label: String,
    val backgroundColor: Color,
    val cardColor: Color,
    val textColor: Color,
    val secondaryTextColor: Color,
    val accentColor: Color
) {
    OBSIDIAN(
        label = "Obsidian",
        backgroundColor = Color(0xFF0C0A08),
        cardColor = Color(0xFF131110),
        textColor = Color(0xFFF3EDE2),
        secondaryTextColor = Color(0xFFB3A891),
        accentColor = Color(0xFFCC6F47)
    ),
    DARK(
        label = "Umber",
        backgroundColor = Color(0xFF1A1613),
        cardColor = Color(0xFF221D18),
        textColor = Color(0xFFF5EFE3),
        secondaryTextColor = Color(0xFFB8AD99),
        accentColor = Color(0xFFCF7350)
    ),
    SEPIA(
        label = "Sepia",
        backgroundColor = Color(0xFFF6ECD6),
        cardColor = Color(0xFFF0E3C8),
        textColor = Color(0xFF4A3A2C),
        secondaryTextColor = Color(0xFF7D6A56),
        accentColor = Color(0xFFA8562E)
    ),
    PAPER(
        label = "Paper",
        backgroundColor = Color(0xFFFAF6EE),
        cardColor = Color(0xFFFFFFFF),
        textColor = Color(0xFF211C14),
        secondaryTextColor = Color(0xFF5C5346),
        accentColor = Color(0xFFB8552F)
    )
}

enum class ReaderFontFamily(val label: String, val fontFamily: FontFamily) {
    SERIF("Serif", FontFamily.Serif),
    SANS_SERIF("Sans", FontFamily.SansSerif)
}
