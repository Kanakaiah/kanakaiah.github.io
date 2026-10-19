package com.example.telugubible.util

object StrongsParser {
    private val regex = Regex("([^<]*)(?:<S>([0-9]+)</S>)?")
    private val supRegex = Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE)

    /**
     * Parses KJV verse text tagged with Strong's numbers (e.g. `word<S>1234</S>`) into pairs
     * of (englishText, formattedStrongsId).
     *
     * @param html Raw KJV text containing <S> tags.
     * @param isOldTestament true for Hebrew (H prefix), false for Greek (G prefix).
     */
    fun parseTaggedText(html: String, isOldTestament: Boolean): List<Pair<String, String?>> {
        val clean = supRegex.replace(html, "")
        val result = mutableListOf<Pair<String, String?>>()
        val matches = regex.findAll(clean)

        for (m in matches) {
            val english = m.groupValues[1].trim()
            val number = m.groupValues.getOrNull(2)

            if (english.isEmpty() && number.isNullOrEmpty()) continue

            val formattedId = if (!number.isNullOrEmpty()) {
                val prefix = if (isOldTestament) "H" else "G"
                "$prefix$number"
            } else null

            result.add(Pair(english, formattedId))
        }

        return result
    }

    /**
     * Normalizes a Strong's ID to unpadded uppercase (e.g. "h02584" -> "H2584").
     */
    fun normalizeStrongsRef(ref: String): String {
        val trimmed = ref.trim()
        val match = Regex("^([GHgh])0*(\\d+)$").find(trimmed) ?: return trimmed.uppercase()
        return "${match.groupValues[1].uppercase()}${match.groupValues[2]}"
    }
}
