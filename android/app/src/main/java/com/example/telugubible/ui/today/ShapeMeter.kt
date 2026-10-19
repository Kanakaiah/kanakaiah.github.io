package com.example.telugubible.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Book
import com.example.telugubible.theme.*
import com.example.telugubible.util.BookMasteryCounts

enum class CanonDivision(
    val label: String,
    val color: Color,
    val sections: List<String>
) {
    LAW("Law", Color(0xFFF59E0B), listOf("Pentateuch")),
    HISTORY("History", Color(0xFF3B82F6), listOf("Historical Books")),
    WISDOM("Wisdom", Color(0xFF10B981), listOf("Wisdom Literature")),
    PROPHETS("Prophets", Color(0xFFF97316), listOf("Major Prophets", "Minor Prophets")),
    GOSPELS_ACTS("Gospels & Acts", Color(0xFF6366F1), listOf("Gospels", "Acts")),
    EPISTLES("Epistles", Color(0xFFF43F5E), listOf("Paul — Major", "Paul — Minor", "Pastorals", "General Epistles", "John's Letters", "Last Stand")),
    APOCALYPSE("Apocalypse", Color(0xFF8B5CF6), listOf("Apocalypse"));

    companion object {
        fun forSection(section: String): CanonDivision {
            return entries.firstOrNull { div ->
                div.sections.any { it.equals(section, ignoreCase = true) }
            } ?: LAW
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ShapeMeter(
    books: List<Book>,
    masteryByBook: Map<Int, BookMasteryCounts>,
    totalSecure: Int,
    totalChapters: Int,
    onBookClick: (Int) -> Unit,
    onRetentionClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = RemoraCardBg,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.MenuBook,
                        contentDescription = null,
                        tint = RemoraAccent,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "YOUR SHAPE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        color = RemoraAccent
                    )
                }

                Text(
                    text = "$totalSecure of $totalChapters chapters",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = RemoraTextSecondary
                )
            }

            // 66-Book Visual Grid
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                books.forEach { book ->
                    val m = masteryByBook[book.id]
                    val division = CanonDivision.forSection(book.section)

                    val isUntouched = m == null || (m.seen == 0 && m.learning == 0 && m.secure == 0)
                    val cellColor = when {
                        isUntouched -> RemoraCardBgElevated
                        m.secure == 0 -> division.color.copy(alpha = 0.30f)
                        m.securePct >= 0.9 -> division.color.copy(alpha = 1.0f)
                        m.securePct >= 0.4 -> division.color.copy(alpha = 0.70f)
                        else -> division.color.copy(alpha = 0.45f)
                    }

                    Box(
                        modifier = Modifier
                            .size(13.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(cellColor)
                            .then(
                                if (isUntouched) {
                                    Modifier.border(0.5.dp, RemoraCardBorder, RoundedCornerShape(2.dp))
                                } else {
                                    Modifier
                                }
                            )
                            .clickable { onBookClick(book.id) }
                    )
                }
            }

            // Retention navigation link
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onRetentionClick() }
                    .padding(top = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "What would you still recall?",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Normal,
                    color = RemoraTextMuted
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(
                        text = "Retention",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraAccent
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = RemoraAccent,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
        }
    }
}
