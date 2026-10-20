package com.example.telugubible.ui.reader

import com.example.telugubible.data.model.Verse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ParagraphBuilderTest {

    @Test
    fun testEmptyVersesReturnsEmptyParagraphs() {
        val result = ParagraphBuilder.buildParagraphs(emptyList(), emptySet())
        assertTrue(result.isEmpty())
    }

    @Test
    fun testSingleParagraphWhenNoBreaks() {
        val verses = listOf(
            Verse(1, 1, 1, 1, null, "In the beginning God created the heavens and the earth.", null),
            Verse(2, 1, 1, 2, null, "The earth was formless and void.", null)
        )
        val paragraphs = ParagraphBuilder.buildParagraphs(verses, emptySet())
        assertEquals(1, paragraphs.size)
        assertEquals(2, paragraphs[0].verses.size)
        assertEquals(1, paragraphs[0].verses[0].verse)
        assertEquals(2, paragraphs[0].verses[1].verse)
    }

    @Test
    fun testMultipleParagraphsPartitionedByParagraphBreaks() {
        val verses = listOf(
            Verse(1, 1, 1, 1, null, "Verse 1 text", null),
            Verse(2, 1, 1, 2, null, "Verse 2 text", null),
            Verse(3, 1, 1, 3, null, "Verse 3 text (new paragraph)", null),
            Verse(4, 1, 1, 4, null, "Verse 4 text", null),
            Verse(5, 1, 1, 5, null, "Verse 5 text", null),
            Verse(6, 1, 1, 6, null, "Verse 6 text (new paragraph)", null)
        )
        val breaks = setOf(3, 6)
        val paragraphs = ParagraphBuilder.buildParagraphs(verses, breaks)

        assertEquals(3, paragraphs.size)

        // Paragraph 0: verses 1, 2
        assertEquals(listOf(1, 2), paragraphs[0].verses.map { it.verse })

        // Paragraph 1: verses 3, 4, 5
        assertEquals(listOf(3, 4, 5), paragraphs[1].verses.map { it.verse })
        assertTrue(paragraphs[1].isParagraphStart)

        // Paragraph 2: verse 6
        assertEquals(listOf(6), paragraphs[2].verses.map { it.verse })
        assertTrue(paragraphs[2].isParagraphStart)
    }

    @Test
    fun testSectionHeadingExtractionFromHtmlTags() {
        val verses = listOf(
            Verse(1, 1, 1, 1, null, "<b>The Creation</b><br/>In the beginning God created the heavens and the earth.", null),
            Verse(2, 1, 1, 2, null, "The earth was formless and void.", null),
            Verse(3, 1, 1, 3, null, "<b>The First Day</b><br/>Then God said, \"Let there be light\"; and there was light.", null)
        )
        val paragraphs = ParagraphBuilder.buildParagraphs(verses, emptySet())

        assertEquals(2, paragraphs.size)
        assertEquals("The Creation", paragraphs[0].sectionHeading)
        assertEquals(listOf(1, 2), paragraphs[0].verses.map { it.verse })

        assertEquals("The First Day", paragraphs[1].sectionHeading)
        assertEquals(listOf(3), paragraphs[1].verses.map { it.verse })
    }

    @Test
    fun testPsalmTitleExtractionOnVerse1() {
        val verses = listOf(
            Verse(1, 19, 23, 1, null, "A Psalm of David. The LORD is my shepherd, I shall not want.", null),
            Verse(2, 19, 23, 2, null, "He makes me lie down in green pastures.", null)
        )
        val paragraphs = ParagraphBuilder.buildParagraphs(verses, emptySet(), isPsalms = true)

        assertEquals(1, paragraphs.size)
        assertEquals("A Psalm of David.", paragraphs[0].psalmTitle)
    }

    @Test
    fun testPreservesAllVersesWithoutDroppingAny() {
        val verses = (1..50).map { vNum ->
            Verse(vNum.toLong(), 1, 1, vNum, null, "Verse $vNum text", null)
        }
        val breaks = setOf(5, 12, 25, 40)
        val paragraphs = ParagraphBuilder.buildParagraphs(verses, breaks)

        val totalVerses = paragraphs.flatMap { it.verses }
        assertEquals(50, totalVerses.size)
        assertEquals((1..50).toList(), totalVerses.map { it.verse })
    }
}
