package com.example.telugubible.data.model

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
    val targetTextTe: String? = null
)
