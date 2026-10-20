package com.example.telugubible.ui.reader

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.RemoraGold

@Composable
fun ParagraphView(
    paragraph: ReaderParagraph,
    selectedVerses: Set<Int>,
    flashVerse: Int?,
    memorizedVerses: Set<Int>,
    activeTtsVerse: Int?,
    otQuotes: Set<Int>,
    showSectionHeadings: Boolean,
    showVerseNumbers: Boolean,
    showParagraphMarks: Boolean,
    showCrossRefMarkers: Boolean,
    crossRefCounts: Map<Int, Int>,
    bionicReading: Boolean,
    fontSizeScale: FontSizeScale,
    readerFontFamily: ReaderFontFamily,
    readerTheme: ReaderTheme,
    language: BibleLanguage,
    onVerseClick: (Int) -> Unit,
    onCrossRefClick: (Int) -> Unit,
    onEmptySpaceClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val baseFontSize = 18.sp * fontSizeScale.multiplier
    val baseLineHeight = baseFontSize * 1.65f
    val verseNumSize = (baseFontSize.value * 0.58f).sp
    val xrefNumSize = (baseFontSize.value * 0.55f).sp

    Column(modifier = modifier.fillMaxWidth()) {
        // 1. Section Heading
        if (showSectionHeadings && !paragraph.sectionHeading.isNullOrBlank()) {
            Text(
                text = paragraph.sectionHeading,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = (baseFontSize.value * 1.15f).sp,
                    fontFamily = readerFontFamily.fontFamily,
                    letterSpacing = (-0.01).sp
                ),
                color = readerTheme.accentColor,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        top = if (paragraph.paragraphIndex == 0) 4.dp else 24.dp,
                        bottom = 10.dp
                    )
            )
        } else if (paragraph.isParagraphStart && paragraph.paragraphIndex > 0) {
            // Natural line break between paragraphs when no heading is present
            Spacer(modifier = Modifier.height(18.dp))
        }

        // 2. Psalm Title
        if (!paragraph.psalmTitle.isNullOrBlank()) {
            Text(
                text = paragraph.psalmTitle,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontStyle = FontStyle.Italic,
                    fontFamily = readerFontFamily.fontFamily,
                    fontSize = (baseFontSize.value * 0.88f).sp,
                    letterSpacing = 0.4.sp
                ),
                color = readerTheme.secondaryTextColor,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 6.dp)
            )
        }

        // 3. Continuous Prose Paragraph Text
        val annotatedString = remember(
            paragraph,
            selectedVerses,
            flashVerse,
            memorizedVerses,
            activeTtsVerse,
            otQuotes,
            showParagraphMarks,
            showVerseNumbers,
            showCrossRefMarkers,
            crossRefCounts,
            bionicReading,
            readerTheme,
            readerFontFamily,
            language
        ) {
            buildAnnotatedString {
                paragraph.verses.forEachIndexed { vIndex, verse ->
                    val vNum = verse.verse
                    val isSelected = vNum in selectedVerses
                    val isFlashing = vNum == flashVerse
                    val isMemorized = vNum in memorizedVerses
                    val isSpeaking = vNum == activeTtsVerse
                    val hasCrossRefs = (crossRefCounts[vNum] ?: 0) > 0
                    val isOtQuote = vNum in otQuotes

                    val rawVerseText = if (language == BibleLanguage.TELUGU) {
                        verse.textTe ?: verse.textEn ?: ""
                    } else {
                        verse.textEn ?: verse.textTe ?: ""
                    }

                    var text = rawVerseText
                    // Strip <b> tags that were processed for headings
                    text = text.replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
                    // Clean HTML line breaks and footnotes
                    text = text.replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
                    text = text.replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
                    text = text.replace(Regex("<sup\\b[^>]*>.*?</sup>", RegexOption.IGNORE_CASE), "")

                    // Strip Psalm title if it is prefixed in verse 1
                    if (paragraph.psalmTitle != null && vNum == 1) {
                        val trimmed = text.trim()
                        if (trimmed.startsWith(paragraph.psalmTitle)) {
                            text = trimmed.substring(paragraph.psalmTitle.length).trim()
                        }
                    }

                    text = text.trim()
                    if (text.isEmpty()) return@forEachIndexed

                    val verseStart = length

                    // Pilcrow mark ¶
                    if (vIndex == 0 && paragraph.isParagraphStart && vNum > 1 && showParagraphMarks) {
                        withStyle(
                            SpanStyle(
                                color = readerTheme.accentColor.copy(alpha = 0.45f),
                                fontSize = (baseFontSize.value * 0.82f).sp,
                                fontWeight = FontWeight.Normal
                            )
                        ) {
                            append("¶ ")
                        }
                    }

                    // Superscript Verse Number
                    if (showVerseNumbers) {
                        val numColor = if (vIndex == 0 && paragraph.isParagraphStart && vNum > 1) {
                            readerTheme.textColor
                        } else {
                            readerTheme.secondaryTextColor.copy(alpha = 0.8f)
                        }
                        withStyle(
                            SpanStyle(
                                fontSize = verseNumSize,
                                baselineShift = BaselineShift.Superscript,
                                fontWeight = if (vIndex == 0 && paragraph.isParagraphStart && vNum > 1) FontWeight.Bold else FontWeight.Normal,
                                color = numColor
                            )
                        ) {
                            append("$vNum ")
                        }
                    }

                    // Format Verse Body (translator <i>, OT quotes, bionic)
                    appendFormattedVerseText(
                        rawText = text,
                        isOtQuote = isOtQuote,
                        bionicReading = bionicReading,
                        defaultColor = readerTheme.textColor
                    )

                    // Cross Reference Marker ✻
                    if (hasCrossRefs && showCrossRefMarkers) {
                        val xrefStart = length
                        withStyle(
                            SpanStyle(
                                fontSize = xrefNumSize,
                                baselineShift = BaselineShift.Superscript,
                                fontWeight = FontWeight.Bold,
                                color = RemoraGold
                            )
                        ) {
                            append("✻")
                        }
                        addStringAnnotation(
                            tag = "XREF",
                            annotation = "$vNum",
                            start = xrefStart,
                            end = length
                        )
                    }

                    // Trailing space between verses
                    append(" ")
                    val verseEnd = length

                    // Background highlighting: flash (green) > selected (accent) > memorized (gold) > speaking
                    val bgColor = when {
                        isFlashing -> Color(0xFF4CAF50).copy(alpha = 0.35f)
                        isSelected -> readerTheme.accentColor.copy(alpha = 0.22f)
                        isMemorized -> RemoraGold.copy(alpha = 0.25f)
                        isSpeaking -> readerTheme.accentColor.copy(alpha = 0.15f)
                        else -> Color.Transparent
                    }

                    if (bgColor != Color.Transparent) {
                        addStyle(
                            style = SpanStyle(background = bgColor),
                            start = verseStart,
                            end = verseEnd
                        )
                    }

                    // String annotation for clicking/selecting this verse
                    addStringAnnotation(
                        tag = "VERSE",
                        annotation = "$vNum",
                        start = verseStart,
                        end = verseEnd
                    )
                }
            }
        }

        var textLayoutResult by remember { mutableStateOf<TextLayoutResult?>(null) }

        Text(
            text = annotatedString,
            fontSize = baseFontSize,
            lineHeight = baseLineHeight,
            fontFamily = readerFontFamily.fontFamily,
            color = readerTheme.textColor,
            onTextLayout = { textLayoutResult = it },
            modifier = Modifier
                .fillMaxWidth()
                .pointerInput(annotatedString) {
                    detectTapGestures { offset ->
                        textLayoutResult?.let { layout ->
                            val charOffset = layout.getOffsetForPosition(offset)

                            // 1. Check if tapped on XREF
                            val xrefAnn = annotatedString
                                .getStringAnnotations("XREF", charOffset, charOffset)
                                .firstOrNull()
                            if (xrefAnn != null) {
                                xrefAnn.item.toIntOrNull()?.let { onCrossRefClick(it) }
                                return@detectTapGestures
                            }

                            // 2. Check if tapped on VERSE
                            val verseAnn = annotatedString
                                .getStringAnnotations("VERSE", charOffset, charOffset)
                                .firstOrNull()
                            if (verseAnn != null) {
                                verseAnn.item.toIntOrNull()?.let { onVerseClick(it) }
                                return@detectTapGestures
                            }

                            // 3. Tapped on whitespace/margins
                            onEmptySpaceClick()
                        } ?: onEmptySpaceClick()
                    }
                }
        )
    }
}

