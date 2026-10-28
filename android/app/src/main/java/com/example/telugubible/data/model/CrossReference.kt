package com.example.telugubible.data.model

enum class LinkDirection {
    OUTGOING,
    INCOMING
}

data class CrossReference(
    val id: Long = 0L,
    val fromBookId: Int,
    val fromChapter: Int,
    val fromVerse: Int,
    val toRef: String,
    val toBookId: Int? = null,
    val toChapter: Int? = null,
    val toVerse: Int? = null,
    val toEndVerse: Int? = null,
    val targetTextEn: String? = null,
    val targetTextTe: String? = null,
    val votes: Int = 0,
    val direction: LinkDirection = LinkDirection.OUTGOING,
    val otherStartVid: Int = 0,
    val otherEndVid: Int = 0,
    val landingNote: String? = null
)

data class StepBibleWord(
    val id: Int,
    val strongs: String,
    val lemma: String,
    val transliteration: String,
    val gloss: String,
    val verseCount: Int
)

data class StepBibleWordOccurrence(
    val vid: Int,
    val bookId: Int,
    val chapter: Int,
    val verse: Int,
    val refLabel: String,
    val textEn: String?,
    val textTe: String?
)

data class VerseConnectionsData(
    val vid: Int,
    val bookId: Int,
    val chapter: Int,
    val verse: Int,
    val outgoing: List<CrossReference> = emptyList(),
    val incoming: List<CrossReference> = emptyList(),
    val originalWords: List<StepBibleWord> = emptyList()
)
