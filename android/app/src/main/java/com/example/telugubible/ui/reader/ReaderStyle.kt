package com.example.telugubible.ui.reader

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import com.example.telugubible.R

enum class ReaderTheme(
    val label: String,
    val backgroundColor: Color,
    val cardColor: Color,
    val textColor: Color,
    val secondaryTextColor: Color,
    val accentColor: Color
) {
    OBSIDIAN(
        label = "Black",
        backgroundColor = Color(0xFF0C0A08),
        cardColor = Color(0xFF131110),
        textColor = Color(0xFFF3EDE2),
        secondaryTextColor = Color(0xFFB3A891),
        accentColor = Color(0xFFD4A359)
    ),
    DARK(
        label = "Dark",
        backgroundColor = Color(0xFF14120E),
        cardColor = Color(0xFF1C1813),
        textColor = Color(0xFFF5EFE3),
        secondaryTextColor = Color(0xFFB8AD99),
        accentColor = Color(0xFFD4A359)
    ),
    SEPIA(
        label = "Sepia",
        backgroundColor = Color(0xFFF6ECD6),
        cardColor = Color(0xFFF0E3C8),
        textColor = Color(0xFF4A3A2C),
        secondaryTextColor = Color(0xFF7D6A56),
        accentColor = Color(0xFFA8562E)
    ),
    PAPER(
        label = "Light",
        backgroundColor = Color(0xFFFFFFFF),
        cardColor = Color(0xFFF8FAFC),
        textColor = Color(0xFF111827),
        secondaryTextColor = Color(0xFF4B5563),
        accentColor = Color(0xFFB8552F)
    );

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
