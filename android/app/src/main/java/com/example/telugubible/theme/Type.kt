package com.example.telugubible.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Interface roles share one scale. Scripture retains its saved typeface and size.
private fun interfaceType(size: Int, line: Int, weight: FontWeight = FontWeight.Normal) = TextStyle(
    fontFamily = FontFamily.Default, fontWeight = weight,
    fontSize = size.sp, lineHeight = line.sp, letterSpacing = 0.sp
)

val Typography = Typography(
    displayLarge = interfaceType(40, 48),
    displayMedium = interfaceType(36, 44),
    displaySmall = interfaceType(32, 40),
    headlineLarge = interfaceType(28, 36),
    headlineMedium = interfaceType(26, 34),
    headlineSmall = interfaceType(24, 32),
    titleLarge = interfaceType(22, 28, FontWeight.Medium),
    titleMedium = interfaceType(18, 26, FontWeight.Medium),
    titleSmall = interfaceType(16, 24, FontWeight.Medium),
    bodyLarge = interfaceType(16, 24),
    bodyMedium = interfaceType(14, 22),
    bodySmall = interfaceType(12, 18),
    labelLarge = interfaceType(14, 20, FontWeight.Medium),
    labelMedium = interfaceType(12, 18, FontWeight.Medium),
    labelSmall = interfaceType(12, 18, FontWeight.Medium)
)
