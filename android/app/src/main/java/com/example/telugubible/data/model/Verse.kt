package com.example.telugubible.data.model

data class Verse(
    val id: Long,
    val bookId: Int,
    val chapter: Int,
    val verse: Int,
    val textTe: String?,
    val textEn: String?,
    val textTa: String?
)