private fun AnnotatedString.Builder.appendFormattedVerseText(
    rawText: String,
    isOtQuote: Boolean,
    bionicReading: Boolean,
    defaultColor: Color
) {
    // Process translator supplied words inside <i ...>...</i>
    val iRegex = Regex("<i\\b[^>]*>([\\s\\S]*?)</i>", RegexOption.IGNORE_CASE)
    var cursor = 0

    val matches = iRegex.findAll(rawText).toList()
    if (matches.isEmpty()) {
        appendVerseStringSegment(rawText, isOtQuote, bionicReading, isItalicTranslator = false, defaultColor)
    } else {
        for (match in matches) {
            val start = match.range.first
            val end = match.range.last + 1

            if (start > cursor) {
                val nonItalic = rawText.substring(cursor, start)
                appendVerseStringSegment(nonItalic, isOtQuote, bionicReading, isItalicTranslator = false, defaultColor)
            }

            val italicContent = match.groupValues[1]
            appendVerseStringSegment(italicContent, isOtQuote, bionicReading, isItalicTranslator = true, defaultColor)
            cursor = end
        }

        if (cursor < rawText.length) {
            val trailing = rawText.substring(cursor)
            appendVerseStringSegment(trailing, isOtQuote, bionicReading, isItalicTranslator = false, defaultColor)
        }
    }
}

