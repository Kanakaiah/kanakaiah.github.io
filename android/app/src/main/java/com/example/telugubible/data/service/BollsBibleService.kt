package com.example.telugubible.data.service

import com.example.telugubible.data.model.Verse
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class BollsBibleService(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {

    suspend fun fetchChapter(version: String, bookId: Int, chapter: Int): List<Verse>? = withContext(ioDispatcher) {
        val targetVersion = when (version.uppercase()) {
            "NASB95" -> "NASB"
            else -> version.uppercase()
        }

        val urlString = "https://bolls.life/get-text/$targetVersion/$bookId/$chapter/"
        var connection: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 15000
                readTimeout = 15000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "Remora-Android/1.0")
            }

            val responseCode = connection.responseCode
            if (responseCode != HttpURLConnection.HTTP_OK) {
                return@withContext null
            }

            val reader = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
            val responseText = reader.use { it.readText() }
            parseVersesJson(responseText, bookId, chapter)
        } catch (e: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    fun parseVersesJson(jsonString: String, bookId: Int, chapter: Int): List<Verse> {
        val list = mutableListOf<Verse>()
        try {
            val array = JSONArray(jsonString)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val verseNum = obj.optInt("verse", i + 1)
                val rawText = obj.optString("text", "")

                // Clean HTML tags like <b>...</b>, <br/>, or <i>...</i>
                val cleanText = rawText
                    .replace(Regex("<b[^>]*>.*?</b>", RegexOption.DOT_MATCHES_ALL), "")
                    .replace(Regex("<[^>]*>"), "")
                    .replace("&nbsp;", " ")
                    .replace("&amp;", "&")
                    .replace("&lt;", "<")
                    .replace("&gt;", ">")
                    .replace("&quot;", "\"")
                    .replace("&#39;", "'")
                    .trim()

                val verseId = (bookId * 1_000_000L) + (chapter * 1_000L) + verseNum
                list.add(
                    Verse(
                        id = verseId,
                        bookId = bookId,
                        chapter = chapter,
                        verse = verseNum,
                        textTe = null,
                        textEn = cleanText,
                        textTa = null
                    )
                )
            }
        } catch (e: Exception) {
            // Ignore parse errors
        }
        return list
    }
}
