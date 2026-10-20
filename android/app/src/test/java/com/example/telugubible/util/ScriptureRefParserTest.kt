package com.example.telugubible.util

import com.example.telugubible.data.model.Book
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ScriptureRefParserTest {

    private val mockBooks = listOf(
        Book(1, "GEN", "Genesis", "ఆదికాండము", null, "OT", "Law", 50),
        Book(40, "MAT", "Matthew", "మత్తయి", null, "NT", "Gospels", 28),
        Book(43, "JHN", "John", "యోహాను", null, "NT", "Gospels", 21),
        Book(45, "ROM", "Romans", "రోమీయులకు", null, "NT", "Pauline", 16),
        Book(46, "1CO", "1 Corinthians", "1 కొరింథీయులకు", null, "NT", "Pauline", 16)
    )

    @Test
    fun testSingleVerse() {
        val refs = ScriptureRefParser.parseReferences("John 3:16", mockBooks)
        assertEquals(1, refs.size)
        assertEquals(43, refs[0].bookId)
        assertEquals(3, refs[0].chapter)
        assertEquals(16, refs[0].verseStart)
        assertEquals(16, refs[0].verseEnd)
    }

    @Test
    fun testVerseRangeWithHyphenAndDashes() {
        val refs1 = ScriptureRefParser.parseReferences("1 Cor 13:4-8", mockBooks)
        assertEquals(1, refs1.size)
        assertEquals(46, refs1[0].bookId)
        assertEquals(13, refs1[0].chapter)
        assertEquals(4, refs1[0].verseStart)
        assertEquals(8, refs1[0].verseEnd)

        // En-dash and em-dash
        val refs2 = ScriptureRefParser.parseReferences("Matt 5:3–12", mockBooks)
        assertEquals(1, refs2.size)
        assertEquals(40, refs2[0].bookId)
        assertEquals(5, refs2[0].chapter)
        assertEquals(3, refs2[0].verseStart)
        assertEquals(12, refs2[0].verseEnd)
    }

    @Test
    fun testCommaSeparatedVerses() {
        val refs = ScriptureRefParser.parseReferences("Rom 8:28,30", mockBooks)
        assertEquals(2, refs.size)
        assertEquals(45, refs[0].bookId)
        assertEquals(8, refs[0].chapter)
        assertEquals(28, refs[0].verseStart)
        assertEquals(28, refs[0].verseEnd)

        assertEquals(45, refs[1].bookId)
        assertEquals(8, refs[1].chapter)
        assertEquals(30, refs[1].verseStart)
        assertEquals(30, refs[1].verseEnd)
    }

    @Test
    fun testMultiReferenceWithInheritedBook() {
        val refs = ScriptureRefParser.parseReferences("Gen 1:1; 2:1-3; John 3:16", mockBooks)
        assertEquals(3, refs.size)

        // 1. Gen 1:1
        assertEquals(1, refs[0].bookId)
        assertEquals(1, refs[0].chapter)
        assertEquals(1, refs[0].verseStart)
        assertEquals(1, refs[0].verseEnd)

        // 2. 2:1-3 (inherited Gen)
        assertEquals(1, refs[1].bookId)
        assertEquals(2, refs[1].chapter)
        assertEquals(1, refs[1].verseStart)
        assertEquals(3, refs[1].verseEnd)

        // 3. John 3:16
        assertEquals(43, refs[2].bookId)
        assertEquals(3, refs[2].chapter)
        assertEquals(16, refs[2].verseStart)
        assertEquals(16, refs[2].verseEnd)
    }

    @Test
    fun testTeluguBookName() {
        val refs = ScriptureRefParser.parseReferences("ఆదికాండము 1:1", mockBooks)
        assertEquals(1, refs.size)
        assertEquals(1, refs[0].bookId)
        assertEquals(1, refs[0].chapter)
        assertEquals(1, refs[0].verseStart)
        assertEquals(1, refs[0].verseEnd)
    }

    @Test
    fun testInvalidReference() {
        val refs = ScriptureRefParser.parseReferences("In the beginning God created", mockBooks)
        assertTrue(refs.isEmpty())

        val emptyRefs = ScriptureRefParser.parseReferences("   ", mockBooks)
        assertTrue(emptyRefs.isEmpty())
    }
}
