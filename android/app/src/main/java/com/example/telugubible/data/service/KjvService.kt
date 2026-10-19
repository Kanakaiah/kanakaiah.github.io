package com.example.telugubible.data.service

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

class KjvService(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    private val cache = ConcurrentHashMap<Pair<Int, Int>, Map<Int, String>>()

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
     * Seeds the cache for testing or pre-warming.
     */
    fun seedCache(bookId: Int, chapter: Int, verses: Map<Int, String>) {
        cache[Pair(bookId, chapter)] = verses
    }
}
