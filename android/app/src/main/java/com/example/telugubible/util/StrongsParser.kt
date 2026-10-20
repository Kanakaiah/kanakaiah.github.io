package com.example.telugubible.util

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight

data class ProcessedOccurrence(
    val cleanText: String,
    val highlightedWords: List<String>,
    val highlightRanges: List<IntRange>
)

object StrongsParser {
    private val regex = Regex("([^<]*)(?:<S>([0-9]+)</S>)?")
    private val supRegex = Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE)

    /**
     * Parses KJV verse text tagged with Strong's numbers (e.g. `word<S>1234</S>`) into pairs
     * of (englishText, formattedStrongsId).
     *
     * @param html Raw KJV text containing <S> tags.
     * @param isOldTestament true for Hebrew (H prefix), false for Greek (G prefix).
     */
    fun parseTaggedText(html: String, isOldTestament: Boolean): List<Pair<String, String?>> {
        val clean = supRegex.replace(html, "")
        val result = mutableListOf<Pair<String, String?>>()
        val matches = regex.findAll(clean)

        for (m in matches) {
            val english = m.groupValues[1].trim()
            val number = m.groupValues.getOrNull(2)

            if (english.isEmpty() && number.isNullOrEmpty()) continue

            val formattedId = if (!number.isNullOrEmpty()) {
                val prefix = if (isOldTestament) "H" else "G"
                "$prefix$number"
            } else null

            result.add(Pair(english, formattedId))
        }

        return result
    }

    /**
     * Normalizes a Strong's ID to unpadded uppercase (e.g. "h02584" -> "H2584").
     */
    fun normalizeStrongsRef(ref: String): String {
        val trimmed = ref.trim()
        val match = Regex("^([GHgh])0*(\\d+)$").find(trimmed) ?: return trimmed.uppercase()
        return "${match.groupValues[1].uppercase()}${match.groupValues[2]}"
    }

    /**
     * Extracts unpadded digits from a Strong's ID (e.g. "H7225" -> "7225", "G0001" -> "1").
     */
    fun strongsNumberPart(ref: String): String {
        return normalizeStrongsRef(ref).filter { it.isDigit() }
    }

    /**
     * Returns true if the Strong's reference is Hebrew / Old Testament ('H' prefix).
     */
    fun isHebrewStrongs(ref: String): Boolean {
        return normalizeStrongsRef(ref).startsWith("H")
    }

    /**
     * Cleans raw KJV occurrence HTML, removes all Strong's and formatting tags,
     * and locates character ranges corresponding to the target Strong's number.
     */
    fun cleanOccurrenceHtml(html: String, targetStrongsNumberPart: String): ProcessedOccurrence {
        var text = html

        // 0. Remove superscripts like <sup>...</sup> first (footnotes/crossrefs)
        text = text.replace(Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE), "")

        // 1. Normalize <mark><S>...</S></mark> to <S><mark>...</mark></S>
        text = text.replace(Regex("<mark>\\s*<S>(\\d+)</S>\\s*</mark>", RegexOption.IGNORE_CASE), "<S><mark>$1</mark></S>")

        // If no <mark> tag exists for target number, wrap the matching tag
        val unMarkedTag = Regex("<S>$targetStrongsNumberPart</S>", RegexOption.IGNORE_CASE)
        val markedTag = Regex("<S><mark>$targetStrongsNumberPart</mark></S>", RegexOption.IGNORE_CASE)
        if (!markedTag.containsMatchIn(text) && unMarkedTag.containsMatchIn(text)) {
            text = text.replace(unMarkedTag, "<S><mark>$targetStrongsNumberPart</mark></S>")
        }

        // 2. Tag target English word before <S><mark>
        val targetWordRegex = Regex("([a-zA-Z\\u00C0-\\u024F\\u1E00-\\u1EFF'-]+)([^a-zA-Z\\u00C0-\\u024F\\u1E00-\\u1EFF<]*?)<S><mark>\\d+</mark></S>")
        text = targetWordRegex.replace(text) { match ->
            val word = match.groupValues[1]
            val trailing = match.groupValues[2]
            "[[HL]]$word[[/HL]]$trailing"
        }

        // 3. Strip all remaining Strong's tags (<S>...</S>)
        text = text.replace(Regex("<S>.*?</S>", RegexOption.IGNORE_CASE), "")

        // 4. Remove <i> and remaining HTML tags
        text = text.replace(Regex("<i\\b[^>]*>(.*?)</i>", RegexOption.IGNORE_CASE), "$1")
        text = text.replace(Regex("<[^>]+>"), "")

        // 5. Normalize spaces before computing indices
        text = text.replace(Regex("[ \\t]+"), " ")
        text = text.replace(Regex(" \\n"), "\n").replace(Regex("\\n "), "\n").trim()

        // 6. Extract [[HL]]...[[/HL]] markers and compute clean string + character ranges
        val cleanBuilder = StringBuilder()
        val words = mutableListOf<String>()
        val ranges = mutableListOf<IntRange>()
        val hlRegex = Regex("\\[\\[HL\\]\\](.*?)\\[\\[/HL\\]\\]")
        var lastIdx = 0

        for (m in hlRegex.findAll(text)) {
            if (m.range.first > lastIdx) {
                cleanBuilder.append(text.substring(lastIdx, m.range.first))
            }
            val word = m.groupValues[1]
            val start = cleanBuilder.length
            cleanBuilder.append(word)
            val end = cleanBuilder.length - 1
            words.add(word)
            ranges.add(IntRange(start, end))
            lastIdx = m.range.last + 1
        }

        if (lastIdx < text.length) {
            cleanBuilder.append(text.substring(lastIdx))
        }

        return ProcessedOccurrence(
            cleanText = cleanBuilder.toString(),
            highlightedWords = words,
            highlightRanges = ranges
        )
    }

    /**
     * Builds an AnnotatedString from clean text with the highlighted word ranges styled.
     */
    fun buildOccurrenceAnnotatedString(
        cleanText: String,
        highlightRanges: List<IntRange>,
        highlightColor: Color,
        highlightBgColor: Color
    ): AnnotatedString {
        val builder = AnnotatedString.Builder()
        if (highlightRanges.isEmpty()) {
            builder.append(cleanText)
            return builder.toAnnotatedString()
        }

        var currentIndex = 0
        val sortedRanges = highlightRanges.sortedBy { it.first }

        for (range in sortedRanges) {
            val start = range.first.coerceIn(0, cleanText.length)
            val end = (range.last + 1).coerceIn(start, cleanText.length)

            if (start > currentIndex) {
                builder.append(cleanText.substring(currentIndex, start))
            }

            if (end > start) {
                val spanStart = builder.length
                builder.append(cleanText.substring(start, end))
                val spanEnd = builder.length

                builder.addStyle(
                    SpanStyle(
                        color = highlightColor,
                        fontWeight = FontWeight.Bold,
                        background = highlightBgColor
                    ),
                    spanStart,
                    spanEnd
                )
            }

            currentIndex = end
        }

        if (currentIndex < cleanText.length) {
            builder.append(cleanText.substring(currentIndex))
        }

        return builder.toAnnotatedString()
    }
}
