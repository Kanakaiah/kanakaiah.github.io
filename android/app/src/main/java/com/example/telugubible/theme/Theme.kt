package com.example.telugubible.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val RemoraColorScheme = darkColorScheme(
    primary = RemoraAccent,
    onPrimary = RemoraTextPrimary,
    primaryContainer = RemoraCardBgElevated,
    onPrimaryContainer = RemoraTextPrimary,
    secondary = RemoraGold,
    onSecondary = RemoraBackground,
    background = RemoraBackground,
    onBackground = RemoraTextPrimary,
    surface = RemoraCardBg,
    onSurface = RemoraTextPrimary,
    surfaceVariant = RemoraCardBgElevated,
    onSurfaceVariant = RemoraTextSecondary,
    outline = RemoraCardBorder,
    outlineVariant = RemoraCardBorderHover
)

@Composable
fun TeluguBibleTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = RemoraColorScheme,
        typography = Typography,
        content = content
    )
}
