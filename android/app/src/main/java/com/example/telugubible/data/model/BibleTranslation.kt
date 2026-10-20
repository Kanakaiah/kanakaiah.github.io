package com.example.telugubible.data.model

data class BibleTranslation(
    val code: String,
    val shortLabel: String,
    val fullLabel: String,
    val isOfflineBundled: Boolean = false
) {
    companion object {
        val LSB = BibleTranslation("LSB", "LSB", "LSB (Legacy Standard)", isOfflineBundled = false)
        val NASB = BibleTranslation("NASB", "NASB95", "NASB95 (1995)", isOfflineBundled = false)
        val ESV = BibleTranslation("ESV", "ESV", "ESV (English Standard)", isOfflineBundled = false)
        val NLT = BibleTranslation("NLT", "NLT", "NLT (New Living)", isOfflineBundled = false)
        val WEB = BibleTranslation("WEB", "WEB", "WEB (World English)", isOfflineBundled = false)
        val KJV = BibleTranslation("KJV", "KJV", "KJV (King James)", isOfflineBundled = false)
        val BSB = BibleTranslation("BSB", "BSB", "BSB (Berean Standard)", isOfflineBundled = true)
        val TBSI = BibleTranslation("TBSI", "Tamil", "Tamil (TBSI)", isOfflineBundled = true)
        val TELIRV = BibleTranslation("TELIRV", "Telugu", "Telugu (IRV)", isOfflineBundled = true)

        val ALL: List<BibleTranslation> = listOf(
            LSB, NASB, ESV, NLT, WEB, KJV, BSB, TBSI, TELIRV
        )

        private val MAP_BY_CODE = ALL.associateBy { it.code.uppercase() }

        fun fromCode(code: String?): BibleTranslation {
            if (code == null) return LSB
            return MAP_BY_CODE[code.uppercase()] ?: LSB
        }

        fun getLabel(code: String?): String {
            return fromCode(code).shortLabel
        }
    }
}
