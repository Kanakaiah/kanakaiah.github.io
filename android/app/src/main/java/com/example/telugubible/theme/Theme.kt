package com.example.telugubible.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

val LocalRemoraColors = staticCompositionLocalOf { RemoraColors.Midnight }

@Composable
fun RemoraTheme(
    themeName: String = RemoraThemeState.themeName,
    content: @Composable () -> Unit
) {
    if (RemoraThemeState.themeName != themeName) {
        RemoraThemeState.themeName = themeName
    }

    val colors = RemoraColors.forTheme(themeName)

    val colorScheme = if (colors.isDark) {
        darkColorScheme(
            primary = colors.accent,
            onPrimary = colors.textPrimary,
            primaryContainer = colors.cardBgElevated,
            onPrimaryContainer = colors.textPrimary,
            secondary = colors.gold,
            onSecondary = colors.background,
            background = colors.background,
            onBackground = colors.textPrimary,
            surface = colors.cardBg,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.cardBgElevated,
            onSurfaceVariant = colors.textSecondary,
            outline = colors.cardBorder,
            outlineVariant = colors.cardBorderHover
        )
    } else {
        lightColorScheme(
            primary = colors.accent,
            onPrimary = Color.White,
            primaryContainer = colors.cardBgElevated,
            onPrimaryContainer = colors.textPrimary,
            secondary = colors.gold,
            onSecondary = Color.White,
            background = colors.background,
            onBackground = colors.textPrimary,
            surface = colors.cardBg,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.cardBgElevated,
            onSurfaceVariant = colors.textSecondary,
            outline = colors.cardBorder,
            outlineVariant = colors.cardBorderHover
        )
    }

    CompositionLocalProvider(LocalRemoraColors provides colors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
