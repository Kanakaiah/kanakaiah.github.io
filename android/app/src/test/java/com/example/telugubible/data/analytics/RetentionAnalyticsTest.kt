package com.example.telugubible.data.analytics

import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.ReviewLogEntry
import com.example.telugubible.data.model.UserMemoryVerse
import org.junit.Assert.*
import org.junit.Test

class RetentionAnalyticsTest {

    private val now = 1_700_000_000_000L
    private val oneDayMs = 86_400_000L

    @Test
    fun testFirstTryRetentionTooFewReviews() {
        val log = listOf(
            ReviewLogEntry(1, "verse", "1", score = 4, reviewDate = now - 1000, prevInterval = 2, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5, cueLevel = 0),
            ReviewLogEntry(2, "verse", "2", score = 5, reviewDate = now - 2000, prevInterval = 1, newInterval = 3, prevEfactor = 2.5, newEfactor = 2.6, cueLevel = 0),
            ReviewLogEntry(3, "verse", "3", score = 1, reviewDate = now - 3000, prevInterval = 3, newInterval = 1, prevEfactor = 2.5, newEfactor = 2.3, cueLevel = 1)
        )
        val result = RetentionAnalytics.firstTryRetention(log, windowDays = 30, now = now)
        assertEquals(3, result.attempts)
        assertEquals(2, result.recalled)
        assertNull("Rate should be null when attempts < 5 to prevent noisy reporting", result.rate)
    }

    @Test
    fun testFirstTryRetentionCalculation() {
        val entries = mutableListOf<ReviewLogEntry>()
        // 4 successful recalls
        for (i in 1..4) {
            entries.add(
                ReviewLogEntry(i.toLong(), "verse", i.toString(), score = 4, reviewDate = now - i * 1000, prevInterval = 2, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5, cueLevel = 0)
            )
        }
        // 1 failed recall
        entries.add(
            ReviewLogEntry(5, "verse", "5", score = 1, reviewDate = now - 5000, prevInterval = 5, newInterval = 1, prevEfactor = 2.5, newEfactor = 2.3, cueLevel = 1)
        )
        // 1 review with full cue (cueLevel = 4) -> should be excluded from first-try
        entries.add(
            ReviewLogEntry(6, "verse", "6", score = 5, reviewDate = now - 6000, prevInterval = 5, newInterval = 10, prevEfactor = 2.5, newEfactor = 2.6, cueLevel = 4)
        )
        // 1 first sight (prevInterval = 0) -> should be excluded
        entries.add(
            ReviewLogEntry(7, "verse", "7", score = 5, reviewDate = now - 7000, prevInterval = 0, newInterval = 1, prevEfactor = 2.5, newEfactor = 2.5, cueLevel = 0)
        )

        val result = RetentionAnalytics.firstTryRetention(entries, windowDays = 30, now = now)
        assertEquals(5, result.attempts)
        assertEquals(4, result.recalled)
        assertNotNull(result.rate)
        assertEquals(0.80, result.rate!!, 0.001)
    }

    @Test
    fun testRetentionByIntervalBuckets() {
        val entries = mutableListOf<ReviewLogEntry>()
        // 5 reviews in 1d bucket (prevInterval = 1) with 4 recalls
        for (i in 1..4) {
            entries.add(ReviewLogEntry(i.toLong(), "verse", i.toString(), score = 4, reviewDate = now - 1000, prevInterval = 1, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5))
        }
        entries.add(ReviewLogEntry(5, "verse", "5", score = 2, reviewDate = now - 1000, prevInterval = 1, newInterval = 1, prevEfactor = 2.5, newEfactor = 2.3))

        // 5 reviews in 1mo bucket (prevInterval = 20) with 3 recalls
        for (i in 6..8) {
            entries.add(ReviewLogEntry(i.toLong(), "verse", i.toString(), score = 4, reviewDate = now - 1000, prevInterval = 20, newInterval = 50, prevEfactor = 2.5, newEfactor = 2.5))
        }
        for (i in 9..10) {
            entries.add(ReviewLogEntry(i.toLong(), "verse", i.toString(), score = 1, reviewDate = now - 1000, prevInterval = 20, newInterval = 1, prevEfactor = 2.5, newEfactor = 2.3))
        }

        val curve = RetentionAnalytics.retentionByInterval(entries, windowDays = 90, now = now)
        assertEquals(6, curve.size)

        val bucket1d = curve.find { it.label == "1d" }!!
        assertEquals(5, bucket1d.attempts)
        assertEquals(4, bucket1d.recalled)
        assertEquals(0.80, bucket1d.rate!!, 0.001)

        val bucket1mo = curve.find { it.label == "1mo" }!!
        assertEquals(5, bucket1mo.attempts)
        assertEquals(3, bucket1mo.recalled)
        assertEquals(0.60, bucket1mo.rate!!, 0.001)

        val bucket3mo = curve.find { it.label == "3mo" }!!
        assertEquals(0, bucket3mo.attempts)
        assertNull(bucket3mo.rate)
    }

