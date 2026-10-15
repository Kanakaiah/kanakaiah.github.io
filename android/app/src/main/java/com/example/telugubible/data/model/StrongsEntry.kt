package com.example.telugubible.data.model

data class StrongsEntry(
    val id: String,
    val lang: String,
    val lemma: String?,
    val xlit: String?,
    val pron: String?,
    val derivation: String?,
    val strongsDef: String?,
    val kjvDef: String?,
    val pos: String?
)
