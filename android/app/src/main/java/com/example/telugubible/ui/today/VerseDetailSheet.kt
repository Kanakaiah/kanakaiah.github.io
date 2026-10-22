package com.example.telugubible.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.model.Topic
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.theme.RemoraAccent
import com.example.telugubible.theme.RemoraAccentLight
import com.example.telugubible.theme.RemoraCardBg
import com.example.telugubible.theme.RemoraCardBgElevated
import com.example.telugubible.theme.RemoraCardBorder
import com.example.telugubible.theme.RemoraDanger
import com.example.telugubible.theme.RemoraSurface
import com.example.telugubible.theme.RemoraTextMuted
import com.example.telugubible.theme.RemoraTextPrimary
import com.example.telugubible.theme.RemoraTextSecondary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.min
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VerseDetailSheet(
    verse: UserMemoryVerse,
    displayLanguage: DisplayLanguage,
    hasPrev: Boolean,
    hasNext: Boolean,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onToggleLanguage: () -> Unit,
    onDismiss: () -> Unit,
    onPractice: () -> Unit,
    onImmerse: () -> Unit = {},
    onReadInChapter: () -> Unit,
    onDelete: () -> Unit,
    topics: List<Topic> = emptyList(),
    onToggleTopic: (String) -> Unit = {},
    onCreateTopicForVerse: (String) -> Unit = {}
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var confirmingDelete by remember { mutableStateOf(false) }
    var isAddingGroup by remember { mutableStateOf(false) }
    var newGroupName by remember { mutableStateOf("") }

    val masteryPct = min(100, ((verse.repetition.toFloat() / 6f) * 100f).roundToInt())

    val now = System.currentTimeMillis()
    val reviewStr = remember(verse.nextDueDate) {
        val diffDays = ((verse.nextDueDate - now) / (1000 * 60 * 60 * 24)).toInt()
        when {
            verse.nextDueDate <= now -> "Due Today"
            diffDays == 1 -> "Tomorrow"
            diffDays < 7 -> "in $diffDays days"
            else -> SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(Date(verse.nextDueDate))
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = RemoraSurface,
        dragHandle = null,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // 1. Navigation Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left side: Prev / Next pagination arrows
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onPrev,
                        enabled = hasPrev,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Previous Verse",
                            tint = if (hasPrev) RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.3f),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(4.dp))

                    IconButton(
                        onClick = onNext,
                        enabled = hasNext,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = "Next Verse",
                            tint = if (hasNext) RemoraTextSecondary else RemoraTextMuted.copy(alpha = 0.3f),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // Right side: Close (X)
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = RemoraTextSecondary,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 2. Title & Translation Toggle Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = verse.fullRef(displayLanguage == DisplayLanguage.ENGLISH),
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = if (displayLanguage == DisplayLanguage.TELUGU) verse.bookNameEn else verse.bookNameTe,
                        fontSize = 13.sp,
                        color = RemoraTextSecondary
                    )
                }

                // Translation Pill with swap icon
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = RemoraCardBgElevated,
                    border = BorderStroke(1.dp, RemoraCardBorder),
                    modifier = Modifier.clickable { onToggleLanguage() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (displayLanguage == DisplayLanguage.ENGLISH) "BSB (EN)" else "IRV (TE)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccentLight
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Default.SwapHoriz,
                            contentDescription = "Switch translation",
                            tint = RemoraAccent,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // 3. Scripture Text
            val rawText = if (displayLanguage == DisplayLanguage.TELUGU) {
                verse.textTe ?: verse.textEn ?: "వచన పాఠం అందుబాటులో లేదు"
            } else {
                verse.textEn ?: verse.textTe ?: "Scripture text unavailable"
            }
            val displayText = rawText
                .replace(Regex("<b[^>]*>[\\s\\S]*?</b>", RegexOption.IGNORE_CASE), "")
                .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), " ")
                .replace(Regex("<S>\\d+</S>", RegexOption.IGNORE_CASE), "")
                .replace(Regex("<[^>]+>"), "")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .trim()

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = displayText,
                    fontSize = 17.sp,
                    lineHeight = 26.sp,
                    fontFamily = FontFamily.Serif,
                    color = RemoraTextPrimary,
                    modifier = Modifier.padding(18.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 3.5 Groups Section (Matching React's VerseDetailModal)
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "GROUPS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = RemoraTextMuted
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        for (topic in topics) {
                            val isActive = topic.id in verse.topicIds
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (isActive) RemoraAccent.copy(alpha = 0.15f) else Color.Transparent,
                                border = BorderStroke(
                                    1.dp,
                                    if (isActive) RemoraAccent.copy(alpha = 0.5f) else RemoraCardBorder
                                ),
                                modifier = Modifier.clickable { onToggleTopic(topic.id) }
                            ) {
                                Text(
                                    text = topic.name,
                                    fontSize = 12.sp,
                                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isActive) RemoraAccentLight else RemoraTextSecondary,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                )
                            }
                        }

                        if (isAddingGroup) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                OutlinedTextField(
                                    value = newGroupName,
                                    onValueChange = { newGroupName = it },
                                    placeholder = { Text("New group...", fontSize = 11.sp, color = RemoraTextMuted) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = RemoraCardBgElevated,
                                        unfocusedContainerColor = RemoraCardBgElevated,
                                        focusedTextColor = RemoraTextPrimary,
                                        unfocusedTextColor = RemoraTextPrimary,
                                        focusedBorderColor = RemoraAccent,
                                        unfocusedBorderColor = RemoraCardBorder
                                    ),
                                    modifier = Modifier.width(130.dp)
                                )

                                IconButton(
                                    onClick = {
                                        val trimmed = newGroupName.trim()
                                        if (trimmed.isNotEmpty()) {
                                            onCreateTopicForVerse(trimmed)
                                            newGroupName = ""
                                            isAddingGroup = false
                                        }
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Check,
                                        contentDescription = "Save group",
                                        tint = RemoraAccentLight,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                IconButton(
                                    onClick = {
                                        newGroupName = ""
                                        isAddingGroup = false
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Cancel",
                                        tint = RemoraTextMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        } else {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, RemoraCardBorder),
                                modifier = Modifier.clickable { isAddingGroup = true }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = null,
                                        tint = RemoraTextSecondary,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "New Group",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = RemoraTextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 4. Spaced Repetition Mastery & Cadence Stats
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = RemoraCardBg,
                border = BorderStroke(1.dp, RemoraCardBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Mastery %
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "$masteryPct%",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (masteryPct >= 80) RemoraAccentLight else RemoraTextPrimary
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Mastery",
                            fontSize = 11.sp,
                            color = RemoraTextMuted,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(30.dp)
                            .background(RemoraCardBorder)
                    )

                    // Cadence (reps / interval)
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "${verse.repetition} reps",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraTextPrimary
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "${verse.interval}d interval",
                            fontSize = 11.sp,
                            color = RemoraTextMuted,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(30.dp)
                            .background(RemoraCardBorder)
                    )

                    // Next Review
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = reviewStr,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (verse.nextDueDate <= now) RemoraAccent else RemoraTextPrimary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Review",
                            fontSize = 11.sp,
                            color = RemoraTextMuted,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 5. Actions / Delete Confirmation
            if (confirmingDelete) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = RemoraDanger.copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, RemoraDanger.copy(alpha = 0.35f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Remove this verse from your memory library?",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = RemoraDanger,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedButton(
                                onClick = { confirmingDelete = false },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, RemoraCardBorder)
                            ) {
                                Text("Cancel", color = RemoraTextPrimary)
                            }
                            Button(
                                onClick = {
                                    confirmingDelete = false
                                    onDelete()
                                    onDismiss()
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = RemoraDanger),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Context / Read in chapter button
                    OutlinedButton(
                        onClick = {
                            onDismiss()
                            onReadInChapter()
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, RemoraCardBorder)
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.MenuBook,
                            contentDescription = null,
                            tint = RemoraTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Context", color = RemoraTextPrimary, fontSize = 13.sp)
                    }

                    // Practice button
                    Button(
                        onClick = {
                            onDismiss()
                            onPractice()
                        },
                        modifier = Modifier.weight(1.8f),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraAccent)
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Practice", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    // Trash icon button
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = RemoraCardBg,
                        border = BorderStroke(1.dp, RemoraCardBorder),
                        modifier = Modifier
                            .size(44.dp)
                            .clickable { confirmingDelete = true }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Delete Verse",
                                tint = RemoraTextMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
