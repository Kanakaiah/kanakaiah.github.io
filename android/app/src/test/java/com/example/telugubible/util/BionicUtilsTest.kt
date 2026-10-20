package com.example.telugubible.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BionicUtilsTest {

    @Test
    fun testSplitSentences() {
        val text = "For God so loved the world. He gave His only begotten Son! Whoever believes in Him shall not perish? Amen."
        val sentences = BionicUtils.splitSentences(text)
        assertEquals(4, sentences.size)
        assertEquals("For God so loved the world.", sentences[0])
        assertEquals("He gave His only begotten Son!", sentences[1])
        assertEquals("Whoever believes in Him shall not perish?", sentences[2])
        assertEquals("Amen.", sentences[3])
    }

    @Test
    fun testSplitSentencesEmptyOrBlank() {
        assertTrue(BionicUtils.splitSentences("").isEmpty())
        assertTrue(BionicUtils.splitSentences("   ").isEmpty())
    }

    @Test
    fun testFormatBionicPlainTextWhenDisabled() {
        val text = "In the beginning"
        val annotated = BionicUtils.formatBionic(text, isBionic = false)
        assertEquals(text, annotated.text)
        assertTrue(annotated.spanStyles.isEmpty())
    }

    @Test
    fun testFormatBionicWithBionicEnabled() {
        val text = "In the beginning"
        val annotated = BionicUtils.formatBionic(text, isBionic = true)
        assertEquals(text, annotated.text)
        // Should have bold spans for words
        assertTrue(annotated.spanStyles.isNotEmpty())
    }
}
