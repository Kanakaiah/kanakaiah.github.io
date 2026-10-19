package com.example.telugubible.data.commentary

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CommentaryDataTest {

    @Test
    fun testAllSixtySixBooksMapToValidSeries() {
        for (bookId in 1..66) {
            val series = CommentaryData.getSeriesForBook(bookId)
            assertNotNull("Book ID $bookId should map to a valid series", series)
            assertTrue("Series ID should not be blank for book $bookId", series!!.id.isNotBlank())
            assertTrue("Series title should not be blank for book $bookId", series.title.isNotBlank())
            assertTrue("Series must contain sections for book $bookId", series.sections.isNotEmpty())
            assertTrue("Series bookIds must contain book $bookId", series.bookIds.contains(bookId))
        }
    }

    @Test
    fun testCanonicalDivisionMappings() {
        assertEquals("pentateuch-commentaries", CommentaryData.getSeriesForBook(1)?.id) // Genesis
        assertEquals("pentateuch-commentaries", CommentaryData.getSeriesForBook(5)?.id) // Deuteronomy
        assertEquals("historical-commentaries", CommentaryData.getSeriesForBook(6)?.id) // Joshua
        assertEquals("historical-commentaries", CommentaryData.getSeriesForBook(17)?.id) // Esther
        assertEquals("wisdom-commentaries", CommentaryData.getSeriesForBook(18)?.id) // Job
        assertEquals("wisdom-commentaries", CommentaryData.getSeriesForBook(19)?.id) // Psalms
        assertEquals("major-prophets-commentaries", CommentaryData.getSeriesForBook(23)?.id) // Isaiah
        assertEquals("major-prophets-commentaries", CommentaryData.getSeriesForBook(27)?.id) // Daniel
        assertEquals("minor-prophets-commentaries", CommentaryData.getSeriesForBook(28)?.id) // Hosea
        assertEquals("minor-prophets-commentaries", CommentaryData.getSeriesForBook(39)?.id) // Malachi
        assertEquals("gospels-commentaries", CommentaryData.getSeriesForBook(40)?.id) // Matthew
        assertEquals("gospels-commentaries", CommentaryData.getSeriesForBook(43)?.id) // John
        assertEquals("acts-commentaries", CommentaryData.getSeriesForBook(44)?.id) // Acts
        assertEquals("pauline-commentaries", CommentaryData.getSeriesForBook(45)?.id) // Romans
        assertEquals("pauline-commentaries", CommentaryData.getSeriesForBook(57)?.id) // Philemon
        assertEquals("general-epistles-commentaries", CommentaryData.getSeriesForBook(58)?.id) // Hebrews
        assertEquals("general-epistles-commentaries", CommentaryData.getSeriesForBook(65)?.id) // Jude
        assertEquals("revelation-commentaries", CommentaryData.getSeriesForBook(66)?.id) // Revelation
    }

    @Test
    fun testAllTenSeriesArePresentAndWellFormed() {
        assertEquals(10, CommentaryData.ALL_SERIES.size)

        val expectedIds = setOf(
            "pentateuch-commentaries",
            "historical-commentaries",
            "wisdom-commentaries",
            "major-prophets-commentaries",
            "minor-prophets-commentaries",
            "gospels-commentaries",
            "acts-commentaries",
            "pauline-commentaries",
            "general-epistles-commentaries",
            "revelation-commentaries"
        )
        val actualIds = CommentaryData.ALL_SERIES.map { it.id }.toSet()
        assertEquals(expectedIds, actualIds)

        CommentaryData.ALL_SERIES.forEach { series ->
            assertTrue("Series ${series.id} must have non-empty title", series.title.isNotBlank())
            assertTrue("Series ${series.id} must have non-empty icon", series.icon.isNotBlank())
            assertTrue("Series ${series.id} must have sections", series.sections.isNotEmpty())
            series.sections.forEach { section ->
                assertTrue("Section in ${series.id} must have heading", section.heading.isNotBlank())
                section.entries.forEach { entry ->
                    assertTrue("Entry person must not be blank in ${section.heading}", entry.person.isNotBlank())
                    assertTrue("Entry quote must not be blank in ${section.heading}", entry.quote.isNotBlank())
                }
            }
        }
    }

    @Test
    fun testSectionFilteringForSpecificBooks() {
        val genesisSections = CommentaryData.getSectionsForBook(1, "Genesis")
        assertTrue("Genesis sections should not be empty", genesisSections.isNotEmpty())
        assertTrue(
            "Genesis sections should mention Genesis or Pentateuch",
            genesisSections.any { it.heading.contains("Genesis", ignoreCase = true) || it.heading.contains("Pentateuch", ignoreCase = true) }
        )

        val romansSections = CommentaryData.getSectionsForBook(45, "Romans")
        assertTrue("Romans sections should not be empty", romansSections.isNotEmpty())
        assertTrue(
            "Romans sections should mention Romans",
            romansSections.any { it.heading.contains("Romans", ignoreCase = true) }
        )

        val revelationSections = CommentaryData.getSectionsForBook(66, "Revelation")
        assertTrue("Revelation sections should not be empty", revelationSections.isNotEmpty())
        assertTrue(
            "Revelation sections should mention Revelation",
            revelationSections.any { it.heading.contains("Revelation", ignoreCase = true) }
        )
    }

    @Test
    fun testPreachersDataErasAndEntries() {
        val eras = PreachersData.ERAS
        assertEquals("Preachers directory should have 6 historical eras", 6, eras.size)

        eras.forEach { era ->
            assertTrue("Era heading must not be blank", era.heading.isNotBlank())
            assertTrue("Era description must not be blank", era.description.isNotBlank())
            assertTrue("Era ${era.heading} must have entries", era.entries.isNotEmpty())

            era.entries.forEach { preacher ->
                assertTrue("Preacher person must not be blank in ${era.heading}", preacher.person.isNotBlank())
                assertTrue("Preacher dates/lifespan must not be blank in ${era.heading}", preacher.rank.isNotBlank())
                assertTrue("Preacher quote must not be blank in ${era.heading}", preacher.quote.isNotBlank())
            }
        }

        // Check specific key figures exist across history
        val allPersons = eras.flatMap { it.entries }.map { it.person }
        assertTrue("Athanasius should be in preachers directory", allPersons.any { it.contains("Athanasius") })
        assertTrue("Augustine should be in preachers directory", allPersons.any { it.contains("Augustine") })
        assertTrue("John Calvin should be in preachers directory", allPersons.any { it.contains("John Calvin") })
        assertTrue("Martin Luther should be in preachers directory", allPersons.any { it.contains("Martin Luther") })
        assertTrue("Spurgeon should be in preachers directory", allPersons.any { it.contains("Spurgeon") })
        assertTrue("Billy Graham should be in preachers directory", allPersons.any { it.contains("Billy Graham") })
        assertTrue("John Piper should be in preachers directory", allPersons.any { it.contains("John Piper") })
    }
}
