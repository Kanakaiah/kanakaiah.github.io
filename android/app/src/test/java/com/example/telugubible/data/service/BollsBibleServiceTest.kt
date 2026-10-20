package com.example.telugubible.data.service

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class BollsBibleServiceTest {

    private val service = BollsBibleService()

    @Test
    fun testParseVersesJson() {
        val sampleJson = """
            [
                {
                    "pk": 1001001,
                    "verse": 1,
                    "text": "<b>The Creation</b><br/>In the beginning God created the heavens and the earth."
                },
                {
                    "pk": 1001002,
                    "verse": 2,
                    "text": "The earth was formless and void, and darkness was over the surface of the deep &amp; God said &quot;Let there be light&quot;."
                }
            ]
        """.trimIndent()

        val verses = service.parseVersesJson(sampleJson, bookId = 1, chapter = 1)
        assertEquals(2, verses.size)

        // Verse 1: HTML heading stripped, text preserved
        val v1 = verses[0]
        assertEquals(1, v1.bookId)
        assertEquals(1, v1.chapter)
        assertEquals(1, v1.verse)
        assertEquals("In the beginning God created the heavens and the earth.", v1.textEn)

        // Verse 2: HTML entities decoded
        val v2 = verses[1]
        assertEquals(2, v2.verse)
        assertEquals("The earth was formless and void, and darkness was over the surface of the deep & God said \"Let there be light\".", v2.textEn)
    }

    @Test
    fun testParseInvalidJsonReturnsEmpty() {
        val verses = service.parseVersesJson("invalid json", bookId = 1, chapter = 1)
        assertEquals(0, verses.size)
    }
}
