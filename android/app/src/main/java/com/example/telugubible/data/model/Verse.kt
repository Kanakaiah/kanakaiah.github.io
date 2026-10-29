package com.example.telugubible.data.model

data class Verse(
    val id: Long,
    val bookId: Int,
    val chapter: Int,
    val verse: Int,
    val textTe: String?,
    val textEn: String?,
    val textTa: String? = null
) {
    fun getTextForVersion(version: String): String {
        return when (version.uppercase().trim()) {
            "TBSI" -> textTa ?: textEn ?: textTe ?: ""
            "TELIRV" -> textTe ?: textEn ?: textTa ?: ""
            else -> textEn ?: textTe ?: textTa ?: ""
        }
    }
}
