package com.example.telugubible.util

import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.random.Random

enum class ScheduleKind {
    VERSE,
    ANCHOR,
    THEME,
    CHAIN,
    SENTENCE
}

data class SchedulerProfile(
    val firstInterval: Int,
    val secondInterval: Int,
    val growth: Double,
    val matureInterval: Int,
    val lapseRecovery: Double
)

object SM2Engine {

    val DEFAULT_PROFILE = SchedulerProfile(
        firstInterval = 1,
        secondInterval = 6,
        growth = 1.0,
        matureInterval = 21,
        lapseRecovery = 0.25
    )

    val PROFILES: Map<ScheduleKind, SchedulerProfile> = mapOf(
        ScheduleKind.VERSE to SchedulerProfile(
            firstInterval = 1,
            secondInterval = 4,
            growth = 0.85,
            matureInterval = 30,
            lapseRecovery = 0.20
        ),
        ScheduleKind.ANCHOR to SchedulerProfile(
            firstInterval = 1,
            secondInterval = 8,
            growth = 1.15,
            matureInterval = 21,
            lapseRecovery = 0.30
        ),
        ScheduleKind.THEME to SchedulerProfile(
            firstInterval = 1,
            secondInterval = 10,
            growth = 1.20,
            matureInterval = 21,
            lapseRecovery = 0.30
        ),
        ScheduleKind.CHAIN to DEFAULT_PROFILE,
        ScheduleKind.SENTENCE to DEFAULT_PROFILE
    )

    fun profileFor(kind: ScheduleKind?): SchedulerProfile =
        if (kind != null) PROFILES[kind] ?: DEFAULT_PROFILE else DEFAULT_PROFILE

    data class EvaluationResult(
        val repetition: Int,
        val interval: Int,
        val efactor: Double,
        val nextDueDate: Long,
        val lapses: Int,
        val preLapseInterval: Int,
        val status: String,
        val daysUntilDue: Int
    )

    fun evaluate(
        repetition: Int,
        interval: Int,
        efactor: Double = 2.5,
        lapses: Int = 0,
        preLapseInterval: Int = 0,
        score: Int,
        kind: ScheduleKind = ScheduleKind.VERSE,
        intervalScale: Double = 1.0,
        now: Long = System.currentTimeMillis(),
        enableFuzz: Boolean = true
    ): EvaluationResult {
        val profile = profileFor(kind)
        var rep = repetition
        var intv = interval
        var ef = efactor
        var lap = lapses
        var preLap = preLapseInterval

        if (score < 3) {
            // Remember where this item was before it fell, only if it had achieved mature status
            if (intv > profile.matureInterval) {
                preLap = intv
                lap += 1
            }
            rep = 0
            intv = 1
        } else {
            if (rep == 0) {
                intv = profile.firstInterval
            } else if (rep == 1) {
                // The re-climb: Second success after a lapse aims at a fraction of the mature interval
                intv = if (preLap > 0) {
                    max(profile.secondInterval, (preLap * profile.lapseRecovery).roundToInt())
                } else {
                    profile.secondInterval
                }
                preLap = 0 // consumed
            } else {
                intv = max(intv + 1, (intv * ef * profile.growth).roundToInt())
            }
            rep += 1
        }

        // Adjust Easiness Factor (EF)
        ef = max(1.3, ef + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)))

        // Status classification: memorized (5+), review (3+), or learning (<3)
        val status = if (rep >= 5) "memorized" else if (rep >= 3) "review" else "learning"

        // Next due date calculation with anti-cohort scatter (±15% for interval >= 4)
        var daysUntilDue = intv
        if (enableFuzz && intv >= 4) {
            val spread = (intv * 0.15).roundToInt()
            if (spread > 0) {
                val delta = Random.nextInt(-spread, spread + 1)
                daysUntilDue = max(1, intv + delta)
            }
        }

        // Global interval scale (0.5 to 1.5) applied to due date, NOT stored interval (prevents compounding)
        val scale = intervalScale.coerceIn(0.5, 1.5)
        if (scale != 1.0) {
            daysUntilDue = max(1, (daysUntilDue * scale).roundToInt())
        }

        val nextDueDate = now + (daysUntilDue.toLong() * 24L * 60L * 60L * 1000L)

        return EvaluationResult(
            repetition = rep,
            interval = intv,
            efactor = ef,
            nextDueDate = nextDueDate,
            lapses = lap,
            preLapseInterval = preLap,
            status = status,
            daysUntilDue = daysUntilDue
        )
    }

    fun suggestedScore(accuracy: Double): Int = when {
        accuracy >= 98.0 -> 5
        accuracy >= 90.0 -> 4
        accuracy >= 70.0 -> 3
        else -> 1
    }

    fun isDue(nextDueDate: Long, now: Long = System.currentTimeMillis()): Boolean {
        if (nextDueDate <= 0L) return true
        return nextDueDate <= now
    }

    fun formatInterval(days: Int): String = when {
        days <= 0 -> "today"
        days == 1 -> "1 day"
        days < 30 -> "$days days"
        days < 365 -> "${Math.round(days / 30.0)} mo"
        else -> "${Math.round(days / 365.0)} yr"
    }
}
