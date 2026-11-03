package com.example.telugubible.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.example.telugubible.data.model.AppSettings
import com.example.telugubible.data.model.BibleTranslation
import com.example.telugubible.theme.RemoraColors
import com.example.telugubible.ui.reader.BionicIntensity
import com.example.telugubible.ui.reader.FontSizeScale
import com.example.telugubible.ui.reader.LineSpacing
import com.example.telugubible.ui.reader.ReaderFontFamily

enum class SettingsCategory(val label: String) {
    APPEARANCE("Appearance"), READING("Reading"), PRACTICE("Practice"), DATA("Data")
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun SettingsCategoryTabs(selected: SettingsCategory, onSelect: (SettingsCategory) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SettingsCategory.entries.forEach { category ->
            FilterChip(selected = selected == category, onClick = { onSelect(category) },
                label = { Text(category.label) }, modifier = Modifier.heightIn(min = 48.dp))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChoiceGroup(title: String, options: List<Pair<String, String>>, selected: String,
                        onSelect: (String) -> Unit, swatches: Map<String, Color> = emptyMap(), description: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall)
        if (description != null) Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            options.forEach { (key, label) ->
                FilterChip(selected = selected.equals(key, ignoreCase = true), onClick = { onSelect(key) },
                    label = { Text(label) }, modifier = Modifier.heightIn(min = 48.dp),
                    leadingIcon = swatches[key]?.let { color -> @Composable {
                        Box(Modifier.size(20.dp).background(color, CircleShape).border(1.dp, MaterialTheme.colorScheme.outline, CircleShape))
                    } })
            }
        }
    }
}

@Composable
private fun SettingSwitch(title: String, description: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).toggleable(value = checked, role = Role.Switch, onValueChange = onChange)
        .padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = null)
    }
}

internal fun readingPreset(settings: AppSettings): String = when {
    settings.showSectionHeadings && settings.showVerseNumbers && settings.showParagraphMarks && settings.showCrossRefMarkers -> "study"
    settings.showSectionHeadings && settings.showVerseNumbers && !settings.showParagraphMarks && !settings.showCrossRefMarkers -> "reading"
    !settings.showSectionHeadings && !settings.showVerseNumbers && !settings.showParagraphMarks && !settings.showCrossRefMarkers -> "clean"
    else -> "custom"
}

@Composable
internal fun SettingsCategoryContent(
    category: SettingsCategory,
    settings: AppSettings,
    onChange: ((AppSettings) -> AppSettings) -> Unit,
    onPreset: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp), modifier = Modifier.fillMaxWidth()) {
        Text(category.label, style = MaterialTheme.typography.headlineSmall)
        when (category) {
            SettingsCategory.APPEARANCE -> {
                val theme = when (settings.theme.lowercase().trim()) {
                    "white", "paper" -> "white"
                    "sepia" -> "sepia"
                    "dark", "walnut", "umber" -> "dark"
                    else -> "black"
                }
                ChoiceGroup("Theme", listOf("white" to "Paper", "sepia" to "Sepia", "dark" to "Walnut", "black" to "Midnight"), theme,
                    { value -> onChange { it.copy(theme = value) } }, mapOf("white" to RemoraColors.Paper.background,
                        "sepia" to RemoraColors.Sepia.background, "dark" to RemoraColors.Walnut.background, "black" to RemoraColors.Midnight.background))
                Text("Interface text follows your device's text-size setting. Scripture size is under Reading.",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            SettingsCategory.READING -> {
                ChoiceGroup("Scripture size", FontSizeScale.entries.map { it.multiplier.toString() to it.label },
                    FontSizeScale.fromMultiplier(settings.fontSize).multiplier.toString(), { value -> onChange { it.copy(fontSize = value.toFloat()) } },
                    description = "Used by the Reader and practice Immerse.")
                ChoiceGroup("Typeface", ReaderFontFamily.entries.map { it.key to it.label }, ReaderFontFamily.fromKey(settings.fontFamily).key,
                    { value -> onChange { it.copy(fontFamily = value) } })
                ChoiceGroup("Line spacing", LineSpacing.entries.map { it.key to it.label }, LineSpacing.fromKey(settings.lineSpacing).key,
                    { value -> onChange { it.copy(lineSpacing = value) } })
                SettingSwitch("Bionic reading", "Emphasize the beginning of words in supported reading views.", settings.bionicReading,
                    { value -> onChange { it.copy(bionicReading = value) } })
                if (settings.bionicReading) ChoiceGroup("Bionic intensity", BionicIntensity.entries.map { it.key to it.label },
                    BionicIntensity.fromKey(settings.bionicIntensity).key, { value -> onChange { it.copy(bionicIntensity = value) } })
                ChoiceGroup("Chapter display", listOf("study" to "Study", "reading" to "Reading", "clean" to "Clean"), readingPreset(settings), onPreset,
                    description = if (readingPreset(settings) == "custom") "Custom settings" else null)
                SettingSwitch("Section headings", "Show section headings in the Reader.", settings.showSectionHeadings, { value -> onChange { it.copy(showSectionHeadings = value) } })
                SettingSwitch("Verse numbers", "Show verse numbers in the Reader.", settings.showVerseNumbers, { value -> onChange { it.copy(showVerseNumbers = value) } })
                SettingSwitch("Paragraph marks", "Show paragraph marks in the Reader.", settings.showParagraphMarks, { value -> onChange { it.copy(showParagraphMarks = value) } })
                SettingSwitch("Cross-reference marks", "Show cross-reference marks in the Reader.", settings.showCrossRefMarkers, { value -> onChange { it.copy(showCrossRefMarkers = value) } })
                val translation = BibleTranslation.normalizeCode(settings.bibleVersion)
                ChoiceGroup("Default translation", BibleTranslation.ALL.map { it.code to it.shortLabel }, translation,
                    { value -> onChange { it.copy(bibleVersion = value) } }, description = if (BibleTranslation.ALL.none { it.code == translation })
                        "Saved translation: ${settings.bibleVersion}. Choose a listed translation to change it."
                    else "The Bible text used for reading; it does not change the app language.")
                ChoiceGroup("Chapter theme visibility", listOf("tap" to "Tap to reveal", "always" to "Always show", "never" to "Never show"), settings.anchorReveal,
                    { value -> onChange { it.copy(anchorReveal = value) } })
            }
            SettingsCategory.PRACTICE -> {
                SettingSwitch("Recall masking", "Hide sentences in practice Immerse until you reveal them.", settings.recallMasking,
                    { value -> onChange { it.copy(recallMasking = value) } })
                val targets = (listOf(0, 1, 3, 5) + settings.dailyChapterTarget).distinct().sorted()
                ChoiceGroup("New chapters per daily session", targets.map { it.toString() to it.toString() }, settings.dailyChapterTarget.toString(),
                    { value -> onChange { it.copy(dailyChapterTarget = value.toInt()) } })
                SettingSwitch("Text-to-speech preference", "Saved for compatibility; this switch is not currently applied to playback.", settings.ttsEnabled,
                    { value -> onChange { it.copy(ttsEnabled = value) } })
                SettingSwitch("Include chapters in streak", "Saved for compatibility; this switch is not currently applied to streaks.", settings.streakIncludesChapters,
                    { value -> onChange { it.copy(streakIncludesChapters = value) } })
            }
            SettingsCategory.DATA -> Unit
        }
    }
}
