package com.example.telugubible.data.model

data class GuideBlock(
    val id: Long = 0,
    val bookId: Int,
    val blockIndex: Int,
    val chapters: String,
    val label: String,
    val description: String,
    val unit: String = "chapter"
)

data class GuideKeyVerse(
    val id: Long = 0,
    val bookId: Int,
    val ref: String,
    val text: String,
    val theme: String?
)

data class ChapterAnchor(
    val id: Long = 0,
    val bookId: Int,
    val chapter: Int,
    val word: String,
    val scene: String,
    val prevWord: String? = null,
    val nextWord: String? = null
)

data class BookGuide(
    val bookId: Int,
    val bookKey: String,
    val subtitle: String?,
    val structureFormula: String?,
    val memorySentence: String?,
    val icon: String?,
    val blocks: List<GuideBlock> = emptyList(),
    val keyVerses: List<GuideKeyVerse> = emptyList(),
    val anchors: List<ChapterAnchor> = emptyList()
)
