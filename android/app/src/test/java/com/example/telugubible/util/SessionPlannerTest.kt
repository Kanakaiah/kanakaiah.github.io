package com.example.telugubible.util

import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.db.ThemeProgressEntity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.UserMemoryVerse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionPlannerTest {

    private val now = 100_000_000L

    private val testBook = Book(
        id = 1,
        key = "GEN",
        nameEn = "Genesis",
        nameTe = "ఆదికాండము",
        nameTa = null,
        testament = "OT",
        section = "Law",
        chapters = 50,
        themeWord = "GARDEN",
        keyWord = "ORIGINS",
        subtitle = "Book of Beginnings"
    )

    private val testBook2 = Book(
        id = 2,
        key = "EXO",
        nameEn = "Exodus",
        nameTe = "నిర్గమకాండము",
        nameTa = null,
        testament = "OT",
        section = "Law",
        chapters = 40,
        themeWord = "PASSOVER",
        keyWord = "DELIVERANCE",
        subtitle = "Book of Redemption"
    )

    private val booksMap = mapOf(1 to testBook, 2 to testBook2)

    private val genAnchors = (1..50).map { ch ->
        ChapterAnchor(bookId = 1, chapter = ch, word = "WORD$ch", scene = "Scene $ch")
    }

    private val anchorsByBook = mapOf(1 to genAnchors)

    @Test
    fun testSessionCapEnforcement() {
        // Create 35 due verses
        val verses = (1..35).map { i ->
            UserMemoryVerse(
                id = i.toLong(),
                bookId = 1,
                bookKey = "GEN",
                chapter = 1,
                verse = i,
                bookNameEn = "Genesis",
                bookNameTe = "ఆదికాండము",
                textEn = "Verse $i",
                textTe = "వచనం $i",
                status = "learning",
                repetition = 1,
                interval = 1,
                efactor = 2.5,
                nextDueDate = now - (i * 1000L), // progressively older
                createdAt = 0L
            )
        }

        val plan = SessionPlanner.buildSession(
            allVerses = verses,
            allChapterProgress = emptyMap(),
            allThemeProgress = emptyMap(),
            booksMap = booksMap,
            anchorsByBook = anchorsByBook,
            options = SessionOptions(cap = 20, newChapters = 0, now = now, shuffle = { it })
        )

        assertEquals(20, plan.items.size)
        assertEquals(15, plan.heldBack)
        assertEquals(15, plan.heldBackAll)
        // Most overdue should be first (i = 35 was oldest)
        val first = plan.items[0] as SessionItem.Verse
        assertEquals(35L, first.verseId)
    }

    @Test
    fun testReservedShareForNewChaptersAndAtomicPairs() {
        val plan = SessionPlanner.buildSession(
            allVerses = emptyList(),
            allChapterProgress = emptyMap(),
            allThemeProgress = emptyMap(),
            booksMap = booksMap,
            anchorsByBook = anchorsByBook,
            options = SessionOptions(cap = 20, newChapters = 2, now = now, shuffle = { it })
        )

        // 2 new chapters -> 4 items ([Introduce ch1, Anchor ch1], [Introduce ch2, Anchor ch2])
        assertEquals(4, plan.items.size)
        assertTrue(plan.items[0] is SessionItem.Introduce)
        assertEquals(1, (plan.items[0] as SessionItem.Introduce).chapter)
        assertTrue(plan.items[1] is SessionItem.Anchor)
        assertEquals(1, (plan.items[1] as SessionItem.Anchor).chapter)

        assertTrue(plan.items[2] is SessionItem.Introduce)
        assertEquals(2, (plan.items[2] as SessionItem.Introduce).chapter)
        assertTrue(plan.items[3] is SessionItem.Anchor)
        assertEquals(2, (plan.items[3] as SessionItem.Anchor).chapter)
    }

    @Test
    fun testWarmUpPlacement() {
        // 5 due verses
        val verses = (1..5).map { i ->
            UserMemoryVerse(
                id = i.toLong(),
                bookId = 1,
                bookKey = "GEN",
                chapter = 1,
                verse = i,
                bookNameEn = "Genesis",
                bookNameTe = "ఆదికాండము",
                textEn = "Verse $i",
                textTe = "వచనం $i",
                status = "learning",
                repetition = 1,
                interval = 1,
                efactor = 2.5,
                nextDueDate = now - 5000L,
                createdAt = 0L
            )
        }

        val plan = SessionPlanner.buildSession(
            allVerses = verses,
            allChapterProgress = emptyMap(),
            allThemeProgress = emptyMap(),
            booksMap = booksMap,
            anchorsByBook = anchorsByBook,
            options = SessionOptions(cap = 20, newChapters = 1, now = now, shuffle = { it })
        )

        // Total items: 5 reviews + 2 new (1 Introduce + 1 Anchor) = 7 items
        // Ordering: 3 warm-up reviews -> 2 new items -> remaining 2 reviews
        assertEquals(7, plan.items.size)
        assertTrue(plan.items[0] is SessionItem.Verse)
        assertTrue(plan.items[1] is SessionItem.Verse)
        assertTrue(plan.items[2] is SessionItem.Verse)
        assertTrue(plan.items[3] is SessionItem.Introduce)
        assertTrue(plan.items[4] is SessionItem.Anchor)
        assertTrue(plan.items[5] is SessionItem.Verse)
        assertTrue(plan.items[6] is SessionItem.Verse)
    }

    @Test
    fun testMixedInterleavingOfVersesAnchorsAndThemes() {
        val verses = listOf(
            UserMemoryVerse(
                id = 101L, bookId = 1, bookKey = "GEN", chapter = 1, verse = 1, bookNameEn = "Genesis", bookNameTe = "ఆది",
                textEn = "Gen 1:1", textTe = "ఆది 1:1", status = "learning", repetition = 1, interval = 1,
                efactor = 2.5, nextDueDate = now - 10000L, createdAt = 0L
            )
        )

        val chapterProgress = mapOf(
            "1:1" to ChapterProgressEntity(
                bookId = 1, chapter = 1, status = "review", repetition = 2, interval = 6, efactor = 2.5,
                nextDueDate = now - 8000L, attempts = 2
            )
        )

        val themeProgress = mapOf(
            1 to ThemeProgressEntity(
                bookId = 1, status = "review", repetition = 3, interval = 15, efactor = 2.5,
                nextDueDate = now - 6000L, attempts = 3
            )
        )

        val plan = SessionPlanner.buildSession(
            allVerses = verses,
            allChapterProgress = chapterProgress,
            allThemeProgress = themeProgress,
            booksMap = booksMap,
            anchorsByBook = anchorsByBook,
            options = SessionOptions(cap = 20, newChapters = 0, now = now, shuffle = { it })
        )

        assertEquals(3, plan.items.size)
        assertTrue(plan.items[0] is SessionItem.Verse)
        assertTrue(plan.items[1] is SessionItem.Anchor)
        assertTrue(plan.items[2] is SessionItem.Theme)
    }
}
