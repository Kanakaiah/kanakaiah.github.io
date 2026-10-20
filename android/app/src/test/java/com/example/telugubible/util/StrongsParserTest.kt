package com.example.telugubible.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StrongsParserTest {

    @Test
    fun testParseOldTestamentKjvTags() {
        val raw = "In the beginning<S>7225</S> God<S>430</S> created<S>1254</S> the heaven<S>8064</S> and the earth.<S>776</S>"
        val parsed = StrongsParser.parseTaggedText(raw, isOldTestament = true)

        assertEquals(5, parsed.size)
        assertEquals("In the beginning", parsed[0].first)
        assertEquals("H7225", parsed[0].second)

        assertEquals("God", parsed[1].first)
        assertEquals("H430", parsed[1].second)

        assertEquals("created", parsed[2].first)
        assertEquals("H1254", parsed[2].second)

        assertEquals("the heaven", parsed[3].first)
        assertEquals("H8064", parsed[3].second)

        assertEquals("and the earth.", parsed[4].first)
        assertEquals("H776", parsed[4].second)
    }

    @Test
    fun testParseNewTestamentKjvTags() {
        val raw = "In the beginning<S>746</S> was<S>2258</S> the Word<S>3056</S>"
        val parsed = StrongsParser.parseTaggedText(raw, isOldTestament = false)

        assertEquals(3, parsed.size)
        assertEquals("In the beginning", parsed[0].first)
        assertEquals("G746", parsed[0].second)

        assertEquals("was", parsed[1].first)
        assertEquals("G2258", parsed[1].second)

        assertEquals("the Word", parsed[2].first)
        assertEquals("G3056", parsed[2].second)
    }

    @Test
    fun testNormalizeStrongsRef() {
        assertEquals("H2584", StrongsParser.normalizeStrongsRef("h02584"))
        assertEquals("G1", StrongsParser.normalizeStrongsRef("G0001"))
        assertEquals("H7225", StrongsParser.normalizeStrongsRef("H7225"))
        assertEquals("G2424", StrongsParser.normalizeStrongsRef("g2424"))
    }

    @Test
    fun testStrongsNumberPartAndIsHebrew() {
        assertEquals("7225", StrongsParser.strongsNumberPart("H7225"))
        assertEquals("2584", StrongsParser.strongsNumberPart("h02584"))
        assertEquals("1", StrongsParser.strongsNumberPart("G0001"))
        assertEquals("3056", StrongsParser.strongsNumberPart("g3056"))

        assertTrue(StrongsParser.isHebrewStrongs("H7225"))
        assertTrue(StrongsParser.isHebrewStrongs("h02584"))
        assertFalse(StrongsParser.isHebrewStrongs("G3056"))
        assertFalse(StrongsParser.isHebrewStrongs("g1"))
    }

    @Test
    fun testCleanOccurrenceHtmlWithMarkTags() {
        val raw = "In the beginning<S><mark>746</mark></S> was<S>2258</S> the Word<S>3056</S>"
        val processed = StrongsParser.cleanOccurrenceHtml(raw, "746")

        assertEquals("In the beginning was the Word", processed.cleanText)
        assertEquals(listOf("beginning"), processed.highlightedWords)
        assertEquals(1, processed.highlightRanges.size)
        val range = processed.highlightRanges[0]
        assertEquals("beginning", processed.cleanText.substring(range.first, range.last + 1))
    }

    @Test
    fun testCleanOccurrenceHtmlWithoutMarkTagsFallback() {
        val raw = "In the beginning<S>7225</S> God<S>430</S> created<S>1254</S>"
        val processed = StrongsParser.cleanOccurrenceHtml(raw, "7225")

        assertEquals("In the beginning God created", processed.cleanText)
        assertEquals(listOf("beginning"), processed.highlightedWords)
        val range = processed.highlightRanges[0]
        assertEquals("beginning", processed.cleanText.substring(range.first, range.last + 1))
    }

    @Test
    fun testCleanOccurrenceHtmlWithPunctuationAndSuperScript() {
        val raw = "In the beginning,<sup>[a]</sup><S><mark>746</mark></S> was the Word"
        val processed = StrongsParser.cleanOccurrenceHtml(raw, "746")

        assertEquals("In the beginning, was the Word", processed.cleanText)
        assertEquals(listOf("beginning"), processed.highlightedWords)
        val range = processed.highlightRanges[0]
        assertEquals("beginning", processed.cleanText.substring(range.first, range.last + 1))
    }
}
