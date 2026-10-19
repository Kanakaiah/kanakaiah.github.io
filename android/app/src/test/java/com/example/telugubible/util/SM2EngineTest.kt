package com.example.telugubible.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class SM2EngineTest {

    @Test
    fun testProfilesFirstAndSecondIntervals() {
        // Verse
        val v0 = SM2Engine.evaluate(repetition = 0, interval = 0, score = 4, kind = ScheduleKind.VERSE, enableFuzz = false)
        assertEquals(1, v0.repetition)
        assertEquals(1, v0.interval)

        val v1 = SM2Engine.evaluate(repetition = 1, interval = 1, score = 4, kind = ScheduleKind.VERSE, enableFuzz = false)
        assertEquals(2, v1.repetition)
        assertEquals(4, v1.interval)

        // Anchor
        val a0 = SM2Engine.evaluate(repetition = 0, interval = 0, score = 4, kind = ScheduleKind.ANCHOR, enableFuzz = false)
        assertEquals(1, a0.interval)

        val a1 = SM2Engine.evaluate(repetition = 1, interval = 1, score = 4, kind = ScheduleKind.ANCHOR, enableFuzz = false)
        assertEquals(8, a1.interval)

        // Theme
        val t1 = SM2Engine.evaluate(repetition = 1, interval = 1, score = 4, kind = ScheduleKind.THEME, enableFuzz = false)
        assertEquals(10, t1.interval)
    }

    @Test
    fun testMatureLapseRecovery() {
        // A mature verse at 60 days interval lapses (score = 1)
        val lapsed = SM2Engine.evaluate(
            repetition = 5,
            interval = 60,
            efactor = 2.5,
            lapses = 0,
            preLapseInterval = 0,
            score = 1,
            kind = ScheduleKind.VERSE,
            enableFuzz = false
        )
        assertEquals(0, lapsed.repetition)
        assertEquals(1, lapsed.interval)
        assertEquals(1, lapsed.lapses)
        assertEquals(60, lapsed.preLapseInterval)

        // Day after: First success (repetition becomes 1, interval is firstInterval = 1)
        val step1 = SM2Engine.evaluate(
            repetition = lapsed.repetition,
            interval = lapsed.interval,
            efactor = lapsed.efactor,
            lapses = lapsed.lapses,
            preLapseInterval = lapsed.preLapseInterval,
            score = 4,
            kind = ScheduleKind.VERSE,
            enableFuzz = false
        )
        assertEquals(1, step1.repetition)
        assertEquals(1, step1.interval)
        assertEquals(60, step1.preLapseInterval)

        // Second success: Re-climb kicks in! (lapseRecovery = 0.20 for verse -> 60 * 0.20 = 12)
        val step2 = SM2Engine.evaluate(
            repetition = step1.repetition,
            interval = step1.interval,
            efactor = step1.efactor,
            lapses = step1.lapses,
            preLapseInterval = step1.preLapseInterval,
            score = 4,
            kind = ScheduleKind.VERSE,
            enableFuzz = false
        )
        assertEquals(2, step2.repetition)
        assertEquals(12, step2.interval)
        assertEquals(0, step2.preLapseInterval) // Consumed
    }

    @Test
    fun testPrematureLapseDoesNotTriggerRecovery() {
        // An immature item at 10 days interval lapses (matureInterval is 30 for verse)
        val lapsed = SM2Engine.evaluate(
            repetition = 2,
            interval = 10,
            efactor = 2.5,
            score = 1,
            kind = ScheduleKind.VERSE,
            enableFuzz = false
        )
        assertEquals(0, lapsed.repetition)
        assertEquals(1, lapsed.interval)
        assertEquals(0, lapsed.lapses) // Not mature, so not recorded as a mature lapse
        assertEquals(0, lapsed.preLapseInterval)

        val step1 = SM2Engine.evaluate(repetition = 0, interval = 1, score = 4, kind = ScheduleKind.VERSE, enableFuzz = false)
        assertEquals(1, step1.repetition)
        assertEquals(1, step1.interval)

        val step2 = SM2Engine.evaluate(repetition = 1, interval = 1, score = 4, kind = ScheduleKind.VERSE, enableFuzz = false)
        assertEquals(2, step2.repetition)
        assertEquals(4, step2.interval) // Normal secondInterval
    }

    @Test
    fun testAntiCohortScatter() {
        // Interval >= 4 gets ±15% scatter
        val evalList = (1..50).map {
            SM2Engine.evaluate(repetition = 2, interval = 20, score = 4, kind = ScheduleKind.VERSE, enableFuzz = true)
        }
        for (e in evalList) {
            val spread = Math.round(e.interval * 0.15).toInt()
            assertTrue(
                "Days until due ${e.daysUntilDue} should be within [${e.interval - spread}..${e.interval + spread}]",
                e.daysUntilDue in (e.interval - spread)..(e.interval + spread)
            )
        }
        val distinctDays = evalList.map { it.daysUntilDue }.distinct()
        assertTrue("Scatter should produce diverse due days", distinctDays.size > 1)
    }

    @Test
    fun testIntervalScaleDoesNotCompoundStoredInterval() {
        val eval = SM2Engine.evaluate(
            repetition = 2,
            interval = 10,
            efactor = 2.5,
            score = 4,
            kind = ScheduleKind.VERSE,
            intervalScale = 0.7,
            enableFuzz = false
        )
        // Stored interval should be based on unscaled formula: round(10 * 2.5 * 0.85) = 21
        assertEquals(21, eval.interval)
        // Due date calculation uses the scale: round(21 * 0.7) = 15
        assertEquals(15, eval.daysUntilDue)
    }

    @Test
    fun testSuggestedScore() {
        assertEquals(5, SM2Engine.suggestedScore(100.0))
        assertEquals(5, SM2Engine.suggestedScore(98.0))
        assertEquals(4, SM2Engine.suggestedScore(97.9))
        assertEquals(4, SM2Engine.suggestedScore(90.0))
        assertEquals(3, SM2Engine.suggestedScore(89.9))
        assertEquals(3, SM2Engine.suggestedScore(70.0))
        assertEquals(1, SM2Engine.suggestedScore(69.9))
        assertEquals(1, SM2Engine.suggestedScore(0.0))
    }

    @Test
    fun testFormatInterval() {
        assertEquals("today", SM2Engine.formatInterval(0))
        assertEquals("1 day", SM2Engine.formatInterval(1))
        assertEquals("5 days", SM2Engine.formatInterval(5))
        assertEquals("2 mo", SM2Engine.formatInterval(60))
        assertEquals("1 yr", SM2Engine.formatInterval(365))
    }
}
