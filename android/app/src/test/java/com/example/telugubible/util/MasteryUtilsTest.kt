package com.example.telugubible.util

import com.example.telugubible.data.db.ChapterProgressEntity
import org.junit.Assert.assertEquals
import org.junit.Test

class MasteryUtilsTest {

    @Test
    fun testMasteryOf() {
        assertEquals(MasteryLevel.UNTOUCHED, MasteryUtils.masteryOf(null))

        val untouched = ChapterProgressEntity(
            bookId = 1, chapter = 1, status = "learning", repetition = 0,
            interval = 0, efactor = 2.5, nextDueDate = 0L, attempts = 0
        )
        assertEquals(MasteryLevel.UNTOUCHED, MasteryUtils.masteryOf(untouched))

        val seen = untouched.copy(attempts = 1, repetition = 0)
        assertEquals(MasteryLevel.SEEN, MasteryUtils.masteryOf(seen))

        val learning = untouched.copy(attempts = 2, repetition = 3)
        assertEquals(MasteryLevel.LEARNING, MasteryUtils.masteryOf(learning))

        val secure = untouched.copy(attempts = 7, repetition = 6)
        assertEquals(MasteryLevel.SECURE, MasteryUtils.masteryOf(secure))
    }

    @Test
    fun testCalculateBookMastery() {
        val now = 1000000L
        val progress = listOf(
            ChapterProgressEntity(bookId = 1, chapter = 1, status = "mastered", repetition = 6, interval = 30, efactor = 2.5, nextDueDate = now + 50000, attempts = 7),
            ChapterProgressEntity(bookId = 1, chapter = 2, status = "learning", repetition = 2, interval = 6, efactor = 2.5, nextDueDate = now - 1000, attempts = 3),
            ChapterProgressEntity(bookId = 1, chapter = 3, status = "learning", repetition = 0, interval = 1, efactor = 2.5, nextDueDate = now - 500, attempts = 1)
        )

        // 5 chapters total
        val mastery = MasteryUtils.calculateBookMastery(bookId = 1, chapterCount = 5, progressList = progress, now = now)
        assertEquals(1, mastery.bookId)
        assertEquals(5, mastery.total)
        assertEquals(2, mastery.untouched) // chapters 4 and 5
        assertEquals(1, mastery.seen) // chapter 3
        assertEquals(1, mastery.learning) // chapter 2
        assertEquals(1, mastery.secure) // chapter 1
        assertEquals(2, mastery.dueCount) // chapters 2 and 3 are <= now
        assertEquals(0.2, mastery.securePct, 0.001) // 1 / 5 = 0.2
    }
}
