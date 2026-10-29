package com.example.telugubible.data.model

data class AppSettings(
    val theme: String = "black", // "black" (Midnight), "dark" (Walnut), "sepia" (Sepia), "white" (Paper)
    val fontSize: Float = 1.0f,   // 0.85f (Small), 1.0f (Normal), 1.15f (Large), 1.3f (Extra Large)
    val fontFamily: String = "serif", // "sans", "serif"
    val ttsEnabled: Boolean = true,
    val recallMasking: Boolean = false,
    val bionicReading: Boolean = false,
    val bibleVersion: String = "LSB", // "LSB", "NASB95", "ESV", "BSB", "TELIRV", etc.
    val anchorReveal: String = "tap",  // "tap", "always", "never"
    val dailyChapterTarget: Int = 3,
    val streakIncludesChapters: Boolean = true,
    val showSectionHeadings: Boolean = true,
    val showVerseNumbers: Boolean = true,
    val showParagraphMarks: Boolean = true,
    val showCrossRefMarkers: Boolean = true,
    val intervalScale: Double = 1.0,
    val lineSpacing: String = "normal", // "tight", "normal", "roomy"
    val bionicIntensity: String = "medium" // "light", "medium", "strong"
)
