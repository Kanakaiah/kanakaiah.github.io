package com.example.telugubible.data.model

data class OriginalWord(
    val english: String,
    val strongsId: String?,
    val entry: StrongsEntry? = null
)
