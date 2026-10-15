package com.example.telugubible.data.model

data class Book(
    val id: Int,
    val key: String,
    val nameEn: String,
    val nameTe: String,
    val nameTa: String?,
    val testament: String, // "OT" or "NT"
    val section: String,
    val chapters: Int
)
