package com.example.telugubible.data.model

data class UserMemoryVerse(
    val id: Long,
    val bookId: Int,
    val bookKey: String,
    val bookNameEn: String,
    val bookNameTe: String,
    val chapter: Int,
    val verse: Int,
    val textTe: String?,
    val textEn: String?,
    val status: String, // "learning" or "memorized"
    val repetition: Int,
    val interval: Int,
    val efactor: Double,
    val nextDueDate: Long,
    val createdAt: Long,
    val lapses: Int = 0,
    val attempts: Int = 0
)
