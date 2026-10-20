package com.example.telugubible.ui.reader

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.theme.*

@Composable
fun StrongsDialog(
    entry: StrongsEntry,
    onViewOccurrences: (String) -> Unit = {},
    onRefClick: (String) -> Unit = {},
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = RemoraCardBgElevated,
        titleContentColor = RemoraTextPrimary,
        textContentColor = RemoraTextSecondary,
        title = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = entry.id,
                        fontWeight = FontWeight.Bold,
                        color = RemoraAccentLight,
                        fontSize = 18.sp
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = RemoraAccent.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = if (entry.lang == "G") "Greek" else "Hebrew",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = RemoraAccentLight,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                if (!entry.lemma.isNullOrBlank()) {
                    Text(
                        text = entry.lemma,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraGold,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                if (!entry.xlit.isNullOrBlank() || !entry.pron.isNullOrBlank()) {
                    val phonetics = listOfNotNull(entry.xlit, entry.pron?.let { "/$it/" }).joinToString(" • ")
                    Text(
                        text = phonetics,
                        fontSize = 13.sp,
                        fontStyle = FontStyle.Italic,
                        color = RemoraTextSecondary
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (!entry.strongsDef.isNullOrBlank()) {
                    Column {
                        Text(
                            text = "STRONG'S DEFINITION",
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            color = RemoraAccent,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        StrongsRefText(
                            text = entry.strongsDef.trim(),
                            onRefClick = onRefClick,
                            fontSize = 14.sp,
                            lineHeight = 21.sp,
                            color = RemoraTextPrimary
                        )
                    }
                }

                if (!entry.kjvDef.isNullOrBlank()) {
                    Column {
                        Text(
                            text = "KJV USAGE",
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            color = RemoraAccent,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = entry.kjvDef.trim(),
                            fontSize = 13.sp,
                            fontStyle = FontStyle.Italic,
                            lineHeight = 19.sp,
                            color = RemoraTextSecondary
                        )
                    }
                }

                if (!entry.derivation.isNullOrBlank()) {
                    Column {
                        Text(
                            text = "ORIGIN / DERIVATION",
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            color = RemoraAccent,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        StrongsRefText(
                            text = entry.derivation.trim(),
                            onRefClick = onRefClick,
                            fontSize = 13.sp,
                            lineHeight = 19.sp,
                            color = RemoraTextSecondary
                        )
                    }
                }

                // View Occurrences Action Button
                OutlinedButton(
                    onClick = { onViewOccurrences(entry.id) },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, RemoraAccent.copy(alpha = 0.35f)),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = RemoraAccent.copy(alpha = 0.1f),
                        contentColor = RemoraAccentLight
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "View all occurrences",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = RemoraAccentLight)
            ) {
                Text("Close", fontWeight = FontWeight.Bold)
            }
        }
    )
}
