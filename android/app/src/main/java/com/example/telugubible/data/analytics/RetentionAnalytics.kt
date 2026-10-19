package com.example.telugubible.data.analytics

import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.model.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.max

object RetentionAnalytics {

    private const val MS_PER_DAY = 86_400_000L
    const val MIN_BUCKET_N = 5
    const val COLD_DAYS = 30
    const val COLD_CHECK_SIZE = 5

    private val BUCKET_DEFS = listOf(
        Pair("1d", 1),
        Pair("3d", 3),
        Pair("1w", 7),
        Pair("1mo", 30),
        Pair("3mo", 90),
        Pair("3mo+", Int.MAX_VALUE)
    )

    private fun withinDays(reviewDate: Long, days: Int, now: Long): Boolean {
        return (now - reviewDate) <= days * MS_PER_DAY
    }

    fun isRecalled(score: Int): Boolean = score >= 3

    fun firstTryRetention(
        log: List<ReviewLogEntry>,
        windowDays: Int = 30,
        now: Long = System.currentTimeMillis()
    ): HeadlineRetention {
        val eligible = log.filter {
            withinDays(it.reviewDate, windowDays, now) && it.cueLevel <= 1 && it.prevInterval > 0
        }
        val attempts = eligible.size
        val recalled = eligible.count { isRecalled(it.score) }
        val rate = if (attempts >= MIN_BUCKET_N) recalled.toDouble() / attempts else null
        return HeadlineRetention(attempts = attempts, recalled = recalled, rate = rate)
    }

    fun retentionByInterval(
        log: List<ReviewLogEntry>,
        windowDays: Int = 90,
        now: Long = System.currentTimeMillis()
    ): List<RetentionBucket> {
        val buckets = BUCKET_DEFS.map { (label, maxDays) ->
            RetentionBucket(label = label, maxDays = maxDays, attempts = 0, recalled = 0, rate = null)
        }.toMutableList()

        val eligible = log.filter { withinDays(it.reviewDate, windowDays, now) && it.prevInterval > 0 }

        for (e in eligible) {
            val idx = buckets.indexOfFirst { e.prevInterval <= it.maxDays }
            if (idx >= 0) {
                val b = buckets[idx]
                val newRecalled = if (isRecalled(e.score)) b.recalled + 1 else b.recalled
                buckets[idx] = b.copy(
                    attempts = b.attempts + 1,
                    recalled = newRecalled
                )
            }
        }

        return buckets.map { b ->
            val rate = if (b.attempts >= MIN_BUCKET_N) b.recalled.toDouble() / b.attempts else null
            b.copy(rate = rate)
        }
    }

    fun curveRead(curve: List<RetentionBucket>): String {
        val known = curve.filter { it.rate != null }
        if (known.size < 2) {
            return "Not enough reviews at long intervals yet to draw a curve."
        }
        val longest = known.last()
        val rate = longest.rate ?: 1.0
        return when {
            rate < 0.70 -> "Below target at ${longest.label}. Intervals are running longer than your recall — consider grading harder, or reviewing sooner."
            rate >= 0.90 -> "Holding well out to ${longest.label}. There may be room to let intervals run longer."
            else -> "Roughly on target out to ${longest.label}."
        }
    }

    fun needsShortening(curve: List<RetentionBucket>, intervalScale: Double): Boolean {
        val longest = curve.filter { it.rate != null }.lastOrNull()
        return (longest != null && (longest.rate ?: 1.0) < 0.80) || intervalScale != 1.0
    }

    fun honestyGap(
        log: List<ReviewLogEntry>,
        windowDays: Int = 30,
        now: Long = System.currentTimeMillis()
    ): HonestyGapInfo? {
        val measured = log.filter { it.measuredAccuracy != null && withinDays(it.reviewDate, windowDays, now) }
        if (measured.isEmpty()) return null

        val meanGrade = measured.map { it.score }.average()
        val meanSuggested = measured.map { suggestedScore(it.measuredAccuracy ?: 0.0) }.average()
        return HonestyGapInfo(
            n = measured.size,
            meanGrade = meanGrade,
            meanSuggested = meanSuggested,
            gap = meanGrade - meanSuggested
        )
    }

    fun suggestedScore(accuracy: Double): Int {
        return when {
            accuracy >= 0.95 -> 5
            accuracy >= 0.80 -> 4
            accuracy >= 0.60 -> 3
            accuracy >= 0.30 -> 2
            else -> 1
        }
    }

    fun layerRetention(
        log: List<ReviewLogEntry>,
        windowDays: Int = 30,
        now: Long = System.currentTimeMillis()
    ): List<LayerRetention> {
        val layers = listOf(
            Pair("theme", "Theme"),
            Pair("anchor", "Anchor"),
            Pair("verse", "Verse")
        )

        return layers.map { (kind, label) ->
            val rows = log.filter {
                it.itemKind == kind && it.prevInterval > 0 && it.cueLevel <= 1 && withinDays(it.reviewDate, windowDays, now)
            }
            val attempts = rows.size
            val recalled = rows.count { isRecalled(it.score) }
            val rate = if (attempts >= MIN_BUCKET_N) recalled.toDouble() / attempts else null
            LayerRetention(kind = kind, label = label, attempts = attempts, rate = rate)
        }
    }

