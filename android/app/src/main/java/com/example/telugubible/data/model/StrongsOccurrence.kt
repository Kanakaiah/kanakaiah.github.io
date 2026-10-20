package com.example.telugubible.data.model

data class StrongsOccurrence(
    val bookId: Int,
    val bookName: String,
    val chapter: Int,
    val verse: Int,
    val rawText: String,
    val cleanText: String,
    val highlightedWords: List<String> = emptyList(),
    val highlightRanges: List<IntRange> = emptyList()
)
