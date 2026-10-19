package com.example.telugubible.ui.bible

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.commentary.PreachersData
import com.example.telugubible.data.model.PreacherEntry
import com.example.telugubible.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreachersSheet(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedEraIndex by remember { mutableStateOf(0) }
    val eras = PreachersData.ERAS
    val currentEra = eras.getOrNull(selectedEraIndex) ?: eras.first()
    val context = LocalContext.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = RemoraCardBg,
        scrimColor = Color.Black.copy(alpha = 0.6f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = RemoraCardBorderHover) },
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "⛪ Preachers & Theologians",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                    Text(
                        text = "Major figures across church history",
                        fontSize = 12.sp,
                        color = RemoraTextSecondary
                    )
                }

                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = RemoraTextMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Era Selector Pills
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                eras.forEachIndexed { index, era ->
                    val isSelected = selectedEraIndex == index
                    Surface(
                        onClick = { selectedEraIndex = index },
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) RemoraAccent.copy(alpha = 0.2f) else RemoraCardBgElevated,
                        border = BorderStroke(
                            1.dp,
                            if (isSelected) RemoraAccent else RemoraCardBorder
                        )
                    ) {
                        Text(
                            text = era.heading,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) RemoraAccentLight else RemoraTextSecondary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Era Description
            Text(
                text = currentEra.description,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = RemoraTextMuted,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            // Preacher Cards
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(currentEra.entries) { entry ->
                    PreacherCard(
                        entry = entry,
                        onOpenUrl = { url ->
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            context.startActivity(intent)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun PreacherCard(
    entry: PreacherEntry,
    onOpenUrl: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = RemoraCardBgElevated,
        border = BorderStroke(1.dp, RemoraCardBorder),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = entry.person,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )

                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = RemoraCardBorder,
                    modifier = Modifier.padding(start = 6.dp)
                ) {
                    Text(
                        text = entry.rank,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = RemoraTextMuted,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Text(
                text = entry.reference,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = RemoraGold
            )

            Text(
                text = entry.quote,
                fontSize = 12.sp,
                lineHeight = 18.sp,
                color = RemoraTextSecondary
            )

            // Key Resources / Books
            if (entry.resources.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    entry.resources.forEach { res ->
                        Surface(
                            onClick = { onOpenUrl(res.url) },
                            shape = RoundedCornerShape(6.dp),
                            color = RemoraBackground,
                            border = BorderStroke(1.dp, RemoraCardBorderHover)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.MenuBook,
                                    contentDescription = null,
                                    tint = RemoraAccentLight,
                                    modifier = Modifier.size(11.dp)
                                )
                                Text(
                                    text = res.title,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = RemoraTextPrimary
                                )
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.OpenInNew,
                                    contentDescription = null,
                                    tint = RemoraTextMuted,
                                    modifier = Modifier.size(10.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