private fun AnnotatedString.Builder.appendVerseStringSegment(
    segment: String,
    isOtQuote: Boolean,
    bionicReading: Boolean,
    isItalicTranslator: Boolean,
    defaultColor: Color
) {
    // Strip any lingering HTML tags so raw tags like <i>, </i>, <S>, etc. never leak into UI
    val clean = segment.replace(Regex("<[^>]+>"), "")
    if (clean.isEmpty()) return

    val textToRender = if (isOtQuote) {
        // Uppercase text inside quotes or OT citation
        clean.uppercase()
    } else {
        clean
    }

    val baseStyle = if (isItalicTranslator) {
        SpanStyle(fontStyle = FontStyle.Italic, color = defaultColor.copy(alpha = 0.65f))
    } else {
        SpanStyle()
    }

    if (!bionicReading) {
        withStyle(baseStyle) {
            append(textToRender)
        }
    } else {
        // Bionic Reading: bold first half of words
        val wordRegex = Regex("([a-zA-Z\\u00C0-\\u024F]+)")
        var wCursor = 0
        for (m in wordRegex.findAll(textToRender)) {
            val wStart = m.range.first
            val wEnd = m.range.last + 1
            if (wStart > wCursor) {
                withStyle(baseStyle) {
                    append(textToRender.substring(wCursor, wStart))
                }
            }

            val word = m.value
            val boldLen = when {
                word.length <= 1 -> word.length
                word.length <= 3 -> 1
                else -> Math.ceil(word.length / 2.0).toInt()
            }

            withStyle(baseStyle.copy(fontWeight = FontWeight.Bold)) {
                append(word.substring(0, boldLen))
            }
            withStyle(baseStyle.copy(fontWeight = FontWeight.Normal)) {
                append(word.substring(boldLen))
            }

            wCursor = wEnd
        }

        if (wCursor < textToRender.length) {
            withStyle(baseStyle) {
                append(textToRender.substring(wCursor))
            }
        }
    }
}
