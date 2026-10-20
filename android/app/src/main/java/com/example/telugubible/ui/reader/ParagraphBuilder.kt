package com.example.telugubible.ui.reader

import com.example.telugubible.data.model.Verse

data class ReaderParagraph(
    val id: String,
    val paragraphIndex: Int,
    val verses: List<Verse>,
    val isParagraphStart: Boolean = true,
    val sectionHeading: String? = null,
    val psalmTitle: String? = null
)

object ParagraphBuilder {

    /**
     * Partitions a list of verses into paragraphs.
     * Boundaries:
     * - First verse always begins the first paragraph.
     * - Any verse whose verse number is in [paragraphBreaks] (and > 1) begins a new paragraph.
     * - Embedded <b>Heading</b> tags trigger a section heading and start a new paragraph.
     * - If in Psalms and verse == 1, parses Psalm superscription (e.g. "A Psalm of David.").
     */
    fun buildParagraphs(
        verses: List<Verse>,
        paragraphBreaks: Set<Int>,
        isPsalms: Boolean = false
    ): List<ReaderParagraph> {
        if (verses.isEmpty()) return emptyList()

        val paragraphs = mutableListOf<ReaderParagraph>()
        var currentVerses = mutableListOf<Verse>()
        var currentHeading: String? = null
        var currentPsalmTitle: String? = null
        var paragraphIdx = 0

        for (v in verses) {
            val vNum = v.verse
            val text = v.textEn ?: v.textTe ?: ""

            // Check for embedded heading in <b>...</b>
            val headingMatch = Regex("<b[^>]*>(.*?)</b>", RegexOption.IGNORE_CASE).find(text)
            val extractedHeading = headingMatch?.groupValues?.get(1)?.trim()

            // Check for Psalm title on verse 1
            var psalmTitle: String? = null
            if (isPsalms && vNum == 1) {
                val cleanTextForPsalm = text.replace(Regex("<b[^>]*>.*?</b>", RegexOption.IGNORE_CASE), "").trim()
                val match = Regex("^([\\s\\S]*?[a-z]\\.)\\s*([A-Z][\\s\\S]*)$").find(cleanTextForPsalm)
                if (match != null) {
                    psalmTitle = match.groupValues[1].trim()
                }
            }

            val isBreak = (vNum in paragraphBreaks && vNum > 1) || (extractedHeading != null && currentVerses.isNotEmpty())

            if (isBreak && currentVerses.isNotEmpty()) {
                paragraphs.add(
                    ReaderParagraph(
                        id = "p_$paragraphIdx",
                        paragraphIndex = paragraphIdx,
                        verses = currentVerses.toList(),
                        isParagraphStart = paragraphIdx > 0,
                        sectionHeading = currentHeading,
                        psalmTitle = currentPsalmTitle
                    )
                )
                paragraphIdx++
                currentVerses = mutableListOf()
                currentHeading = extractedHeading
                currentPsalmTitle = psalmTitle
            } else {
                if (currentHeading == null && extractedHeading != null) {
                    currentHeading = extractedHeading
                }
                if (currentPsalmTitle == null && psalmTitle != null) {
                    currentPsalmTitle = psalmTitle
                }
            }

            currentVerses.add(v)
        }

        if (currentVerses.isNotEmpty()) {
            paragraphs.add(
                ReaderParagraph(
                    id = "p_$paragraphIdx",
                    paragraphIndex = paragraphIdx,
                    verses = currentVerses.toList(),
                    isParagraphStart = paragraphIdx > 0,
                    sectionHeading = currentHeading,
                    psalmTitle = currentPsalmTitle
                )
            )
        }

        return paragraphs
    }
}
