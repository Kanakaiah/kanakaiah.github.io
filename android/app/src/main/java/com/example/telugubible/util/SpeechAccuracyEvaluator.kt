package com.example.telugubible.util

enum class WordMatchStatus {
    MATCH,
    MISMATCH,
    UNREACHED
}

data class WordDiffItem(
    val word: String,
    val status: WordMatchStatus
)

object SpeechAccuracyEvaluator {

    /**
     * Normalizes a word by stripping non-letter/digit punctuation and lowercasing.
     * Supports both Latin and non-Latin alphabets (including Telugu Unicode characters).
     */
    fun normalize(word: String): String {
        return word.replace(Regex("[^\\p{L}\\p{M}\\p{Nd}]+"), "").lowercase()
    }

    /**
     * Calculates the word-by-word accuracy percentage (0 to 100) of spoken text
     * against target reference text, faithfully matching Remora's SpeechMode algorithm.
     */
    fun calculateAccuracy(spoken: String, target: String): Int {
        val targetTokens = target.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (targetTokens.isEmpty()) return 0
        val spokenTokens = spoken.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (spokenTokens.isEmpty()) return 0

        var correct = 0
        for (i in targetTokens.indices) {
            val spokenWord = spokenTokens.getOrNull(i)
            if (spokenWord != null && normalize(spokenWord) == normalize(targetTokens[i])) {
                correct++
            }
        }

        return ((correct.toDouble() / targetTokens.size) * 100).toInt().coerceIn(0, 100)
    }

    /**
     * Generates a diff item for each word in the target text:
     * - MATCH: Spoken token matches target token (green bold).
     * - MISMATCH: Spoken token does not match target token (red strikethrough).
     * - UNREACHED: Speaker stopped before reciting this word (muted).
     */
    fun generateWordDiff(spoken: String, target: String): List<WordDiffItem> {
        val targetTokens = target.split(Regex("\\s+")).filter { it.isNotBlank() }
        val spokenTokens = spoken.split(Regex("\\s+")).filter { it.isNotBlank() }

        return targetTokens.mapIndexed { index, targetWord ->
            val spokenWord = spokenTokens.getOrNull(index)
            val status = when {
                spokenWord == null -> WordMatchStatus.UNREACHED
                normalize(spokenWord) == normalize(targetWord) -> WordMatchStatus.MATCH
                else -> WordMatchStatus.MISMATCH
            }
            WordDiffItem(word = targetWord, status = status)
        }
    }
}
