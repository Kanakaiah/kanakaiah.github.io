package com.example.telugubible.data.service

import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsOccurrence
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class KjvServiceTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var kjvService: KjvService

    @Before
    fun setUp() {
        kjvService = KjvService(testDispatcher)
    }

    @Test
    fun testChapterKjvCache() = runTest(testDispatcher) {
        val seeded = mapOf(
            1 to "In the beginning<S>7225</S> God<S>430</S>",
            2 to "And the earth<S>776</S> was without form"
        )
        kjvService.seedCache(1, 1, seeded)

        val result = kjvService.getChapterKjv(1, 1)
        assertNotNull(result)
        assertEquals(2, result?.size)
        assertEquals("In the beginning<S>7225</S> God<S>430</S>", result?.get(1))
    }

    @Test
    fun testOccurrencesCacheAndLookup() = runTest(testDispatcher) {
        val occurrences = listOf(
            StrongsOccurrence(
                bookId = 1,
                bookName = "Genesis",
                chapter = 1,
                verse = 1,
                rawText = "In the beginning<S><mark>7225</mark></S> God created",
                cleanText = "In the beginning God created",
                highlightedWords = listOf("beginning"),
                highlightRanges = listOf(7..15)
            )
        )
        kjvService.seedOccurrencesCache("H7225", occurrences)

        val result = kjvService.searchOccurrences("H7225")
        assertEquals(1, result.size)
        assertEquals("Genesis", result[0].bookName)
        assertEquals(1, result[0].chapter)
        assertEquals(1, result[0].verse)
        assertEquals("beginning", result[0].highlightedWords[0])

        // Lookup with unpadded lowercase should hit the same normalized cache
        val resultLower = kjvService.searchOccurrences("h07225")
        assertEquals(1, resultLower.size)
        assertEquals("Genesis", resultLower[0].bookName)
    }
}
