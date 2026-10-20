package com.example.telugubible.data.model

data class Topic(
    val id: String,
    val name: String,
    val createdAt: Long = System.currentTimeMillis()
)
