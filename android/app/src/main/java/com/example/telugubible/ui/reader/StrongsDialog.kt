package com.example.telugubible.ui.reader

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.StrongsEntry

@Composable
fun StrongsDialog(
    entry: StrongsEntry,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = entry.id,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 18.sp
                    )
                    Text(
                        text = if (entry.lang == "G") "Greek" else "Hebrew",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
                if (!entry.lemma.isNullOrBlank()) {
                    Text(
                        text = entry.lemma,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                if (!entry.xlit.isNullOrBlank() || !entry.pron.isNullOrBlank()) {
                    Text(
                        text = listOfNotNull(entry.xlit, entry.pron?.let { "/$it/" }).joinToString(" • "),
                        fontSize = 14.sp,
                        fontStyle = FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (!entry.strongsDef.isNullOrBlank()) {
                    Column {
                        Text(
                            text = "Strong's Definition",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(text = entry.strongsDef.trim(), fontSize = 15.sp)
                    }
                }

                if (!entry.kjvDef.isNullOrBlank()) {
                    Column {
                        Text(
                            text = "KJV Usage",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(text = entry.kjvDef.trim(), fontSize = 15.sp)
                    }
                }

                if (!entry.derivation.isNullOrBlank()) {
                    Column {
                        Text(
                            text = "Origin / Derivation",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(text = entry.derivation.trim(), fontSize = 14.sp, fontStyle = FontStyle.Italic)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
