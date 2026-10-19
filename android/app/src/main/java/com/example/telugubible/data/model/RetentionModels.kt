package com.example.telugubible.data.model

data class ReviewLogEntry(
    val id: Long,
    val itemKind: String, // "verse", "anchor", "theme", "chain"
    val itemId: String,
    val score: Int,
    val reviewDate: Long,
    val prevInterval: Int,
    val newInterval: Int,
    val prevEfactor: Double,
    val newEfactor: Double,
    val cueLevel: Int = 0,
    val mode: String = "reveal",
    val measuredAccuracy: Double? = null
)

data class RetentionBucket(
    val label: String,
    val maxDays: Int,
    val attempts: Int,
    val recalled: Int,
    val rate: Double?
)

data class HeadlineRetention(
    val attempts: Int,
    val recalled: Int,
    val rate: Double?
)

data class HonestyGapInfo(
    val n: Int,
    val meanGrade: Double,
    val meanSuggested: Double,
    val gap: Double
)

data class LayerRetention(
    val kind: String,
    val label: String,
    val attempts: Int,
    val rate: Double?
)

data class LeechItem(
    val key: String,
    val kind: String,
    val label: String,
    val lapses: Int,
    val attempts: Int,
    val interval: Int
)

data class ColdCheckResult(
    val ts: Long,
    val correct: Int,
    val total: Int,
    val medianColdFor: Int
)

data class ColdCheckCandidate(
    val key: String,
    val kind: String,
    val prompt: String,
    val answer: String,
    val coldForDays: Int
)

data class AdherenceStats(
    val started: Int,
    val completed: Int,
    val completionRate: Double?,
    val meanMinutes: Int?,
    val meanAbandonAt: Int?
)

data class RetentionUiState(
    val isLoading: Boolean = true,
    val headline: HeadlineRetention = HeadlineRetention(0, 0, null),
    val overdueCount: Int = 0,
    val curve: List<RetentionBucket> = emptyList(),
    val curveSummary: String = "",
    val needsShortening: Boolean = false,
    val intervalScale: Double = 1.0,
    val honestyGap: HonestyGapInfo? = null,
    val byLayer: List<LayerRetention> = emptyList(),
    val coldAvailableCount: Int = 0,
    val lastColdCheck: ColdCheckResult? = null,
    val leeches: List<LeechItem> = emptyList(),
    val activeDaysCount: Int = 0,
    val adherence: AdherenceStats = AdherenceStats(0, 0, null, null, null),
    val isColdCheckActive: Boolean = false,
    val coldCheckCandidates: List<ColdCheckCandidate> = emptyList(),
    val activeColdIndex: Int = 0,
    val coldCheckAnswerTyped: String = "",
    val coldCheckRevealed: Boolean = false,
    val coldCheckCorrectKeys: Set<String> = emptySet(),
    val coldCheckFinishedResult: ColdCheckResult? = null
)
