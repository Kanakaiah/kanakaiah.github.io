package com.example.telugubible.theme

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ThemeTest {

    @Test
    fun testAllFourThemesDefinedCorrectly() {
        // 1. Midnight (black)
        val midnight = RemoraColors.forTheme("black")
        assertEquals(Color(0xFF0C0A08), midnight.background)
        assertEquals(Color(0xFF131110), midnight.cardBg)
        assertEquals(Color(0xFFF3EDE2), midnight.textPrimary)
        assertTrue(midnight.isDark)

        // 2. Walnut (dark)
        val walnut = RemoraColors.forTheme("dark")
        assertEquals(Color(0xFF1A1613), walnut.background)
        assertEquals(Color(0xFF221D18), walnut.cardBg)
        assertEquals(Color(0xFFF5EFE3), walnut.textPrimary)
        assertTrue(walnut.isDark)

        // Also test alias "walnut"
        assertEquals(walnut, RemoraColors.forTheme("walnut"))

        // 3. Sepia (sepia)
        val sepia = RemoraColors.forTheme("sepia")
        assertEquals(Color(0xFFF6ECD6), sepia.background)
        assertEquals(Color(0xFFF0E3C8), sepia.cardBg)
        assertEquals(Color(0xFF4A3A2C), sepia.textPrimary)
        assertFalse(sepia.isDark)

        // 4. Paper (white)
        val paper = RemoraColors.forTheme("white")
        assertEquals(Color(0xFFFAF6EE), paper.background)
        assertEquals(Color(0xFFFFFFFF), paper.cardBg)
        assertEquals(Color(0xFF211C14), paper.textPrimary)
        assertFalse(paper.isDark)

        // Also test alias "paper"
        assertEquals(paper, RemoraColors.forTheme("paper"))
    }

    @Test
    fun testDynamicThemeStateSwitching() {
        // Initial state
        RemoraThemeState.themeName = "black"
        assertEquals(Color(0xFF0C0A08), RemoraBackground)
        assertEquals(Color(0xFFF3EDE2), RemoraTextPrimary)

        // Switch to Sepia
        RemoraThemeState.themeName = "sepia"
        assertEquals(Color(0xFFF6ECD6), RemoraBackground)
        assertEquals(Color(0xFF4A3A2C), RemoraTextPrimary)
        assertEquals(Color(0xFFA8562E), RemoraAccent)

        // Switch to Paper
        RemoraThemeState.themeName = "white"
        assertEquals(Color(0xFFFAF6EE), RemoraBackground)
        assertEquals(Color(0xFF211C14), RemoraTextPrimary)

        // Switch to Walnut
        RemoraThemeState.themeName = "dark"
        assertEquals(Color(0xFF1A1613), RemoraBackground)
        assertEquals(Color(0xFFF5EFE3), RemoraTextPrimary)

        // Reset to Midnight
        RemoraThemeState.themeName = "black"
        assertEquals(Color(0xFF0C0A08), RemoraBackground)
    }
}
