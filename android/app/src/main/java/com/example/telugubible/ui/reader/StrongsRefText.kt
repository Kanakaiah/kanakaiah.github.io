package com.example.telugubible.ui.reader

import androidx.compose.foundation.text.ClickableText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.RemoraAccent
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.util.StrongsParser

@Composable
fun StrongsRefText(
    text: String,
    onRefClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    color: Color = RemoraTextPrimary,
    refColor: Color = RemoraAccent,
    fontSize: TextUnit = 14.sp,
    lineHeight: TextUnit = 20.sp
) {
    val annotatedString = remember(text, color, refColor) {
        buildRefAnnotatedString(text, color, refColor)
    }

    ClickableText(
        text = annotatedString,
        modifier = modifier,
        style = TextStyle(
            color = color,
            fontSize = fontSize,
            lineHeight = lineHeight
        ),
        onClick = { offset ->
            annotatedString.getStringAnnotations(tag = "STRONGS_REF", start = offset, end = offset)
                .firstOrNull()?.let { annotation ->
                    onRefClick(annotation.item)
                }
        }
    )
}

fun buildRefAnnotatedString(
    text: String,
    normalColor: Color,
    refColor: Color
): AnnotatedString {
    val builder = AnnotatedString.Builder()
    val regex = Regex("([GHgh]0*\\d+)(\\s*\\([^)]*\\))?")
    var lastIndex = 0

    for (m in regex.findAll(text)) {
        if (m.range.first > lastIndex) {
            builder.append(text.substring(lastIndex, m.range.first))
        }

        val fullMatch = m.value
        val rawRef = m.groupValues[1]
        val normalizedRef = StrongsParser.normalizeStrongsRef(rawRef)

        val spanStart = builder.length
        builder.pushStringAnnotation(tag = "STRONGS_REF", annotation = normalizedRef)
        builder.append(fullMatch)
        builder.addStyle(
            SpanStyle(
                color = refColor,
                fontWeight = FontWeight.Bold,
                textDecoration = TextDecoration.Underline
            ),
            spanStart,
            spanStart + fullMatch.length
        )
        builder.pop()

        lastIndex = m.range.last + 1
    }

    if (lastIndex < text.length) {
        builder.append(text.substring(lastIndex))
    }

    return builder.toAnnotatedString()
}
