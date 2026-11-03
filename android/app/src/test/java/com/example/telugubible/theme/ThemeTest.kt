package com.example.telugubible.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import org.junit.Assert.*
import org.junit.Test

class ThemeTest {
    @Test fun savedPaletteKeysAndAliasesRemainCompatible() {
        assertEquals(RemoraColors.Midnight, RemoraColors.forTheme("black"))
        assertEquals(RemoraColors.Walnut, RemoraColors.forTheme("dark"))
        assertEquals(RemoraColors.Walnut, RemoraColors.forTheme(" UMBER "))
        assertEquals(RemoraColors.Walnut, RemoraColors.forTheme("walnut"))
        assertEquals(RemoraColors.Paper, RemoraColors.forTheme("white"))
        assertEquals(RemoraColors.Paper, RemoraColors.forTheme("paper"))
        assertEquals(RemoraColors.Sepia, RemoraColors.forTheme("sepia"))
        assertEquals(RemoraColors.Midnight, RemoraColors.forTheme("unknown"))
    }
    @Test fun normalTextRolePairsMeetContrastAcrossAllPalettes() {
        listOf("black", "dark", "sepia", "white").forEach { theme ->
            val c = remoraColorScheme(theme)
            val pairs = listOf(
                c.primary to c.onPrimary,
                c.primaryContainer to c.onPrimaryContainer,
                c.secondary to c.onSecondary,
                c.secondaryContainer to c.onSecondaryContainer,
                c.tertiaryContainer to c.onTertiaryContainer,
                c.background to c.onBackground,
                c.surface to c.onSurface,
                c.surfaceContainer to c.onSurfaceVariant,
                c.surfaceContainerHighest to c.onSurfaceVariant,
                c.surfaceContainerHigh to c.onSurface,
                c.inverseSurface to c.inverseOnSurface,
                c.surface to c.primary,
                c.error to c.onError,
                c.errorContainer to c.onErrorContainer
            )
            pairs.forEachIndexed { index, (background, foreground) ->
                val ratio = contrast(background, foreground)
                assertTrue("$theme pair $index has contrast $ratio", ratio >= 4.5f)
            }
        }
    }
    private fun contrast(a: Color, b: Color): Float {
        val luminances = listOf(a.luminance(), b.luminance())
        return (luminances.max() + 0.05f) / (luminances.min() + 0.05f)
    }
}
