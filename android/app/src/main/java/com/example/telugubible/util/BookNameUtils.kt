package com.example.telugubible.util

import androidx.compose.ui.graphics.Color
import com.example.telugubible.data.model.Book

object BookNameUtils {

    val BOOK_SHORT: Map<String, String> = mapOf(
        "genesis" to "Gen", "exodus" to "Exod", "leviticus" to "Lev", "numbers" to "Num",
        "deuteronomy" to "Deut", "joshua" to "Josh", "judges" to "Judg", "ruth" to "Ruth",
        "1samuel" to "1 Sam", "2samuel" to "2 Sam", "1kings" to "1 Kgs", "2kings" to "2 Kgs",
        "1chronicles" to "1 Chr", "2chronicles" to "2 Chr", "ezra" to "Ezra", "nehemiah" to "Neh",
        "esther" to "Esth", "job" to "Job", "psalms" to "Ps", "proverbs" to "Prov",
        "ecclesiastes" to "Eccl", "songofsolomon" to "Song", "isaiah" to "Isa", "jeremiah" to "Jer",
        "lamentations" to "Lam", "ezekiel" to "Ezek", "daniel" to "Dan", "hosea" to "Hos",
        "joel" to "Joel", "amos" to "Amos", "obadiah" to "Obad", "jonah" to "Jonah",
        "micah" to "Mic", "nahum" to "Nah", "habakkuk" to "Hab", "zephaniah" to "Zeph",
        "haggai" to "Hag", "zechariah" to "Zech", "malachi" to "Mal",
        "matthew" to "Matt", "mark" to "Mark", "luke" to "Luke", "john" to "John",
        "acts" to "Acts", "romans" to "Rom", "1corinthians" to "1 Cor", "2corinthians" to "2 Cor",
        "galatians" to "Gal", "ephesians" to "Eph", "philippians" to "Phil", "colossians" to "Col",
        "1thessalonians" to "1 Thess", "2thessalonians" to "2 Thess", "1timothy" to "1 Tim",
        "2timothy" to "2 Tim", "titus" to "Titus", "philemon" to "Phlm", "hebrews" to "Heb",
        "james" to "Jas", "1peter" to "1 Pet", "2peter" to "2 Pet", "1john" to "1 Jn",
        "2john" to "2 Jn", "3john" to "3 Jn", "jude" to "Jude", "revelation" to "Rev"
    )

    private val SHORT_BY_KEY: Map<String, String> = mapOf(
        "GEN" to "Gen", "EXO" to "Exod", "LEV" to "Lev", "NUM" to "Num", "DEU" to "Deut",
        "JOS" to "Josh", "JDG" to "Judg", "RUT" to "Ruth", "1SA" to "1 Sam", "2SA" to "2 Sam",
        "1KI" to "1 Kgs", "2KI" to "2 Kgs", "1CH" to "1 Chr", "2CH" to "2 Chr", "EZR" to "Ezra",
        "NEH" to "Neh", "EST" to "Esth", "JOB" to "Job", "PSA" to "Ps", "PRO" to "Prov",
        "ECC" to "Eccl", "SNG" to "Song", "ISA" to "Isa", "JER" to "Jer", "LAM" to "Lam",
        "EZK" to "Ezek", "DAN" to "Dan", "HOS" to "Hos", "JOL" to "Joel", "AMO" to "Amos",
        "OBA" to "Obad", "JON" to "Jonah", "MIC" to "Mic", "NAM" to "Nah", "HAB" to "Hab",
        "ZEP" to "Zeph", "HAG" to "Hag", "ZEC" to "Zech", "MAL" to "Mal",
        "MAT" to "Matt", "MRK" to "Mark", "LUK" to "Luke", "JHN" to "John", "ACT" to "Acts",
        "ROM" to "Rom", "1CO" to "1 Cor", "2CO" to "2 Cor", "GAL" to "Gal", "EPH" to "Eph",
        "PHP" to "Phil", "COL" to "Col", "1TH" to "1 Thess", "2TH" to "2 Thess", "1TI" to "1 Tim",
        "2TI" to "2 Tim", "TIT" to "Titus", "PHM" to "Phlm", "HEB" to "Heb", "JAS" to "Jas",
        "1PE" to "1 Pet", "2PE" to "2 Pet", "1JN" to "1 Jn", "2JN" to "2 Jn", "3JN" to "3 Jn",
        "JUD" to "Jude", "REV" to "Rev"
    )

    fun getBookShortName(book: Book, version: String = "LSB"): String {
        val v = version.uppercase()
        if (v == "TELIRV") {
            // For Telugu, if short name is requested, return first word or short name
            return book.nameTe.split(" ").firstOrNull() ?: book.nameTe
        }
        if (v == "TBSI" && !book.nameTa.isNullOrBlank()) {
            return book.nameTa.split(" ").firstOrNull() ?: book.nameTa
        }
        return SHORT_BY_KEY[book.key.uppercase()]
            ?: BOOK_SHORT[book.nameEn.lowercase().replace(" ", "")]
            ?: book.nameEn
    }

    fun getBookDisplayName(book: Book, version: String = "LSB"): String {
        val v = version.uppercase()
        if (v == "TELIRV") {
            return book.nameTe
        }
        if (v == "TBSI" && !book.nameTa.isNullOrBlank()) {
            return book.nameTa
        }
        return book.nameEn
    }

    fun getDivisionColor(section: String): Color {
        return when (section.lowercase()) {
            "law", "torah", "pentateuch" -> Color(0xFF38BDF8) // Sky blue
            "history", "historical" -> Color(0xFFFBBF24) // Amber
            "poetry", "wisdom" -> Color(0xFF34D399) // Emerald
            "major prophets", "major_prophets" -> Color(0xFFA855F7) // Purple
            "minor prophets", "minor_prophets" -> Color(0xFFEC4899) // Pink
            "gospels" -> Color(0xFFF43F5E) // Rose
            "church history", "acts" -> Color(0xFFF59E0B) // Amber
            "pauline epistles", "pauline" -> Color(0xFF60A5FA) // Blue
            "general epistles", "general" -> Color(0xFF2DD4BF) // Teal
            "prophecy", "revelation", "apocalyptic" -> Color(0xFF8B5CF6) // Violet
            else -> Color(0xFFCC6F47) // Default Remora accent
        }
    }
}
