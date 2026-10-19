package com.example.telugubible.util

import com.example.telugubible.data.db.ChapterProgressEntity

enum class MasteryLevel {
    UNTOUCHED,
    SEEN,
    LEARNING,
    SECURE
}

data class BookMasteryCounts(
    val bookId: Int,
    val total: Int,
    val untouched: Int,
    val seen: Int,
    val learning: Int,
    val secure: Int,
    val dueCount: Int,
    val securePct: Double
)

object MasteryUtils {

    fun masteryOf(progress: ChapterProgressEntity?): MasteryLevel {
        if (progress == null || progress.attempts <= 0) return MasteryLevel.UNTOUCHED
        if (progress.repetition <= 0) return MasteryLevel.SEEN
        if (progress.repetition >= 6) return MasteryLevel.SECURE
        return MasteryLevel.LEARNING
    }

    fun calculateBookMastery(
        bookId: Int,
        chapterCount: Int,
        progressList: List<ChapterProgressEntity>,
        now: Long = System.currentTimeMillis()
    ): BookMasteryCounts {
        val progressMap = progressList.associateBy { it.chapter }
        var untouched = 0
        var seen = 0
        var learning = 0
        var secure = 0
        var dueCount = 0

        for (ch in 1..chapterCount) {
            val p = progressMap[ch]
            when (masteryOf(p)) {
                MasteryLevel.UNTOUCHED -> untouched++
                MasteryLevel.SEEN -> seen++
                MasteryLevel.LEARNING -> learning++
                MasteryLevel.SECURE -> secure++
            }
            if (p != null && p.attempts > 0 && p.nextDueDate <= now) {
                dueCount++
            }
        }

        val securePct = if (chapterCount > 0) secure.toDouble() / chapterCount else 0.0

        return BookMasteryCounts(
            bookId = bookId,
            total = chapterCount,
            untouched = untouched,
            seen = seen,
            learning = learning,
            secure = secure,
            dueCount = dueCount,
            securePct = securePct
        )
    }
}
