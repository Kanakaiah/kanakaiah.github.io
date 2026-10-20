package com.example.telugubible.util

import com.example.telugubible.data.model.Book

data class ParsedScriptureRef(
    val bookId: Int,
    val chapter: Int,
    val verseStart: Int,
    val verseEnd: Int
)

object ScriptureRefParser {

    private val BOOK_ALIASES = mapOf(
        // Old Testament
        "gen" to 1, "genesis" to 1, "ge" to 1, "gn" to 1,
        "ex" to 2, "exod" to 2, "exodus" to 2, "exo" to 2,
        "lev" to 3, "leviticus" to 3, "le" to 3, "lv" to 3,
        "num" to 4, "numbers" to 4, "nu" to 4, "nm" to 4,
        "deut" to 5, "deuteronomy" to 5, "dt" to 5, "de" to 5,
        "josh" to 6, "joshua" to 6, "jos" to 6, "jsh" to 6,
        "judg" to 7, "judges" to 7, "jdg" to 7, "jg" to 7,
        "ruth" to 8, "rth" to 8, "ru" to 8,
        "1sam" to 9, "1samuel" to 9, "1 sam" to 9, "1 samuel" to 9, "1sa" to 9, "1s" to 9,
        "2sam" to 10, "2samuel" to 10, "2 sam" to 10, "2 samuel" to 10, "2sa" to 10, "2s" to 10,
        "1kgs" to 11, "1kings" to 11, "1 kgs" to 11, "1 kings" to 11, "1ki" to 11, "1k" to 11,
        "2kgs" to 12, "2kings" to 12, "2 kgs" to 12, "2 kings" to 12, "2ki" to 12, "2k" to 12,
        "1chr" to 13, "1chron" to 13, "1chronicles" to 13, "1 chr" to 13, "1 chron" to 13, "1 chronicles" to 13, "1ch" to 13,
        "2chr" to 14, "2chron" to 14, "2chronicles" to 14, "2 chr" to 14, "2 chron" to 14, "2 chronicles" to 14, "2ch" to 14,
        "ezra" to 15, "ezr" to 15,
        "neh" to 16, "nehemiah" to 16, "ne" to 16,
        "esth" to 17, "esther" to 17, "est" to 17, "es" to 17,
        "job" to 18, "jb" to 18,
        "ps" to 19, "psalm" to 19, "psalms" to 19, "psa" to 19, "pss" to 19,
        "prov" to 20, "proverbs" to 20, "prv" to 20, "pr" to 20, "pro" to 20,
        "eccl" to 21, "ecclesiastes" to 21, "ecc" to 21, "ec" to 21,
        "song" to 22, "songofsolomon" to 22, "song of solomon" to 22, "songs" to 22, "sos" to 22,
        "isa" to 23, "isaiah" to 23, "is" to 23,
        "jer" to 24, "jeremiah" to 24, "jr" to 24,
        "lam" to 25, "lamentations" to 25, "la" to 25,
        "ezek" to 26, "ezekiel" to 26, "eze" to 26, "ezk" to 26,
        "dan" to 27, "daniel" to 27, "da" to 27, "dn" to 27,
        "hos" to 28, "hosea" to 28, "ho" to 28,
        "joel" to 29, "joe" to 29, "jl" to 29,
        "amos" to 30, "am" to 30,
        "obad" to 31, "obadiah" to 31, "ob" to 31,
        "jonah" to 32, "jnh" to 32, "jon" to 32,
        "mic" to 33, "micah" to 33, "mc" to 33,
        "nah" to 34, "nahum" to 34, "na" to 34,
        "hab" to 35, "habakkuk" to 35, "hb" to 35,
        "zeph" to 36, "zephaniah" to 36, "zep" to 36, "zp" to 36,
        "hag" to 37, "haggai" to 37, "hg" to 37,
        "zech" to 38, "zechariah" to 38, "zec" to 38, "zc" to 38,
        "mal" to 39, "malachi" to 39, "ml" to 39,

        // New Testament
        "matt" to 40, "matthew" to 40, "mat" to 40, "mt" to 40,
        "mark" to 41, "mrk" to 41, "mar" to 41, "mk" to 41,
        "luke" to 42, "luk" to 42, "lu" to 42, "lk" to 42,
        "john" to 43, "jhn" to 43, "joh" to 43, "jn" to 43,
        "acts" to 44, "act" to 44, "ac" to 44,
        "rom" to 45, "romans" to 45, "ro" to 45, "rm" to 45,
        "1cor" to 46, "1corinthians" to 46, "1 cor" to 46, "1 corinthians" to 46, "1co" to 46,
        "2cor" to 47, "2corinthians" to 47, "2 cor" to 47, "2 corinthians" to 47, "2co" to 47,
        "gal" to 48, "galatians" to 48, "ga" to 48,
        "eph" to 49, "ephesians" to 49, "ep" to 49,
        "phil" to 50, "philippians" to 50, "php" to 50, "pp" to 50,
        "col" to 51, "colossians" to 51, "co" to 51,
        "1thess" to 52, "1thessalonians" to 52, "1 thess" to 52, "1 thessalonians" to 52, "1th" to 52,
        "2thess" to 53, "2thessalonians" to 53, "2 thess" to 53, "2 thessalonians" to 53, "2th" to 53,
        "1tim" to 54, "1timothy" to 54, "1 tim" to 54, "1 timothy" to 54, "1ti" to 54,
        "2tim" to 55, "2timothy" to 55, "2 tim" to 55, "2 timothy" to 55, "2ti" to 55,
        "tit" to 56, "titus" to 56, "ti" to 56,
        "phlm" to 57, "philemon" to 57, "phm" to 57, "pm" to 57,
        "heb" to 58, "hebrews" to 58, "he" to 58,
        "jas" to 59, "james" to 59, "jm" to 59,
        "1pet" to 60, "1peter" to 60, "1 pet" to 60, "1 peter" to 60, "1pe" to 60, "1pt" to 60,
        "2pet" to 61, "2peter" to 61, "2 pet" to 61, "2 peter" to 61, "2pe" to 61, "2pt" to 61,
        "1jn" to 62, "1john" to 62, "1 jn" to 62, "1 john" to 62, "1j" to 62,
        "2jn" to 63, "2john" to 63, "2 jn" to 63, "2 john" to 63, "2j" to 63,
        "3jn" to 64, "3john" to 64, "3 jn" to 64, "3 john" to 64, "3j" to 64,
        "jude" to 65, "jud" to 65, "jd" to 65,
        "rev" to 66, "revelation" to 66, "re" to 66, "rv" to 66
    )

