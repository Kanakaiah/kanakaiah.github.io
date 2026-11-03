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
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
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
    var advancedExpanded by remember { mutableStateOf(false) }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow
    ) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Reading settings", style = MaterialTheme.typography.headlineSmall)
            Text("These settings apply to reading and Immerse. The palette also changes the app theme.",
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Surface(shape = RoundedCornerShape(20.dp), color = readerTheme.backgroundColor) {
                val sample = buildAnnotatedString {
                    if (showVerseNumbers) withStyle(SpanStyle(baselineShift = BaselineShift.Superscript,
                        fontSize = (fontSizeScale.spSize * 0.6f).sp)) { append("12 ") }
                    "Sample text for your reading preferences.".split(" ").forEachIndexed { index, word ->
                        if (index > 0) append(" ")
                        val boldLength = if (bionicReading) kotlin.math.ceil(word.length * bionicIntensity.ratio).toInt().coerceIn(1, word.length) else 0
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(word.take(boldLength)) }
                        append(word.drop(boldLength))
                    }
                }
                Text(sample, modifier = Modifier.padding(20.dp), fontFamily = readerFontFamily.fontFamily,
                    fontSize = fontSizeScale.spSize.sp, lineHeight = (fontSizeScale.spSize * lineSpacing.multiplier).sp,
                    color = readerTheme.textColor)
            }
            ReadingChoiceGroup("Scripture text size", FontSizeScale.entries.toList(), fontSizeScale, { it.label }, onFontSizeChange)
            Text("Interface text size follows your device settings.", style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            ReadingChoiceGroup("Typeface", ReaderFontFamily.entries.toList(), readerFontFamily, { it.label }, onFontFamilyChange)
            ReadingChoiceGroup("Line spacing", LineSpacing.entries.toList(), lineSpacing, { it.label }, onLineSpacingChange)
            ReadingChoiceGroup("Palette", ReaderTheme.entries.toList(), readerTheme, { it.label }, onThemeChange)
            ReadingSwitch("Verse numbers", showVerseNumbers, onShowVerseNumbersChange)
            TextButton(onClick = { advancedExpanded = !advancedExpanded }) {
                Text(if (advancedExpanded) "Hide advanced reading options" else "Advanced reading options")
                Spacer(Modifier.width(8.dp))
                Icon(if (advancedExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, contentDescription = null)
            }
            if (advancedExpanded) {
                ReadingSwitch("Bionic reading", bionicReading, onBionicReadingChange)
                if (bionicReading) {
                    ReadingChoiceGroup("Bionic intensity", BionicIntensity.entries.toList(), bionicIntensity, { it.label }, onBionicIntensityChange)
                }
            }
            Text("Reset restores text size, typeface, spacing, palette, bionic reading and verse numbers.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onReset) { Text("Reset reading settings") }
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Done") }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun <T> ReadingChoiceGroup(title: String, choices: List<T>, selected: T, label: (T) -> String, onSelect: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            choices.forEach { choice ->
                FilterChip(selected = choice == selected, onClick = { onSelect(choice) }, label = { Text(label(choice)) })
            }
        }
    }
}

@Composable
private fun ReadingSwitch(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onChange,
            modifier = Modifier.semantics { contentDescription = label })
    }
}
