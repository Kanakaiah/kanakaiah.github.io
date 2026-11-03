package com.example.telugubible.ui.reader

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import com.example.telugubible.R

enum class ReaderTheme(val label: String, private val palette: com.example.telugubible.theme.RemoraColors) {
    OBSIDIAN("Midnight", com.example.telugubible.theme.RemoraColors.Midnight),
    DARK("Walnut", com.example.telugubible.theme.RemoraColors.Walnut),
    SEPIA("Sepia", com.example.telugubible.theme.RemoraColors.Sepia),
    PAPER("Paper", com.example.telugubible.theme.RemoraColors.Paper);

    val backgroundColor: Color get() = palette.background
    val cardColor: Color get() = palette.cardBg
    val textColor: Color get() = palette.textPrimary
    val secondaryTextColor: Color get() = palette.textSecondary
    val accentColor: Color get() = palette.accent

    fun toSettingKey(): String = when (this) {
        OBSIDIAN -> "black"
        DARK -> "dark"
        SEPIA -> "sepia"
        PAPER -> "white"
    }

    companion object {
        fun fromKey(key: String?): ReaderTheme = when (key?.lowercase()?.trim()) {
            "dark", "walnut", "umber" -> DARK
            "sepia" -> SEPIA
            "white", "paper" -> PAPER
            else -> OBSIDIAN
        }
    }
}

private val googleFontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

val InterFontFamily = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_bold, FontWeight.Bold)
)

val MerriweatherFontFamily = FontFamily(
    Font(R.font.merriweather_regular, FontWeight.Normal),
    Font(R.font.merriweather_bold, FontWeight.Bold)
)

val AtkinsonFontFamily = FontFamily(
    Font(R.font.atkinson_regular, FontWeight.Normal),
    Font(R.font.atkinson_bold, FontWeight.Bold)
)

val SystemFontFamily = FontFamily.Default

enum class ReaderFontFamily(val key: String, val label: String, val fontFamily: FontFamily) {
    INTER("inter", "Inter", InterFontFamily),
    MERRIWEATHER("merriweather", "Merriweather", MerriweatherFontFamily),
    ATKINSON("atkinson", "Atkinson", AtkinsonFontFamily),
    SYSTEM("system", "System", SystemFontFamily);

    companion object {
        fun fromKey(key: String?): ReaderFontFamily {
            return when (key?.lowercase()?.trim()) {
                "system", "default" -> SYSTEM
                "serif", "merriweather" -> MERRIWEATHER
                "hyper", "atkinson", "hyperlegible" -> ATKINSON
                "inter", "sans", "figtree", "roboto", "publicsans", "opensans" -> INTER
                else -> INTER
            }
        }
    }
}

enum class LineSpacing(val key: String, val label: String, val multiplier: Float) {
    TIGHT("tight", "Tight", 1.30f),
    NORMAL("normal", "Normal", 1.65f),
    ROOMY("roomy", "Roomy", 2.05f);

    companion object {
        fun fromKey(key: String?): LineSpacing {
            return when (key?.lowercase()?.trim()) {
                "tight" -> TIGHT
                "roomy" -> ROOMY
                else -> NORMAL
            }
        }
    }
}

enum class BionicIntensity(val key: String, val label: String, val ratio: Float) {
    LIGHT("light", "Light", 0.35f),
    MEDIUM("medium", "Medium", 0.48f),
    STRONG("strong", "Strong", 0.62f);

    companion object {
        fun fromKey(key: String?): BionicIntensity {
            return when (key?.lowercase()?.trim()) {
                "light" -> LIGHT
                "strong" -> STRONG
                else -> MEDIUM
            }
        }
    }
}
