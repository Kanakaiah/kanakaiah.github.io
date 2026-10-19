package com.example.telugubible.util

import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

enum class AnchorVerdict {
    CORRECT,
    NEAR,
    WRONG
}

data class AnchorSibling(
    val chapter: Int,
    val word: String
)

data class AnchorJudgement(
    val verdict: AnchorVerdict,
    val score: Int,
    val confusedWith: AnchorSibling? = null
)

enum class AnchorDirection {
    N2W, // Chapter Number -> Anchor Word
    W2N, // Anchor Word -> Chapter Number
    P2W  // Plate/Theme Prompt -> Anchor Word
}

object AnchorJudge {

    fun normalizeAnchor(s: String): String =
        s.replace(Regex("[^a-zA-Z0-9\\p{L}\\p{M}]"), "").lowercase()

    /**
     * Standard Levenshtein edit distance for judging typos in anchor recall.
     */
    fun editDistance(a: String, b: String): Int {
        if (a == b) return 0
        if (a.isEmpty()) return b.length
        if (b.isEmpty()) return a.length

        var prev = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            val curr = IntArray(b.length + 1)
            curr[0] = i
            for (j in 1..b.length) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                curr[j] = min(
                    min(prev[j] + 1, curr[j - 1] + 1),
                    prev[j - 1] + cost
                )
            }
            prev = curr
        }
        return prev[b.length]
    }

    /**
     * Checks if one word is an inflected form of the other (e.g. WRESTLE / WRESTLING, STONES / STONE).
     */
    fun sameStem(a: String, b: String): Boolean {
        val shorter = if (a.length <= b.length) a else b
        val longer = if (a.length <= b.length) b else a
        val stem = max(4, shorter.length - 3)
        return shorter.length >= 4 && longer.startsWith(shorter.take(stem))
    }

    /**
     * Determines which direction to test chapter anchors based on repetition mastery:
     * - repetition < 3: N2W (Chapter Number -> Anchor Word)
     * - repetition >= 3: rotates between W2N and N2W (or P2W if art exists)
     */
    fun directionFor(repetition: Int, hasArt: Boolean = false): AnchorDirection {
        if (repetition < 3) return AnchorDirection.N2W
        if (!hasArt) return if (repetition % 2 == 1) AnchorDirection.W2N else AnchorDirection.N2W
        return if (repetition % 2 == 1) AnchorDirection.W2N else AnchorDirection.P2W
    }

    /**
     * Grades a typed anchor word against the expected anchor.
     * Captures inflections / minor typos as NEAR (score 3), and detects if the answer
     * was confused with another chapter's anchor in the same book.
     */
    fun judgeAnchor(
        typed: String,
        expected: String,
        siblings: List<AnchorSibling> = emptyList(),
        expectedChapter: Int? = null
    ): AnchorJudgement {
        val t = normalizeAnchor(typed)
        val e = normalizeAnchor(expected)

        if (t.isEmpty()) return AnchorJudgement(AnchorVerdict.WRONG, 1)
        if (t == e) return AnchorJudgement(AnchorVerdict.CORRECT, 4)

        val distance = editDistance(t, e)
        val typoForgivable = e.length >= 6 && distance <= min(2, floor(e.length / 4.0).toInt())
        if (sameStem(t, e) || typoForgivable) {
            return AnchorJudgement(AnchorVerdict.NEAR, 3)
        }

        val confused = siblings.find {
            it.chapter != expectedChapter && normalizeAnchor(it.word) == t
        }

        return AnchorJudgement(
            verdict = AnchorVerdict.WRONG,
            score = 1,
            confusedWith = confused
        )
    }

    /**
     * Grades a typed chapter number (for W2N direction).
     * Being 1 or 2 chapters off is caught as a NEAR miss (score 3).
     */
    fun judgeChapter(
        typed: String,
        expectedChapter: Int,
        siblings: List<AnchorSibling> = emptyList()
    ): AnchorJudgement {
        val n = typed.trim().toIntOrNull() ?: return AnchorJudgement(AnchorVerdict.WRONG, 1)
        if (n == expectedChapter) return AnchorJudgement(AnchorVerdict.CORRECT, 4)
        if (kotlin.math.abs(n - expectedChapter) <= 2) {
            return AnchorJudgement(AnchorVerdict.NEAR, 3)
        }

        val confused = siblings.find { it.chapter == n }
        return AnchorJudgement(
            verdict = AnchorVerdict.WRONG,
            score = 1,
            confusedWith = confused
        )
    }

    fun judgeByDirection(
        typed: String,
        direction: AnchorDirection,
        word: String,
        chapter: Int,
        siblings: List<AnchorSibling> = emptyList()
    ): AnchorJudgement {
        return when (direction) {
            AnchorDirection.W2N -> judgeChapter(typed, chapter, siblings)
            AnchorDirection.N2W, AnchorDirection.P2W -> judgeAnchor(typed, word, siblings, chapter)
        }
    }
}
