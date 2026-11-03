package com.example.telugubible.data.model

import org.json.JSONArray
import org.json.JSONObject

data class BackupPreview(
    val formatVersion: Int,
    val verses: Int,
    val collections: Int,
    val chapterProgress: Int,
    val bookThemes: Int,
    val chapterChains: Int,
    val reviews: Int,
    val coldChecks: Int,
    val sessions: Int,
    val hasSettings: Boolean,
    val isLegacy: Boolean
)

object BackupInspector {
    private val arraySections = setOf("verses", "reviewLog", "coldChecks", "topics", "verseTopics", "sessionAdherence")
    private val objectSections = setOf("chapterProgress", "blockProgress", "themeProgress", "stats")
    private val knownSections = arraySections + objectSections

    fun inspect(json: String): BackupPreview {
        val root = JSONObject(json)
        val version = if (root.has("formatVersion")) {
            val number = root.get("formatVersion")
            require(number is Number && number.toDouble() == number.toInt().toDouble()) { "Invalid backup version." }
            number.toInt()
        } else 1
        require(version in 1..2) { "This backup version is not supported." }
        val keys = root.keys().asSequence().toSet()
        require(keys.any { it in knownSections }) { "This is not a recognized Remora backup." }
        require(keys.all { it == "formatVersion" || it in knownSections }) { "This backup contains unsupported data." }
        if (version == 2) require(knownSections.all { it in keys }) { "This backup is incomplete." }
        for (key in arraySections) if (root.has(key)) {
            val items = root.getJSONArray(key)
            for (i in 0 until items.length()) items.getJSONObject(i)
        }
        for (key in objectSections) if (root.has(key)) {
            val items = root.getJSONObject(key)
            if (key != "stats") for (name in items.keys()) {
                val item = items.getJSONObject(name)
                require(item.getInt("book_id") in 1..66) { "A progress entry has an invalid book." }
                if (key == "chapterProgress") require(item.getInt("chapter") > 0) { "A progress entry has an invalid chapter." }
                if (key == "blockProgress") require(item.getInt("block_index") >= 0) { "A chain entry has an invalid block." }
                if (version == 2) {
                    item.getString("status"); item.getInt("repetition"); item.getInt("interval")
                    item.getDouble("efactor"); item.getLong("next_due_date"); item.getInt("lapses"); item.getInt("attempts")
                    item.getInt("pre_lapse_interval")
                    when (key) {
                        "chapterProgress" -> { item.getInt("chain_hits"); item.getInt("chain_misses"); item.getLong("last_chain_date") }
                        "blockProgress" -> { item.getString("label"); item.getInt("last_score"); item.getDouble("last_accuracy"); item.getLong("last_attempt_date") }
                        "themeProgress" -> item.getInt("last_score")
                    }
                }
            }
        }
        val verses = root.optJSONArray("verses") ?: JSONArray()
        val ids = mutableSetOf<Long>()
        val references = mutableSetOf<Triple<Int, Int, Int>>()
        for (i in 0 until verses.length()) {
            val item = verses.getJSONObject(i)
            val book = if (item.has("book_id")) item.getInt("book_id") else item.getInt("bookId")
            val chapter = item.getInt("chapter")
            val verse = item.getInt("verse")
            require(book in 1..66 && chapter > 0 && verse > 0 && references.add(Triple(book, chapter, verse))) { "A verse reference is invalid or duplicated." }
            if (item.has("id")) require(item.getLong("id") > 0 && ids.add(item.getLong("id"))) { "A verse identifier is invalid or duplicated." }
            if (version == 2) {
                require(item.has("id") && item.has("end_verse") && item.has("keyword")) { "A saved verse is incomplete." }
                item.getString("status"); item.getInt("repetition"); item.getInt("interval"); item.getDouble("efactor")
                item.getLong("next_due_date"); item.getLong("created_at"); item.getInt("lapses"); item.getInt("pre_lapse_interval"); item.getInt("attempts")
            }
            if (item.has("end_verse") && !item.isNull("end_verse")) require(item.getInt("end_verse") >= verse) { "A verse range is invalid." }
            if (item.has("endVerse") && !item.isNull("endVerse")) require(item.getInt("endVerse") >= verse) { "A verse range is invalid." }
        }
        val topics = root.optJSONArray("topics") ?: JSONArray()
        val topicIds = mutableSetOf<String>()
        for (i in 0 until topics.length()) {
            val item = topics.getJSONObject(i)
            require(item.getString("id").isNotBlank() && topicIds.add(item.getString("id")) && item.getString("name").isNotBlank()) { "A collection is invalid or duplicated." }
        }
        val links = root.optJSONArray("verseTopics") ?: JSONArray()
        for (i in 0 until links.length()) {
            val item = links.getJSONObject(i)
            val verseId = if (item.has("verseId")) item.getLong("verseId") else item.getLong("verse_id")
            val topicId = if (item.has("topicId")) item.getString("topicId") else item.getString("topic_id")
            require(verseId in ids && topicId in topicIds) { "A collection link refers to missing backup data." }
        }
        if (version == 2) {
            val reviews = root.getJSONArray("reviewLog")
            for (i in 0 until reviews.length()) {
                val item = reviews.getJSONObject(i)
                item.getLong("verse_id"); require(item.getInt("score") in 0..5) { "Invalid review score." }
                item.getLong("review_date"); item.getInt("prev_interval"); item.getInt("new_interval")
                item.getDouble("prev_efactor"); item.getDouble("new_efactor"); item.getString("item_kind")
                item.getString("item_id"); item.getInt("cue_level"); item.getString("mode")
            }
            val checks = root.getJSONArray("coldChecks")
            for (i in 0 until checks.length()) {
                val item = checks.getJSONObject(i)
                item.getLong("ts"); val total = item.getInt("total"); val correct = item.getInt("correct")
                require(total >= 0 && correct in 0..total && item.getInt("median_cold_for") >= 0) { "Invalid cold-check result." }
            }
            val sessions = root.getJSONArray("sessionAdherence")
            for (i in 0 until sessions.length()) {
                val item = sessions.getJSONObject(i)
                item.getLong("ts"); require(item.getInt("completed") in 0..1 && item.getLong("duration_ms") >= 0) { "Invalid session record." }
            }
        }
        return BackupPreview(version, verses.length(), topics.length(), root.optJSONObject("chapterProgress")?.length() ?: 0,
            root.optJSONObject("themeProgress")?.length() ?: 0, root.optJSONObject("blockProgress")?.length() ?: 0,
            root.optJSONArray("reviewLog")?.length() ?: 0, root.optJSONArray("coldChecks")?.length() ?: 0,
            root.optJSONArray("sessionAdherence")?.length() ?: 0, root.has("stats"), version == 1)
    }
}
