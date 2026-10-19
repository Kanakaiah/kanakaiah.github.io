package com.example.telugubible.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class AnchorJudgeTest {

    private val genesisSiblings = listOf(
        AnchorSibling(1, "CREATION"),
        AnchorSibling(2, "GARDEN"),
        AnchorSibling(21, "WELL"),
        AnchorSibling(26, "WELLS"),
        AnchorSibling(29, "STONE"),
        AnchorSibling(30, "STICKS"),
        AnchorSibling(32, "WRESTLE")
    )

    @Test
    fun testJudgeAnchorExact() {
        val result = AnchorJudge.judgeAnchor("creation", "CREATION", genesisSiblings, 1)
        assertEquals(AnchorVerdict.CORRECT, result.verdict)
        assertEquals(4, result.score)
        assertNull(result.confusedWith)
    }

    @Test
    fun testJudgeAnchorInflectionNearMiss() {
        // WRESTLING for WRESTLE is knowing the anchor and inflecting it -> NEAR (score 3)
        val result = AnchorJudge.judgeAnchor("WRESTLING", "WRESTLE", genesisSiblings, 32)
        assertEquals(AnchorVerdict.NEAR, result.verdict)
        assertEquals(3, result.score)
    }

    @Test
    fun testJudgeAnchorLongWordTypo() {
        // Minor typo in long word -> NEAR (score 3)
        val result = AnchorJudge.judgeAnchor("CIRCUMCISIONN", "CIRCUMCISION")
        assertEquals(AnchorVerdict.NEAR, result.verdict)
        assertEquals(3, result.score)
    }

    @Test
    fun testJudgeAnchorShortWordNoForgiveness() {
        // Short word with 1 char difference is a genuinely different word (ARM != ARK)
        val result = AnchorJudge.judgeAnchor("ARM", "ARK")
        assertEquals(AnchorVerdict.WRONG, result.verdict)
        assertEquals(1, result.score)
    }

    @Test
    fun testJudgeAnchorConfusedWithSibling() {
        // User typed STICKS for Chapter 29 (which is STONE). STICKS belongs to chapter 30 in Genesis!
        val result = AnchorJudge.judgeAnchor("STICKS", "STONE", genesisSiblings, 29)
        assertEquals(AnchorVerdict.WRONG, result.verdict)
        assertEquals(1, result.score)
        assertNotNull(result.confusedWith)
        assertEquals(30, result.confusedWith?.chapter)
        assertEquals("STICKS", result.confusedWith?.word)
    }

    @Test
    fun testJudgeChapterNumber() {
        // Exact
        val exact = AnchorJudge.judgeChapter("1", 1, genesisSiblings)
        assertEquals(AnchorVerdict.CORRECT, exact.verdict)
        assertEquals(4, exact.score)

        // Near miss (1-2 chapters away)
        val near = AnchorJudge.judgeChapter("3", 1, genesisSiblings)
        assertEquals(AnchorVerdict.NEAR, near.verdict)
        assertEquals(3, near.score)

        // Far miss (>2 chapters away)
        val far = AnchorJudge.judgeChapter("10", 1, genesisSiblings)
        assertEquals(AnchorVerdict.WRONG, far.verdict)
        assertEquals(1, far.score)
    }

    @Test
    fun testDirectionRotation() {
        // Low repetition: always N2W
        assertEquals(AnchorDirection.N2W, AnchorJudge.directionFor(0))
        assertEquals(AnchorDirection.N2W, AnchorJudge.directionFor(1))
        assertEquals(AnchorDirection.N2W, AnchorJudge.directionFor(2))

        // High repetition without art: alternates W2N and N2W
        assertEquals(AnchorDirection.W2N, AnchorJudge.directionFor(3, hasArt = false))
        assertEquals(AnchorDirection.N2W, AnchorJudge.directionFor(4, hasArt = false))

        // High repetition with art: alternates W2N and P2W
        assertEquals(AnchorDirection.W2N, AnchorJudge.directionFor(3, hasArt = true))
        assertEquals(AnchorDirection.P2W, AnchorJudge.directionFor(4, hasArt = true))
    }
}
