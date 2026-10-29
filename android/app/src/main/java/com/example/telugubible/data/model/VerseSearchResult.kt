package com.example.telugubible.data.model

data class VerseSearchResult(
    val id: Long,
    val bookId: Int,
    val bookKey: String,
    val bookNameEn: String,
    val bookNameTe: String,
    val bookNameTa: String? = null,
    val chapter: Int,
    val verse: Int,
    val endVerse: Int? = null,
    val textTe: String?,
    val textEn: String?,
    val textTa: String? = null,
    val individualVerses: List<Pair<Int, String>> = emptyList()
)
