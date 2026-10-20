package com.example.telugubible.util

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import kotlin.math.ceil

object BionicUtils {

    /**
     * Splits string into tokens and bolds the first half (ceil(len / 2))
     * of each word if [isBionic] is enabled.
     */
    fun formatBionic(text: String, isBionic: Boolean): AnnotatedString {
        val cleanText = text.replace(Regex("<[^>]+>"), "").replace("&nbsp;", " ").trim()
        if (!isBionic || cleanText.isBlank()) {
            return AnnotatedString(cleanText)
        }
        return buildAnnotatedString {
            val wordRegex = Regex("""(\b[\p{L}\p{N}']+\b)""")
            var lastIndex = 0
            for (match in wordRegex.findAll(cleanText)) {
                val range = match.range
                if (range.first > lastIndex) {
                    append(cleanText.substring(lastIndex, range.first))
                }
                val word = match.value
                val boldLen = ceil(word.length / 2.0).toInt().coerceAtLeast(1)
                withStyle(SpanStyle(fontWeight = FontWeight.ExtraBold)) {
                    append(word.substring(0, boldLen))
                }
                if (boldLen < word.length) {
                    append(word.substring(boldLen))
                }
                lastIndex = range.last + 1
            }
            if (lastIndex < cleanText.length) {
                append(cleanText.substring(lastIndex))
            }
        }
    }

    /**
     * Splits verse text into sentence phrases for Recall Masking.
     */
    fun splitSentences(text: String): List<String> {
        val tokens = text.split(Regex("""(?<=[.?!;:,]["']?\s+)"""))
        val result = tokens.map { it.trim() }.filter { it.isNotBlank() }
        return if (result.isEmpty() && text.isNotBlank()) listOf(text.trim()) else result
    }
}