    @Test
    fun testCurveReadInterpretation() {
        val entries = mutableListOf<ReviewLogEntry>()
        for (i in 1..5) {
            entries.add(ReviewLogEntry(i.toLong(), "verse", i.toString(), score = 4, reviewDate = now, prevInterval = 1, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5))
        }
        for (i in 6..10) {
            entries.add(ReviewLogEntry(i.toLong(), "verse", i.toString(), score = 2, reviewDate = now, prevInterval = 20, newInterval = 1, prevEfactor = 2.5, newEfactor = 2.3))
        }

        val curve = RetentionAnalytics.retentionByInterval(entries, windowDays = 90, now = now)
        val read = RetentionAnalytics.curveRead(curve)
        assertTrue(read.contains("Below target at 1mo"))

        // Shortening trigger
        assertTrue(RetentionAnalytics.needsShortening(curve, intervalScale = 1.0))
        assertFalse(RetentionAnalytics.needsShortening(emptyList(), intervalScale = 1.0))
    }

    @Test
    fun testHonestyGapCalculation() {
        val entries = listOf(
            ReviewLogEntry(1, "verse", "1", score = 5, reviewDate = now, prevInterval = 5, newInterval = 10, prevEfactor = 2.5, newEfactor = 2.5, measuredAccuracy = 0.50), // suggested = 2, score = 5 -> gap +3
            ReviewLogEntry(2, "verse", "2", score = 4, reviewDate = now, prevInterval = 5, newInterval = 10, prevEfactor = 2.5, newEfactor = 2.5, measuredAccuracy = 0.96)  // suggested = 5, score = 4 -> gap -1
        )
        val gap = RetentionAnalytics.honestyGap(entries, windowDays = 30, now = now)
        assertNotNull(gap)
        assertEquals(2, gap!!.n)
        assertEquals(4.5, gap.meanGrade, 0.01)
        assertEquals(3.5, gap.meanSuggested, 0.01)
        assertEquals(1.0, gap.gap, 0.01)
    }

    @Test
    fun testLeechesComputation() {
        val verses = listOf(
            UserMemoryVerse(id = 1, bookId = 1, bookKey = "GEN", bookNameEn = "Genesis", bookNameTe = "ఆదికాండము", chapter = 1, verse = 1, textTe = "", textEn = "", status = "learning", repetition = 0, interval = 1, efactor = 2.1, nextDueDate = now, createdAt = now, lapses = 4, attempts = 10),
            UserMemoryVerse(id = 2, bookId = 43, bookKey = "JHN", bookNameEn = "John", bookNameTe = "యోహాను", chapter = 3, verse = 16, textTe = "", textEn = "", status = "learning", repetition = 1, interval = 2, efactor = 2.3, nextDueDate = now, createdAt = now, lapses = 1, attempts = 5)
        )
        val chapterProgress = listOf(
            ChapterProgressEntity(bookId = 19, chapter = 23, status = "learning", repetition = 0, interval = 1, efactor = 2.1, nextDueDate = now, lapses = 5, attempts = 12)
        )
        val booksMap = mapOf(
            1 to Book(id = 1, key = "GEN", nameEn = "Genesis", nameTe = "ఆదికాండము", nameTa = null, testament = "OT", section = "Law", chapters = 50),
            19 to Book(id = 19, key = "PSA", nameEn = "Psalms", nameTe = "కీర్తనలు", nameTa = null, testament = "OT", section = "Poetry", chapters = 150),
            43 to Book(id = 43, key = "JHN", nameEn = "John", nameTe = "యోహాను", nameTa = null, testament = "NT", section = "Gospels", chapters = 21)
        )

        val leeches = RetentionAnalytics.computeLeeches(verses, chapterProgress, booksMap, threshold = 3)
        assertEquals(2, leeches.size)
        assertEquals("Psalms 23", leeches[0].label)
        assertEquals(5, leeches[0].lapses)
        assertEquals("Genesis 1:1", leeches[1].label)
        assertEquals(4, leeches[1].lapses)
    }

    @Test
    fun testActiveDays() {
        val entries = listOf(
            ReviewLogEntry(1, "verse", "1", score = 4, reviewDate = now, prevInterval = 1, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5),
            ReviewLogEntry(2, "verse", "2", score = 4, reviewDate = now - 1000, prevInterval = 1, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5), // same day
            ReviewLogEntry(3, "verse", "3", score = 4, reviewDate = now - oneDayMs * 2, prevInterval = 1, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5), // 2 days ago
            ReviewLogEntry(4, "verse", "4", score = 4, reviewDate = now - oneDayMs * 100, prevInterval = 1, newInterval = 6, prevEfactor = 2.5, newEfactor = 2.5) // out of 45-day window
        )
        val count = RetentionAnalytics.activeDays(entries, windowDays = 45, now = now)
        assertEquals(2, count)
    }
}
