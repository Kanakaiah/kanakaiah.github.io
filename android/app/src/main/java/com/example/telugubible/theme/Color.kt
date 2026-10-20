package com.example.telugubible.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

data class RemoraColors(
    val background: Color,
    val cardBg: Color,
    val cardBgElevated: Color,
    val cardBorder: Color,
    val cardBorderHover: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val accent: Color,
    val accentHover: Color,
    val accentLight: Color,
    val gold: Color,
    val chipBg: Color,
    val chipBorder: Color,
    val isDark: Boolean
) {
    companion object {
        val Midnight = RemoraColors(
            background = Color(0xFF0C0A08),
            cardBg = Color(0xFF131110),
            cardBgElevated = Color(0xFF1C1917),
            cardBorder = Color(0xFF2A2521),
            cardBorderHover = Color(0xFF3A332C),
            textPrimary = Color(0xFFF3EDE2),
            textSecondary = Color(0xFFB3A891),
            textMuted = Color(0xFF7D7462),
            accent = Color(0xFFCC6F47),
            accentHover = Color(0xFFB25A37),
            accentLight = Color(0xFFE2A07E),
            gold = Color(0xFFD9A24A),
            chipBg = Color(0xFF1A1715),
            chipBorder = Color(0xFF2E2823),
            isDark = true
        )

        val Walnut = RemoraColors(
            background = Color(0xFF1A1613),
            cardBg = Color(0xFF221D18),
            cardBgElevated = Color(0xFF2C2620),
            cardBorder = Color(0xFF3A332B),
            cardBorderHover = Color(0xFF4A4237),
            textPrimary = Color(0xFFF5EFE3),
            textSecondary = Color(0xFFB8AD99),
            textMuted = Color(0xFF8A8069),
            accent = Color(0xFFCF7350),
            accentHover = Color(0xFFB25A37),
            accentLight = Color(0xFFE2A07E),
            gold = Color(0xFFD9A24A),
            chipBg = Color(0xFF26201B),
            chipBorder = Color(0xFF3D342C),
            isDark = true
        )

        val Sepia = RemoraColors(
            background = Color(0xFFF6ECD6),
            cardBg = Color(0xFFF0E3C8),
            cardBgElevated = Color(0xFFF9F0DC),
            cardBorder = Color(0xFFE3D3AE),
            cardBorderHover = Color(0xFFD3BD8C),
            textPrimary = Color(0xFF4A3A2C),
            textSecondary = Color(0xFF7D6A56),
            textMuted = Color(0xFFA08D76),
            accent = Color(0xFFA8562E),
            accentHover = Color(0xFF8A4423),
            accentLight = Color(0xFFC17A4F),
            gold = Color(0xFFA1731C),
            chipBg = Color(0xFFEADFC0),
            chipBorder = Color(0xFFDACBA4),
            isDark = false
        )

        val Paper = RemoraColors(
            background = Color(0xFFFAF6EE),
            cardBg = Color(0xFFFFFFFF),
            cardBgElevated = Color(0xFFFDFBF6),
            cardBorder = Color(0xFFE8E0D0),
            cardBorderHover = Color(0xFFD9CDB4),
            textPrimary = Color(0xFF211C14),
            textSecondary = Color(0xFF5C5346),
            textMuted = Color(0xFF948A78),
            accent = Color(0xFFB8552F),
            accentHover = Color(0xFF96431F),
            accentLight = Color(0xFFC96A44),
            gold = Color(0xFFA97A1F),
            chipBg = Color(0xFFF5F0E4),
            chipBorder = Color(0xFFE2D9C8),
            isDark = false
        )

        fun forTheme(themeName: String): RemoraColors = when (themeName.lowercase()) {
            "dark", "walnut" -> Walnut
            "sepia" -> Sepia
            "white", "paper" -> Paper
            else -> Midnight
        }
    }
}

object RemoraThemeState {
    var themeName by mutableStateOf("black")

    val colors: RemoraColors
        get() = RemoraColors.forTheme(themeName)
}

// Dynamic Theme-Aware Tokens
val RemoraBackground: Color get() = RemoraThemeState.colors.background
val RemoraCardBg: Color get() = RemoraThemeState.colors.cardBg
val RemoraCardBgElevated: Color get() = RemoraThemeState.colors.cardBgElevated
val RemoraCardBorder: Color get() = RemoraThemeState.colors.cardBorder
val RemoraCardBorderHover: Color get() = RemoraThemeState.colors.cardBorderHover

// Remora Typography Colors
val RemoraTextPrimary: Color get() = RemoraThemeState.colors.textPrimary
val RemoraTextSecondary: Color get() = RemoraThemeState.colors.textSecondary
val RemoraTextMuted: Color get() = RemoraThemeState.colors.textMuted

// Remora Brand & Accent Colors
val RemoraAccent: Color get() = RemoraThemeState.colors.accent
val RemoraAccentHover: Color get() = RemoraThemeState.colors.accentHover
val RemoraAccentLight: Color get() = RemoraThemeState.colors.accentLight
val RemoraGold: Color get() = RemoraThemeState.colors.gold

// Spaced Repetition Grading Colors (SM-2)
val GradeBlank = Color(0xFFEF4444)  // Red (Score 1)
val GradeHard = Color(0xFFF97316)   // Orange (Score 3)
val GradeGood = Color(0xFF3B82F6)   // Blue (Score 4)
val GradeEasy = Color(0xFF22C55E)   // Green (Score 5)

val RemoraGreen = Color(0xFF22C55E)
val RemoraRed = Color(0xFFEF4444)

// Pill & Chip Backgrounds
val RemoraChipBg: Color get() = RemoraThemeState.colors.chipBg
val RemoraChipBorder: Color get() = RemoraThemeState.colors.chipBorder

// Semantic Helpers
val RemoraDanger = GradeBlank
val RemoraSurface: Color get() = RemoraThemeState.colors.background
