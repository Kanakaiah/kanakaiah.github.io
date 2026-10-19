package com.example.telugubible.ui.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import com.example.telugubible.util.AttemptScore
import com.example.telugubible.util.CueLevel
import com.example.telugubible.util.CueUtils

@Composable
fun TypingMode(
    text: String,
    onAttempt: (accuracy: Int, committed: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var input by remember(text) { mutableStateOf("") }
    var isChecked by remember(text) { mutableStateOf(false) }
    var score by remember(text) { mutableStateOf<AttemptScore?>(null) }

    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        if (!isChecked) {
            // First-letter cue prompt
            val firstLetterCue = remember(text) {
                CueUtils.cueString(text, CueLevel.FIRST_LETTERS)
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = RemoraCardBgElevated,
                border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "FIRST-LETTER CUE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = RemoraTextMuted,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    Text(
                        text = firstLetterCue,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 0.5.sp,
                        color = RemoraTextSecondary
                    )
                }
            }

            // Text input area
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                placeholder = {
                    Text(
                        text = "Type the verse from memory…",
                        color = RemoraTextMuted
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = RemoraCardBg,
                    unfocusedContainerColor = RemoraCardBg,
                    focusedBorderColor = RemoraAccent,
                    unfocusedBorderColor = RemoraCardBorder,
                    focusedTextColor = RemoraTextPrimary,
                    unfocusedTextColor = RemoraTextPrimary,
                    cursorColor = RemoraAccent
                ),
                shape = RoundedCornerShape(8.dp),
                textStyle = LocalTextStyle.current.copy(
                    fontSize = 16.sp,
                    lineHeight = 22.sp,
                    color = RemoraTextPrimary
                ),
                minLines = 4,
                maxLines = 8,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 130.dp)
            )

            // Check button
            Button(
                onClick = {
                    if (input.isNotBlank()) {
                        val computed = CueUtils.scoreAttempt(text, input)
                        score = computed
                        isChecked = true
                        onAttempt(computed.accuracy, input)
                    }
                },
                enabled = input.isNotBlank(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = RemoraAccent,
                    disabledContainerColor = RemoraAccent.copy(alpha = 0.4f)
                ),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text(
                    text = "Check",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            Text(
                text = "You'll see the verse once you've committed to an answer",
                fontSize = 11.sp,
                color = RemoraTextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp)
            )
        } else {
            // Post-check state
            val currentScore = score
            if (currentScore != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${currentScore.matched} of ${currentScore.total} words matched",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = "${currentScore.accuracy}%",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (currentScore.accuracy >= 90) GradeEasy
                        else if (currentScore.accuracy >= 70) GradeGood
                        else GradeBlank
                    )
                }

                // Word-by-word diff
                val annotatedDiff = remember(currentScore) {
                    buildAnnotatedString {
                        currentScore.words.forEach { wordAttempt ->
                            if (wordAttempt.ok) {
                                withStyle(SpanStyle(color = RemoraTextPrimary)) {
                                    append(wordAttempt.word)
                                }
                            } else {
                                withStyle(
                                    SpanStyle(
                                        color = Color(0xFFEF4444),
                                        textDecoration = TextDecoration.Underline
                                    )
                                ) {
                                    append(wordAttempt.word)
                                }
                            }
                            append(" ")
                        }
                    }
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RemoraCardBg,
                    border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = annotatedDiff,
                        fontSize = 17.sp,
                        lineHeight = 26.sp,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                // What you wrote card
                if (input.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = RemoraCardBgElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "WHAT YOU WROTE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = RemoraTextMuted,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            Text(
                                text = input,
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                                color = RemoraTextSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}
