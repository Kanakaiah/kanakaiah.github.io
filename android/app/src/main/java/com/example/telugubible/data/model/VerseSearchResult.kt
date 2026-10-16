package com.example.telugubible.data.model

data class VerseSearchResult(
    val id: Long,
    val bookId: Int,
    val bookKey: String,
    val bookNameEn: String,
    val bookNameTe: String,
    val chapter: Int,
    val verse: Int,
    val textTe: String?,
    val textEn: String?
)
