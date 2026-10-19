package com.example.telugubible.util

import org.junit.Assert.assertEquals
import org.junit.Test

class SpeechAccuracyEvaluatorTest {

    @Test
    fun testNormalizeEnglish() {
        assertEquals("beginning", SpeechAccuracyEvaluator.normalize("Beginning,"))
        assertEquals("created", SpeechAccuracyEvaluator.normalize("CREATED!"))
        assertEquals("123", SpeechAccuracyEvaluator.normalize("123."))
        assertEquals("", SpeechAccuracyEvaluator.normalize("...---"))
    }

    @Test
    fun testNormalizeTelugu() {
        assertEquals("ఆదియందు", SpeechAccuracyEvaluator.normalize("ఆదియందు,"))
        assertEquals("దేవుడు", SpeechAccuracyEvaluator.normalize("దేవుడు!"))
        assertEquals("వాక్యముండెను", SpeechAccuracyEvaluator.normalize("«వాక్యముండెను»"))
    }

    @Test
    fun testCalculateAccuracyExactEnglish() {
        val target = "In the beginning was the Word"
        val spoken = "in the beginning was the word"
        val accuracy = SpeechAccuracyEvaluator.calculateAccuracy(spoken, target)
        assertEquals(100, accuracy)
    }

    @Test
    fun testCalculateAccuracyExactTelugu() {
        val target = "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను."
        val spoken = "ఆదియందు దేవుడు భూమ్యాకాశములను సృజించెను"
        val accuracy = SpeechAccuracyEvaluator.calculateAccuracy(spoken, target)
        assertEquals(100, accuracy)
    }

    @Test
    fun testCalculateAccuracyPartial() {
        // 4 words: 2 correct, 2 wrong -> 50%
        val target = "The Lord is my shepherd"
        val spoken = "The Lord was a"
        val accuracy = SpeechAccuracyEvaluator.calculateAccuracy(spoken, target)
        assertEquals(40, accuracy) // 2 out of 5 words = 40%
    }

    @Test
    fun testCalculateAccuracyEmptyOrBlank() {
        assertEquals(0, SpeechAccuracyEvaluator.calculateAccuracy("", "In the beginning"))
        assertEquals(0, SpeechAccuracyEvaluator.calculateAccuracy("   ", "In the beginning"))
        assertEquals(0, SpeechAccuracyEvaluator.calculateAccuracy("In the beginning", ""))
    }

    @Test
    fun testGenerateWordDiff() {
        val target = "In the beginning God created"
        val spoken = "In the morning God"
        val diff = SpeechAccuracyEvaluator.generateWordDiff(spoken, target)

        assertEquals(5, diff.size)
        // Word 0: "In" -> MATCH
        assertEquals("In", diff[0].word)
        assertEquals(WordMatchStatus.MATCH, diff[0].status)

        // Word 1: "the" -> MATCH
        assertEquals("the", diff[1].word)
        assertEquals(WordMatchStatus.MATCH, diff[1].status)

        // Word 2: "beginning" vs "morning" -> MISMATCH
        assertEquals("beginning", diff[2].word)
        assertEquals(WordMatchStatus.MISMATCH, diff[2].status)

        // Word 3: "God" -> MATCH
        assertEquals("God", diff[3].word)
        assertEquals(WordMatchStatus.MATCH, diff[3].status)

        // Word 4: "created" -> UNREACHED
        assertEquals("created", diff[4].word)
        assertEquals(WordMatchStatus.UNREACHED, diff[4].status)
    }
}
