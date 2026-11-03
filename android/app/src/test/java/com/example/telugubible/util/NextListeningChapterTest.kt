package com.example.telugubible.util

import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.ReadingPosition
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NextListeningChapterTest {
    private val books = listOf(
        Book(2, "exo", "Exodus", "", null, "OT", "", 40),
        Book(1, "gen", "Genesis", "", null, "OT", "", 50),
        Book(66, "rev", "Revelation", "", null, "NT", "", 22)
    )

    @Test fun advancesChaptersAndBooksAndStopsAtTheEnd() {
        assertEquals(ReadingPosition(1, 2), nextListeningChapter(books, 1, 1))
        assertEquals(ReadingPosition(2, 1), nextListeningChapter(books, 1, 50))
        assertNull(nextListeningChapter(books, 66, 22))
        assertNull(nextListeningChapter(books, 1, 51))
        assertNull(nextListeningChapter(books, 3, 1))
    }
}
