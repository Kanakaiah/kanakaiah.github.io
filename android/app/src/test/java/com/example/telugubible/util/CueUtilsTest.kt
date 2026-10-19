package com.example.telugubible.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CueUtilsTest {

    @Test
    fun testNormalizeWord() {
        assertEquals("jesus", CueUtils.normalizeWord("Jesus,"))
        assertEquals("wept", CueUtils.normalizeWord("wept."))
        assertEquals("దేవుడు", CueUtils.normalizeWord("దేవుడు!"))
        assertEquals("123", CueUtils.normalizeWord("(123);"))
    }

    @Test
    fun testCueStringFull() {
        val text = "For God so loved the world"
        assertEquals(text, CueUtils.cueString(text, CueLevel.FULL))
    }

    @Test
    fun testCueStringNone() {
        val text = "For God so loved the world"
        assertEquals("", CueUtils.cueString(text, CueLevel.NONE))
    }

    @Test
    fun testCueStringFirstLetters() {
        val text = "In the beginning, God created!"
        val cued = CueUtils.cueString(text, CueLevel.FIRST_LETTERS)
        assertEquals("I_ t__ b________, G__ c______!", cued)
    }

    @Test
    fun testCueStringSparse() {
        // Words: [0: In], [1: the], [2: beginning], [3: God], [4: created]
        // 0 and 3 are retained in full; others are masked with _
        val text = "In the beginning God created"
        val cued = CueUtils.cueString(text, CueLevel.SPARSE)
        assertEquals("In ___ _________ God _______", cued)
    }

    @Test
    fun testScoreAttemptPerfect() {
        val target = "Jesus wept."
        val typed = "Jesus wept"
        val score = CueUtils.scoreAttempt(target, typed)

        assertEquals(2, score.total)
        assertEquals(2, score.matched)
        assertEquals(100, score.accuracy)
        assertTrue(score.words.all { it.ok })
    }

    @Test
    fun testScoreAttemptPartial() {
        val target = "For God so loved the world"
        val typed = "For God really loved this world"
        val score = CueUtils.scoreAttempt(target, typed)

        assertEquals(6, score.total)
        // target words:
        // 0: For (ok)
        // 1: God (ok)
        // 2: so vs really (mismatch)
        // 3: loved (ok)
        // 4: the vs this (mismatch)
        // 5: world (ok)
        assertEquals(4, score.matched)
        assertEquals(67, score.accuracy) // 4 / 6 * 100 = 66.67 -> 67
        assertEquals(true, score.words[0].ok)
        assertEquals(true, score.words[1].ok)
        assertEquals(false, score.words[2].ok)
        assertEquals(true, score.words[3].ok)
        assertEquals(false, score.words[4].ok)
        assertEquals(true, score.words[5].ok)
    }

    @Test
    fun testScoreAttemptTelugu() {
        val target = "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను."
        val typed = "ఆదియందు దేవుడు భూమ్యాకాశములను చేసెను"
        val score = CueUtils.scoreAttempt(target, typed)

        assertEquals(4, score.total)
        assertEquals(3, score.matched)
        assertEquals(75, score.accuracy)
        assertTrue(score.words[0].ok)
        assertTrue(score.words[1].ok)
        assertTrue(score.words[2].ok)
        assertFalse(score.words[3].ok)
    }

    @Test
    fun testSuggestedScore() {
        assertEquals(5, CueUtils.suggestedScore(100))
        assertEquals(5, CueUtils.suggestedScore(98))
        assertEquals(4, CueUtils.suggestedScore(95))
        assertEquals(4, CueUtils.suggestedScore(90))
        assertEquals(3, CueUtils.suggestedScore(85))
        assertEquals(3, CueUtils.suggestedScore(70))
        assertEquals(1, CueUtils.suggestedScore(69))
        assertEquals(1, CueUtils.suggestedScore(0))
    }

    @Test
    fun testChunkText() {
        val short = "Jesus wept."
        val chunks = CueUtils.chunkText(short, 10)
        assertEquals(1, chunks.size)
        assertEquals("Jesus wept.", chunks[0])

        val multiClause = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."
        val chunksMulti = CueUtils.chunkText(multiClause, 10)
        assertTrue(chunksMulti.size >= 2)
    }
}
