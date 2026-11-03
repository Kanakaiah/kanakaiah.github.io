package com.example.telugubible.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
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
    val isDark: Boolean,
    val onAccent: Color,
    val accentContainer: Color,
    val onAccentContainer: Color
) {
    companion object {
        val Midnight = RemoraColors(
            background = Color(0xFF100D0B),
            cardBg = Color(0xFF201A16),
            cardBgElevated = Color(0xFF302620),
            cardBorder = Color(0xFF302620),
            cardBorderHover = Color(0xFF8C776A),
            textPrimary = Color(0xFFF3E7DF),
            textSecondary = Color(0xFFD0BDB0),
            textMuted = Color(0xFFD0BDB0),
            accent = Color(0xFFFFB591),
            accentHover = Color(0xFFFFB591),
            accentLight = Color(0xFFFFB591),
            gold = Color(0xFFFFB591),
            chipBg = Color(0xFF302620),
            chipBorder = Color(0xFF8C776A),
            onAccent = Color(0xFF532200),
            accentContainer = Color(0xFF73391D),
            onAccentContainer = Color(0xFFFFDBC9),
            isDark = true
        )

        val Walnut = RemoraColors(
            background = Color(0xFF211A15),
            cardBg = Color(0xFF2C231D),
            cardBgElevated = Color(0xFF3C3026),
            cardBorder = Color(0xFF3C3026),
            cardBorderHover = Color(0xFF9C8775),
            textPrimary = Color(0xFFF7EBDF),
            textSecondary = Color(0xFFD4C0AF),
            textMuted = Color(0xFFD4C0AF),
            accent = Color(0xFFEDBB8D),
            accentHover = Color(0xFFEDBB8D),
            accentLight = Color(0xFFEDBB8D),
            gold = Color(0xFFEDBB8D),
            chipBg = Color(0xFF3C3026),
            chipBorder = Color(0xFF9C8775),
            onAccent = Color(0xFF45290C),
            accentContainer = Color(0xFF614027),
            onAccentContainer = Color(0xFFFFDDBA),
            isDark = true
        )

        val Sepia = RemoraColors(
            background = Color(0xFFF9EFD9),
            cardBg = Color(0xFFF0E4C8),
            cardBgElevated = Color(0xFFE8D7B5),
            cardBorder = Color(0xFFE8D7B5),
            cardBorderHover = Color(0xFFAB9472),
            textPrimary = Color(0xFF362B1C),
            textSecondary = Color(0xFF68563E),
            textMuted = Color(0xFF68563E),
            accent = Color(0xFF80512B),
            accentHover = Color(0xFF80512B),
            accentLight = Color(0xFF80512B),
            gold = Color(0xFF80512B),
            chipBg = Color(0xFFE8D7B5),
            chipBorder = Color(0xFFAB9472),
            onAccent = Color(0xFFFFFFFF),
            accentContainer = Color(0xFFF5D9B0),
            onAccentContainer = Color(0xFF472A10),
            isDark = false
        )

        val Paper = RemoraColors(
            background = Color(0xFFFFF8F4),
            cardBg = Color(0xFFF6ECE6),
            cardBgElevated = Color(0xFFEEE1D8),
            cardBorder = Color(0xFFEEE1D8),
            cardBorderHover = Color(0xFFB9A69A),
            textPrimary = Color(0xFF251A14),
            textSecondary = Color(0xFF69564A),
            textMuted = Color(0xFF69564A),
            accent = Color(0xFF8F4827),
            accentHover = Color(0xFF8F4827),
            accentLight = Color(0xFF8F4827),
            gold = Color(0xFF8F4827),
            chipBg = Color(0xFFEEE1D8),
            chipBorder = Color(0xFFB9A69A),
            onAccent = Color(0xFFFFFFFF),
            accentContainer = Color(0xFFFFDBC9),
            onAccentContainer = Color(0xFF542309),
            isDark = false
        )

        fun forTheme(themeName: String): RemoraColors = when (themeName.lowercase().trim()) {
            "dark", "walnut", "umber" -> Walnut
            "sepia" -> Sepia
            "white", "paper" -> Paper
            else -> Midnight
        }
    }
}

// Dynamic Theme-Aware Tokens
val RemoraBackground: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.background
val RemoraCardBg: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.cardBg
val RemoraCardBgElevated: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.cardBgElevated
val RemoraCardBorder: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.cardBorder
val RemoraCardBorderHover: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.cardBorderHover

// Remora Typography Colors
val RemoraTextPrimary: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.textPrimary
val RemoraTextSecondary: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.textSecondary
val RemoraTextMuted: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.textMuted

// Remora Brand & Accent Colors
val RemoraAccent: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.accent
val RemoraAccentHover: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.accentHover
val RemoraAccentLight: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.accentLight
val RemoraGold: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.gold

// Spaced Repetition Grading Colors (SM-2)
val GradeBlank = Color(0xFFEF4444)  // Red (Score 1)
val GradeHard = Color(0xFFF97316)   // Orange (Score 3)
val GradeGood = Color(0xFF3B82F6)   // Blue (Score 4)
val GradeEasy = Color(0xFF22C55E)   // Green (Score 5)

val RemoraGreen = Color(0xFF22C55E)
val RemoraRed = Color(0xFFEF4444)

// Pill & Chip Backgrounds
val RemoraChipBg: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.chipBg
val RemoraChipBorder: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.chipBorder

// Semantic Helpers
val RemoraDanger = GradeBlank
val RemoraSurface: Color @Composable @ReadOnlyComposable get() = LocalRemoraColors.current.background
