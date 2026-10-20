package com.example.telugubible.data.service

import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.StrongsOccurrence
import com.example.telugubible.util.StrongsParser
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap

class KjvService(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val cache = ConcurrentHashMap<Pair<Int, Int>, Map<Int, String>>()
    private val occurrencesCache = ConcurrentHashMap<String, List<StrongsOccurrence>>()

    /**
     * Retrieves KJV chapter text with Strong's tags from memory cache or Bolls API.
     * Returns a map of verseNumber -> taggedText.
     */
    suspend fun getChapterKjv(bookId: Int, chapter: Int): Map<Int, String>? = withContext(ioDispatcher) {
        val key = Pair(bookId, chapter)
        cache[key]?.let { return@withContext it }

        try {
            val url = URL("https://bolls.life/get-text/KJV/$bookId/$chapter/")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.instanceFollowRedirects = true
            conn.setRequestProperty("User-Agent", "Remora-Android/1.0")
            conn.connect()

            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val array = JSONArray(jsonStr)
                val map = mutableMapOf<Int, String>()
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val verse = obj.optInt("verse", i + 1)
                    val text = obj.optString("text", "")
                    map[verse] = text
                }
                cache[key] = map
                map
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Searches occurrences of a Strong's ID across the Bible via Bolls KJV search API.
     * Filters results by testament (OT <= 39 for 'H', NT >= 40 for 'G').
     */
    suspend fun searchOccurrences(
        strongsId: String,
        booksMap: Map<Int, Book> = emptyMap()
    ): List<StrongsOccurrence> = withContext(ioDispatcher) {
        val normalized = StrongsParser.normalizeStrongsRef(strongsId)
        occurrencesCache[normalized]?.let { return@withContext it }

        val numberPart = StrongsParser.strongsNumberPart(normalized)
        if (numberPart.isEmpty()) return@withContext emptyList()
        val isOT = StrongsParser.isHebrewStrongs(normalized)

        try {
            val query = URLEncoder.encode("<S>$numberPart</S>", "UTF-8")
            val url = URL("https://bolls.life/search/KJV/?search=$query&match_case=true&match_whole=true")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.instanceFollowRedirects = true
            conn.setRequestProperty("User-Agent", "Remora-Android/1.0")
            conn.connect()

            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val array = JSONArray(jsonStr)
                val list = mutableListOf<StrongsOccurrence>()

                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val book = obj.getInt("book")
                    // Testament filter: OT is books 1..39, NT is 40..66
                    if (isOT && book > 39) continue
                    if (!isOT && book < 40) continue

                    val chapter = obj.getInt("chapter")
                    val verse = obj.getInt("verse")
                    val rawText = obj.optString("text", "")
                    val bookName = booksMap[book]?.nameEn ?: "Book $book"

                    val processed = StrongsParser.cleanOccurrenceHtml(rawText, numberPart)

                    list.add(
                        StrongsOccurrence(
                            bookId = book,
                            bookName = bookName,
                            chapter = chapter,
                            verse = verse,
                            rawText = rawText,
                            cleanText = processed.cleanText,
                            highlightedWords = processed.highlightedWords,
                            highlightRanges = processed.highlightRanges
                        )
                    )
                }

                occurrencesCache[normalized] = list
                list
            } else {
                emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /**
     * Seeds the chapter cache for testing or pre-warming.
     */
    fun seedCache(bookId: Int, chapter: Int, verses: Map<Int, String>) {
        cache[Pair(bookId, chapter)] = verses
    }

    /**
     * Seeds the occurrences cache for testing or pre-warming.
     */
    fun seedOccurrencesCache(strongsId: String, occurrences: List<StrongsOccurrence>) {
        val normalized = StrongsParser.normalizeStrongsRef(strongsId)
        occurrencesCache[normalized] = occurrences
    }
}
