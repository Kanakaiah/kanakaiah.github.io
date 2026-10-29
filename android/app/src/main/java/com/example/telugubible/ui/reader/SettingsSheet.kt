package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.RemoraAccent
import com.example.telugubible.theme.RemoraTextMuted
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.theme.RemoraTextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(
    fontSizeScale: FontSizeScale,
    readerFontFamily: ReaderFontFamily,
    lineSpacing: LineSpacing,
    readerTheme: ReaderTheme,
    bionicReading: Boolean,
    bionicIntensity: BionicIntensity,
    showVerseNumbers: Boolean,
    onFontSizeChange: (FontSizeScale) -> Unit,
    onFontFamilyChange: (ReaderFontFamily) -> Unit,
    onLineSpacingChange: (LineSpacing) -> Unit,
    onThemeChange: (ReaderTheme) -> Unit,
    onBionicReadingChange: (Boolean) -> Unit,
    onBionicIntensityChange: (BionicIntensity) -> Unit,
    onShowVerseNumbersChange: (Boolean) -> Unit,
    onReset: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Color(0xFF14120E),
        tonalElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp)
                .padding(top = 4.dp, bottom = 36.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            // Header: "Reading settings" + "Reset"
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Reading settings",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Serif,
                    color = RemoraTextPrimary,
                    letterSpacing = (-0.3).sp
                )
                Text(
                    text = "Reset",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraAccent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onReset() }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }

            // Shared font size scales & smooth slider position state
            val allScales = remember {
                listOf(FontSizeScale.XS, FontSizeScale.S, FontSizeScale.M, FontSizeScale.L, FontSizeScale.XL)
            }
            val currentIndex = remember(fontSizeScale) {
                allScales.indexOf(fontSizeScale).coerceAtLeast(0)
            }
            var sliderPosition by remember(fontSizeScale) {
                mutableFloatStateOf(currentIndex.toFloat())
            }

            LaunchedEffect(currentIndex) {
                if (Math.abs(sliderPosition - currentIndex) > 0.05f) {
                    sliderPosition = currentIndex.toFloat()
                }
            }

            val currentSpSize = remember(sliderPosition) {
                val baseSizes = listOf(15f, 18f, 23f, 29f, 36f)
                val pos = sliderPosition.coerceIn(0f, 4f)
                val lower = pos.toInt().coerceIn(0, 3)
                val upper = (lower + 1).coerceIn(0, 4)
                val fraction = pos - lower
                baseSizes[lower] + fraction * (baseSizes[upper] - baseSizes[lower])
            }

            // Live Interactive Preview Card
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = when (readerTheme) {
                    ReaderTheme.PAPER -> Color(0xFFF8FAFC)
                    ReaderTheme.SEPIA -> Color(0xFFF0E3C8)
                    ReaderTheme.DARK -> Color(0xFF181512)
                    ReaderTheme.OBSIDIAN -> Color(0xFF0A0908)
                },
                border = BorderStroke(1.dp, Color(0xFF2C261F)),
                modifier = Modifier.fillMaxWidth()
            ) {
                val previewSample = remember(
                    currentSpSize,
                    readerFontFamily,
                    lineSpacing,
                    readerTheme,
                    bionicReading,
                    bionicIntensity,
                    showVerseNumbers
                ) {
                    buildAnnotatedString {
                        val baseFontSize = currentSpSize.sp
                        val verseNumSize = (baseFontSize.value * 0.58f).sp

                        if (showVerseNumbers) {
                            withStyle(
                                SpanStyle(
                                    fontSize = verseNumSize,
                                    baselineShift = BaselineShift.Superscript,
                                    color = readerTheme.secondaryTextColor
                                )
                            ) {
                                append("12 ")
                            }
                        }

                        val rawSample = "Sample text stands in for scripture so the layout can be judged."
                        if (!bionicReading) {
                            withStyle(SpanStyle(color = readerTheme.textColor)) {
                                append(rawSample)
                            }
                        } else {
                            val ratio = bionicIntensity.ratio
                            val words = rawSample.split(" ")
                            words.forEachIndexed { idx, word ->
                                val boldLen = Math.max(1, Math.ceil(word.length * ratio.toDouble()).toInt()).coerceAtMost(word.length)
                                withStyle(SpanStyle(color = readerTheme.textColor, fontWeight = FontWeight.Bold)) {
                                    append(word.substring(0, boldLen))
                                }
                                withStyle(SpanStyle(color = readerTheme.textColor, fontWeight = FontWeight.Normal)) {
                                    append(word.substring(boldLen))
                                }
                                if (idx < words.size - 1) append(" ")
                            }
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 18.dp)
                ) {
                    Text(
                        text = previewSample,
                        fontSize = currentSpSize.sp,
                        fontFamily = readerFontFamily.fontFamily,
                        lineHeight = (currentSpSize * 1.55f * lineSpacing.multiplier).sp
                    )
                }
            }

            // 1. TEXT SIZE
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "TEXT SIZE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = Color(0xFFB5A995)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "A",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .clickable {
                                val newIdx = (Math.round(sliderPosition) - 1).coerceAtLeast(0)
                                sliderPosition = newIdx.toFloat()
                                onFontSizeChange(allScales[newIdx])
                            }
                            .padding(4.dp)
                    )

                    Slider(
                        value = sliderPosition,
                        onValueChange = { newVal ->
                            sliderPosition = newVal
                            val idx = Math.round(newVal).coerceIn(0, allScales.size - 1)
                            if (allScales[idx] != fontSizeScale) {
                                onFontSizeChange(allScales[idx])
                            }
                        },
                        onValueChangeFinished = {
                            val targetIdx = Math.round(sliderPosition).coerceIn(0, allScales.size - 1)
                            sliderPosition = targetIdx.toFloat()
                            onFontSizeChange(allScales[targetIdx])
                        },
                        valueRange = 0f..(allScales.size - 1).toFloat(),
                        modifier = Modifier.weight(1f),
                        colors = SliderDefaults.colors(
                            thumbColor = RemoraAccent,
                            activeTrackColor = RemoraAccent,
                            inactiveTrackColor = Color(0xFF332D24),
                            activeTickColor = Color.Transparent,
                            inactiveTickColor = Color.Transparent
                        )
                    )

                    Text(
                        text = "A",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary,
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .clickable {
                                val newIdx = (Math.round(sliderPosition) + 1).coerceAtMost(allScales.size - 1)
                                sliderPosition = newIdx.toFloat()
                                onFontSizeChange(allScales[newIdx])
                            }
                            .padding(4.dp)
                    )
                }
            }

            // 2. FONT
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "FONT",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = Color(0xFFB5A995)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        ReaderFontFamily.INTER to "Inter",
                        ReaderFontFamily.SYSTEM to "System",
                        ReaderFontFamily.ROBOTO to "Roboto",
                        ReaderFontFamily.OPEN_SANS to "Open Sans"
                    ).forEach { (font, label) ->
                        val isSelected = readerFontFamily == font
                        PillButton(
                            text = label,
                            isSelected = isSelected,
                            onClick = { onFontFamilyChange(font) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // 3. LINE SPACING
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "LINE SPACING",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = Color(0xFFB5A995)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    listOf(
                        LineSpacing.TIGHT to "Tight",
                        LineSpacing.NORMAL to "Normal",
                        LineSpacing.ROOMY to "Roomy"
                    ).forEach { (spacing, label) ->
                        val isSelected = lineSpacing == spacing
                        PillButton(
                            text = label,
                            isSelected = isSelected,
                            onClick = { onLineSpacingChange(spacing) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // 4. THEME
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "THEME",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = Color(0xFFB5A995)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    listOf(
                        ReaderTheme.DARK to "Dark",
                        ReaderTheme.OBSIDIAN to "Black",
                        ReaderTheme.SEPIA to "Sepia",
                        ReaderTheme.PAPER to "Light"
                    ).forEach { (theme, label) ->
                        val isSelected = readerTheme == theme
                        PillButton(
                            text = label,
                            isSelected = isSelected,
                            onClick = { onThemeChange(theme) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // 5. Bionic reading
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onBionicReadingChange(!bionicReading) }
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Bionic reading",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFF5F2EB)
                    )

                    CheckboxBox(isChecked = bionicReading)
                }

                // Intensity Pills (Light, Medium, Strong)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    listOf(
                        BionicIntensity.LIGHT to "Light",
                        BionicIntensity.MEDIUM to "Medium",
                        BionicIntensity.STRONG to "Strong"
                    ).forEach { (intensity, label) ->
                        val isSelected = bionicReading && bionicIntensity == intensity
                        PillButton(
                            text = label,
                            isSelected = isSelected,
                            onClick = {
                                if (!bionicReading) onBionicReadingChange(true)
                                onBionicIntensityChange(intensity)
                            },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // 6. Verse numbers
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onShowVerseNumbersChange(!showVerseNumbers) }
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Verse numbers",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFFF5F2EB)
                )

                CheckboxBox(isChecked = showVerseNumbers)
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 7. Done Button
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = RemoraAccent,
                    contentColor = Color(0xFF14120E)
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text(
                    text = "Done",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF14120E)
                )
            }
        }
    }
}

@Composable
private fun PillButton(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(22.dp),
        color = if (isSelected) RemoraAccent else Color(0xFF1C1813),
        border = BorderStroke(1.dp, if (isSelected) RemoraAccent else Color(0xFF332D24)),
        modifier = modifier.height(40.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = text,
                fontSize = 13.5.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) Color(0xFF14120E) else Color(0xFFF5F2EB)
            )
        }
    }
}

@Composable
private fun CheckboxBox(isChecked: Boolean) {
    Box(
        modifier = Modifier
            .size(22.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(if (isChecked) RemoraAccent else Color.Transparent)
            .border(
                width = 1.dp,
                color = if (isChecked) RemoraAccent else Color(0xFF6E6455),
                shape = RoundedCornerShape(4.dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        if (isChecked) {
            Icon(
                Icons.Default.Check,
                contentDescription = null,
                tint = Color(0xFF14120E),
                modifier = Modifier.size(15.dp)
            )
        }
    }
}
