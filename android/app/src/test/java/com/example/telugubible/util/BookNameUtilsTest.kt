package com.example.telugubible.util

import com.example.telugubible.data.model.Book
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class BookNameUtilsTest {

    private val genesis = Book(
        id = 1,
        key = "GEN",
        nameEn = "Genesis",
        nameTe = "ఆదికాండము",
        nameTa = "ஆதியாகமம்",
        testament = "OT",
        section = "Law",
        chapters = 50,
        themeWord = "BEGINNING",
        keyWord = "Creation"
    )

    private val matthew = Book(
        id = 40,
        key = "MAT",
        nameEn = "Matthew",
        nameTe = "మత్తయి సువార్త",
        nameTa = "மத்தேயு",
        testament = "NT",
        section = "Gospels",
        chapters = 28,
        themeWord = "KING",
        keyWord = "Kingdom"
    )

    @Test
    fun testBookShortNameForEnglishVersions() {
        assertEquals("Gen", BookNameUtils.getBookShortName(genesis, "LSB"))
        assertEquals("Gen", BookNameUtils.getBookShortName(genesis, "NASB"))
        assertEquals("Gen", BookNameUtils.getBookShortName(genesis, "ESV"))
        assertEquals("Gen", BookNameUtils.getBookShortName(genesis, "BSB"))

        assertEquals("Matt", BookNameUtils.getBookShortName(matthew, "LSB"))
        assertEquals("Matt", BookNameUtils.getBookShortName(matthew, "NLT"))
    }

    @Test
    fun testBookShortNameForTeluguAndTamil() {
        assertEquals("ఆదికాండము", BookNameUtils.getBookShortName(genesis, "TELIRV"))
        assertEquals("மத்தேயு", BookNameUtils.getBookShortName(matthew, "TBSI"))
    }

    @Test
    fun testBookDisplayName() {
        assertEquals("Genesis", BookNameUtils.getBookDisplayName(genesis, "LSB"))
        assertEquals("Genesis", BookNameUtils.getBookDisplayName(genesis, "ESV"))
        assertEquals("ఆదికాండము", BookNameUtils.getBookDisplayName(genesis, "TELIRV"))
        assertEquals("ஆதியாகமம்", BookNameUtils.getBookDisplayName(genesis, "TBSI"))

        assertEquals("Matthew", BookNameUtils.getBookDisplayName(matthew, "LSB"))
        assertEquals("మత్తయి సువార్త", BookNameUtils.getBookDisplayName(matthew, "TELIRV"))
    }

    @Test
    fun testDivisionColors() {
        assertNotNull(BookNameUtils.getDivisionColor("Law"))
        assertNotNull(BookNameUtils.getDivisionColor("History"))
        assertNotNull(BookNameUtils.getDivisionColor("Poetry"))
        assertNotNull(BookNameUtils.getDivisionColor("Major Prophets"))
        assertNotNull(BookNameUtils.getDivisionColor("Minor Prophets"))
        assertNotNull(BookNameUtils.getDivisionColor("Gospels"))
        assertNotNull(BookNameUtils.getDivisionColor("Pauline Epistles"))
    }
}