    fun computeLeeches(
        verses: List<UserMemoryVerse>,
        chapterProgress: List<ChapterProgressEntity>,
        booksMap: Map<Int, Book>,
        threshold: Int = 3
    ): List<LeechItem> {
        val out = mutableListOf<LeechItem>()

        for (v in verses) {
            if (v.lapses >= threshold) {
                out.add(
                    LeechItem(
                        key = "verse:${v.id}",
                        kind = "verse",
                        label = "${v.bookNameEn} ${v.chapter}:${v.verse}",
                        lapses = v.lapses,
                        attempts = v.attempts,
                        interval = v.interval
                    )
                )
            }
        }

        for (p in chapterProgress) {
            if (p.lapses >= threshold) {
                val bName = booksMap[p.bookId]?.nameEn ?: "Book ${p.bookId}"
                out.add(
                    LeechItem(
                        key = "anchor:${p.bookId}:${p.chapter}",
                        kind = "anchor",
                        label = "$bName ${p.chapter}",
                        lapses = p.lapses,
                        attempts = p.attempts,
                        interval = p.interval
                    )
                )
            }
        }

        return out.sortedWith(
            compareByDescending<LeechItem> { it.lapses }
                .thenByDescending { it.attempts }
        ).take(5)
    }

    fun activeDays(
        log: List<ReviewLogEntry>,
        windowDays: Int = 45,
        now: Long = System.currentTimeMillis()
    ): Int {
        val cutoff = now - windowDays * MS_PER_DAY
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val days = mutableSetOf<String>()
        for (e in log) {
            if (e.reviewDate >= cutoff) {
                days.add(sdf.format(Date(e.reviewDate)))
            }
        }
        return days.size
    }

    fun overdueCount(
        verses: List<UserMemoryVerse>,
        chapterProgress: List<ChapterProgressEntity>,
        now: Long = System.currentTimeMillis()
    ): Int {
        val verseOverdue = verses.count { it.nextDueDate <= now }
        val chapterOverdue = chapterProgress.count { it.attempts > 0 && it.nextDueDate <= now }
        return verseOverdue + chapterOverdue
    }

    fun findColdItems(
        log: List<ReviewLogEntry>,
        verses: List<UserMemoryVerse>,
        chapterProgress: List<ChapterProgressEntity>,
        anchorsMap: Map<String, ChapterAnchor>,
        booksMap: Map<Int, Book> = emptyMap(),
        now: Long = System.currentTimeMillis()
    ): List<ColdCheckCandidate> {
        val lastSuccess = mutableMapOf<String, Long>()

        // Scan review log for last successful recall without full prompt
        for (e in log) {
            if (e.score < 3 || e.cueLevel >= 4) continue
            val key = "${e.itemKind}:${e.itemId}"
            val prev = lastSuccess[key]
            if (prev == null || e.reviewDate > prev) {
                lastSuccess[key] = e.reviewDate
            }
        }

        val candidates = mutableListOf<ColdCheckCandidate>()

        // Check verses
        for (v in verses) {
            val key = "verse:${v.id}"
            val lastRecalled = lastSuccess[key] ?: v.createdAt
            val coldDays = ((now - lastRecalled) / MS_PER_DAY).toInt()
            if (coldDays >= COLD_DAYS) {
                candidates.add(
                    ColdCheckCandidate(
                        key = key,
                        kind = "verse",
                        prompt = "${v.bookNameEn} ${v.chapter}:${v.verse}",
                        answer = v.textEn ?: v.textTe ?: "",
                        coldForDays = coldDays
                    )
                )
            }
        }

        // Check chapter anchors
        for (p in chapterProgress) {
            if (p.attempts == 0) continue
            val key = "anchor:${p.bookId}:${p.chapter}"
            val anchor = anchorsMap["${p.bookId}:${p.chapter}"] ?: continue
            val bookName = booksMap[p.bookId]?.nameEn ?: "Book ${p.bookId}"
            val lastRecalled = lastSuccess[key] ?: (now - p.interval * MS_PER_DAY)
            val coldDays = ((now - lastRecalled) / MS_PER_DAY).toInt()
            if (coldDays >= COLD_DAYS) {
                candidates.add(
                    ColdCheckCandidate(
                        key = key,
                        kind = "anchor",
                        prompt = "$bookName ${p.chapter}",
                        answer = anchor.word,
                        coldForDays = coldDays
                    )
                )
            }
        }

        return candidates.shuffled().take(COLD_CHECK_SIZE)
    }
}
