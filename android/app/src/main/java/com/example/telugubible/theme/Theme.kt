package com.example.telugubible.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

val LocalRemoraColors = staticCompositionLocalOf { RemoraColors.Midnight }

/** One semantic palette for M3 components and the legacy tokens during migration. */
internal fun remoraColorScheme(themeName: String): ColorScheme {
    val colors = RemoraColors.forTheme(themeName)
    val base = if (colors.isDark) darkColorScheme() else lightColorScheme()
    val inverse = if (colors.isDark) RemoraColors.Paper else RemoraColors.Midnight
    return base.copy(
        primary = colors.accent,
        onPrimary = colors.onAccent,
        primaryContainer = colors.accentContainer,
        onPrimaryContainer = colors.onAccentContainer,
        inversePrimary = inverse.accent,
        secondary = colors.accent,
        onSecondary = colors.onAccent,
        secondaryContainer = colors.cardBgElevated,
        onSecondaryContainer = colors.textPrimary,
        tertiary = colors.accent,
        onTertiary = colors.onAccent,
        tertiaryContainer = colors.accentContainer,
        onTertiaryContainer = colors.onAccentContainer,
        background = colors.background,
        onBackground = colors.textPrimary,
        surface = colors.background,
        onSurface = colors.textPrimary,
        surfaceVariant = colors.cardBgElevated,
        onSurfaceVariant = colors.textSecondary,
        surfaceTint = colors.accent,
        surfaceBright = colors.cardBgElevated,
        surfaceDim = colors.background,
        surfaceContainerLowest = colors.background,
        surfaceContainerLow = colors.cardBg,
        surfaceContainer = colors.cardBg,
        surfaceContainerHigh = colors.cardBgElevated,
        surfaceContainerHighest = colors.cardBgElevated,
        inverseSurface = inverse.cardBg,
        inverseOnSurface = inverse.textPrimary,
        outline = colors.cardBorderHover,
        outlineVariant = colors.cardBorder
    )
}

@Composable
fun RemoraTheme(themeName: String = "black", content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalRemoraColors provides RemoraColors.forTheme(themeName)) {
        MaterialTheme(
            colorScheme = remoraColorScheme(themeName),
            typography = Typography,
            content = content
        )
    }
}
