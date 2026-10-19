package com.example.telugubible.data.model

data class CommentaryResource(
    val type: String, // "book", "web"
    val title: String,
    val url: String
)

data class CommentaryEntry(
    val rank: String = "",
    val person: String,
    val reference: String = "",
    val quote: String,
    val note: String = "",
    val resources: List<CommentaryResource> = emptyList()
)

data class CommentarySection(
    val heading: String,
    val description: String = "",
    val note: String = "",
    val entries: List<CommentaryEntry> = emptyList()
)

data class CommentarySeries(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: String,
    val category: String = "Reference",
    val bookIds: List<Int> = emptyList(),
    val sections: List<CommentarySection> = emptyList()
)

data class PreacherEntry(
    val rank: String, // Dates / lifespan, e.g. "354–430"
    val person: String,
    val reference: String, // Title / role
    val quote: String,
    val resources: List<CommentaryResource> = emptyList()
)

data class PreacherEra(
    val heading: String,
    val description: String,
    val entries: List<PreacherEntry> = emptyList()
)
