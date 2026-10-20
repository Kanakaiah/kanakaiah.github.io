package com.example.telugubible.data.model

data class UserMemoryVerse(
    val id: Long = 0,
    val bookId: Int,
    val bookKey: String = "",
    val bookNameEn: String = "",
    val bookNameTe: String = "",
    val chapter: Int,
    val verse: Int,
    val textTe: String? = null,
    val textEn: String? = null,
    val status: String = "learning", // "learning" or "memorized"
    val repetition: Int = 0,
    val interval: Int = 1,
    val efactor: Double = 2.5,
    val nextDueDate: Long = 0L,
    val createdAt: Long = 0L,
    val lapses: Int = 0,
    val attempts: Int = 0,
    val topicIds: List<String> = emptyList()
)