    fun resolveBookId(nameOrKey: String, books: List<Book> = emptyList()): Int? {
        val trimmed = nameOrKey.trim()
        if (trimmed.isBlank()) return null

        // 1. Direct match with English aliases map
        val cleanEn = trimmed.lowercase().replace(Regex("[^a-z0-9]"), "")
        if (cleanEn.isNotBlank()) {
            val aliased = BOOK_ALIASES[cleanEn]
            if (aliased != null) return aliased

            val cleanWithSpaces = trimmed.lowercase().replace(Regex("[^a-z0-9 ]"), "").replace(Regex("\\s+"), " ")
            val aliasedSpaced = BOOK_ALIASES[cleanWithSpaces]
            if (aliasedSpaced != null) return aliasedSpaced
        }

        // 2. Match against database books (Telugu, Tamil, English name, Key)
        for (b in books) {
            val en = b.nameEn.lowercase().replace(Regex("[^a-z0-9]"), "")
            val te = b.nameTe.trim()
            val ta = b.nameTa?.trim()
            val key = b.key.lowercase()

            if ((cleanEn.isNotBlank() && (cleanEn == en || cleanEn == key)) ||
                trimmed.equals(te, ignoreCase = true) ||
                (ta != null && trimmed.equals(ta, ignoreCase = true)) ||
                (trimmed.length >= 2 && te.startsWith(trimmed))
            ) {
                return b.id
            }
        }
        return null
    }

    /**
     * Parses a query containing one or multiple scripture references (separated by semicolons ';').
     * e.g.:
     *   "John 3:16"
     *   "Gen 1:1; 2:1-3; John 3:16"
     *   "Rom 8:28,30; 1 Cor 13:4-8"
     *
     * Returns empty list if query is not recognized as a scripture reference query.
     */
    fun parseReferences(query: String, books: List<Book> = emptyList()): List<ParsedScriptureRef> {
        val q = query.replace('–', '-').replace('—', '-').trim()
        if (q.isBlank()) return emptyList()

        val parts = q.split(';').map { it.trim() }.filter { it.isNotBlank() }
        if (parts.isEmpty()) return emptyList()

        val results = mutableListOf<ParsedScriptureRef>()
        var lastBookId: Int? = null

        // Pattern matching: optional book name, chapter number, colon/dot, and verse part(s)
        // e.g. "John 3:16", "3:16", "1 Cor 13:4-8", "2:1-3"
        val refRegex = Regex("""^(?:([1-3]?\s*[A-Za-z\u0C00-\u0C7F]+(?:\s+[A-Za-z\u0C00-\u0C7F]+)*)\s+)?(\d+)[:.]\s*(\d+(?:[-,]\s*\d+)*)$""")

        for (part in parts) {
            val match = refRegex.find(part) ?: continue
            val bookPart = match.groupValues[1].takeIf { it.isNotBlank() }
            val chapter = match.groupValues[2].toIntOrNull() ?: continue
            val verseSpec = match.groupValues[3].trim()

            val bookId = if (bookPart != null) {
                resolveBookId(bookPart, books)
            } else {
                lastBookId
            } ?: continue

            lastBookId = bookId

            // Parse verses (handles comma lists like "1,3,5" and ranges like "1-5")
            val commaTokens = verseSpec.split(',').map { it.trim() }.filter { it.isNotBlank() }
            for (token in commaTokens) {
                if (token.contains('-')) {
                    val rangeParts = token.split('-').mapNotNull { it.trim().toIntOrNull() }
                    if (rangeParts.size == 2) {
                        val start = rangeParts[0].coerceAtLeast(1)
                        val end = rangeParts[1].coerceAtLeast(start)
                        results.add(ParsedScriptureRef(bookId, chapter, start, end))
                    }
                } else {
                    val vNum = token.toIntOrNull() ?: continue
                    results.add(ParsedScriptureRef(bookId, chapter, vNum, vNum))
                }
            }
        }

        return results
    }
}
