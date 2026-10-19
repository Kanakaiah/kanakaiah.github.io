package com.example.telugubible.util

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

enum class CueLevel(val levelName: String, val levelNumber: Int) {
    FULL("full", 4),
    FIRST_LETTERS("first-letters", 3),
    SPARSE("sparse", 2),
    NONE("none", 0);

    companion object {
        fun fromRepetition(repetition: Int): CueLevel {
            return when {
                repetition <= 1 -> FULL
                repetition <= 3 -> FIRST_LETTERS
                repetition <= 5 -> SPARSE
                else -> NONE
            }
        }

        fun fromNumber(num: Int): CueLevel {
            return entries.firstOrNull { it.levelNumber == num } ?: NONE
        }
    }
}

data class AttemptWord(
    val word: String,
    val ok: Boolean
)

data class AttemptScore(
    val matched: Int,
    val total: Int,
    /** 0 - 100 percentage */
    val accuracy: Int,
    val words: List<AttemptWord>
)

object CueUtils {

    const val MAX_CHUNK_WORDS = 25

    /**
     * Normalizes a word for comparison by removing all punctuation and symbols,
     * supporting both Latin (English) and Unicode (Telugu, etc.) scripts, and lowercasing.
     */
    fun normalizeWord(w: String): String {
        return w.replace(Regex("[^\\p{L}\\p{M}\\p{N}]"), "").lowercase()
    }

    /**
     * Generates a cue string for a passage based on the cue level.
     * - FULL: whole text unmodified.
     * - NONE: empty string.
     * - FIRST_LETTERS: first letter of each word preserved, remaining letters masked with '_'.
     * - SPARSE: every 3rd word preserved in full, all letters of other words masked with '_'.
     * Punctuation is preserved across all levels.
     */
    fun cueString(text: String, level: CueLevel): String {
        if (level == CueLevel.FULL) return text
        if (level == CueLevel.NONE) return ""

        val tokens = text.split(Regex("(?<=\\s)|(?=\\s)"))
        var wordIndex = -1
        val sb = StringBuilder()

        for (token in tokens) {
            if (token.isBlank()) {
                sb.append(token)
                continue
            }

            wordIndex++
            if (level == CueLevel.SPARSE && wordIndex % 3 == 0) {
                sb.append(token)
                continue
            }

            var letterSeen = false
            for (ch in token) {
                if (Character.isLetterOrDigit(ch)) {
                    if (level == CueLevel.SPARSE) {
                        sb.append('_')
                    } else { // FIRST_LETTERS
                        if (!letterSeen) {
                            sb.append(ch)
                            letterSeen = true
                        } else {
                            sb.append('_')
                        }
                    }
                } else {
                    sb.append(ch)
                }
            }
        }

        return sb.toString()
    }

    /**
     * Compares the user's typed attempt against the target passage word by word in sequence.
     * Punctuation and case are stripped to test recall accuracy objectively.
     */
    fun scoreAttempt(target: String, typed: String): AttemptScore {
        val targetWords = target.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        val typedWords = typed.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }

        if (targetWords.isEmpty()) {
            return AttemptScore(0, 0, 0, emptyList())
        }

        val words = targetWords.mapIndexed { index, word ->
            val typedWord = typedWords.getOrNull(index)
            val ok = typedWord != null &&
                    normalizeWord(typedWord).isNotEmpty() &&
                    normalizeWord(typedWord) == normalizeWord(word)
            AttemptWord(word = word, ok = ok)
        }

        val matched = words.count { it.ok }
        val accuracy = ((matched.toDouble() / targetWords.size) * 100.0).roundToInt()

        return AttemptScore(
            matched = matched,
            total = targetWords.size,
            accuracy = accuracy,
            words = words
        )
    }

    /**
     * Maps measured accuracy percentage (0-100) to an SM-2 suggested score:
     * - 98%+ -> 5 (Easy)
     * - 90%-97% -> 4 (Good)
     * - 70%-89% -> 3 (Hard)
     * - < 70% -> 1 (Blank)
     */
    fun suggestedScore(accuracy: Int): Int {
        return when {
            accuracy >= 98 -> 5
            accuracy >= 90 -> 4
            accuracy >= 70 -> 3
            else -> 1
        }
    }

    fun suggestedLabel(score: Int): String {
        return when (score) {
            5 -> "Easy"
            4 -> "Good"
            3 -> "Hard"
            else -> "Blank"
        }
    }

    /**
     * Splits a passage at phrase boundaries, never mid-clause, up to maxWords.
     */
    fun chunkText(text: String, maxWords: Int = MAX_CHUNK_WORDS): List<String> {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return emptyList()

        val wordCount = trimmed.split(Regex("\\s+")).filter { it.isNotEmpty() }.size
        if (wordCount <= maxWords) return listOf(trimmed)

        // Split on sentence/clause punctuation, keeping punctuation with the phrase
        val tokens = trimmed.split(Regex("(?<=[.?!;:,][\"'”’]?\\s+)"))
        if (tokens.isEmpty()) return listOf(trimmed)

        val chunks = mutableListOf<String>()
        var current = ""

        for (clause in tokens) {
            val c = clause.trim()
            if (c.isEmpty()) continue

            if (current.isEmpty()) {
                current = c
                continue
            }

            val currentWords = current.split(Regex("\\s+")).filter { it.isNotEmpty() }.size
            val clauseWords = c.split(Regex("\\s+")).filter { it.isNotEmpty() }.size

            if (currentWords + clauseWords <= maxWords) {
                current = "$current $c"
            } else {
                chunks.add(current)
                current = c
            }
        }
        if (current.isNotEmpty()) {
            chunks.add(current)
        }

        return chunks
    }

    fun chainSpan(totalChunks: Int, repetition: Int): Int {
        if (totalChunks <= 1) return 1
        val earned = max(1, repetition)
        return min(totalChunks, earned)
    }

    fun chainedText(chunks: List<String>, span: Int): String {
        val safeSpan = max(1, min(chunks.size, span))
        return chunks.take(safeSpan).joinToString(" ")
    }

    fun chainCue(previousChunk: String, words: Int = 6): String {
        val parts = previousChunk.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        if (parts.isEmpty()) return ""
        val tail = parts.takeLast(words).joinToString(" ")
        return if (parts.size > words) "…$tail" else tail
    }
}
