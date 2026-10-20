package com.example.telugubible.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
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
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.data.model.Topic
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageTopicsSheet(
    topics: List<Topic>,
    onDismiss: () -> Unit,
    onCreateTopic: (String) -> Unit,
    onRenameTopic: (String, String) -> Unit,
    onDeleteTopic: (String) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var newTopicName by remember { mutableStateOf("") }
    var editingTopicId by remember { mutableStateOf<String?>(null) }
    var editingTopicName by remember { mutableStateOf("") }
    var topicToDelete by remember { mutableStateOf<Topic?>(null) }

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
        ) {
            // Header: Title & Close
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Manage Groups",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = RemoraTextPrimary
                )
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

            Spacer(modifier = Modifier.height(16.dp))

            // Add new topic form
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = newTopicName,
                    onValueChange = { newTopicName = it },
                    placeholder = { Text("New group name (e.g. Anxiety)", color = RemoraTextMuted, fontSize = 13.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = RemoraCardBg,
                        unfocusedContainerColor = RemoraCardBg,
                        focusedTextColor = RemoraTextPrimary,
                        unfocusedTextColor = RemoraTextPrimary,
                        focusedBorderColor = RemoraAccent,
                        unfocusedBorderColor = RemoraCardBorder
                    ),
                    modifier = Modifier.weight(1f)
                )

                Button(
                    onClick = {
                        val trimmed = newTopicName.trim()
                        if (trimmed.isNotEmpty()) {
                            onCreateTopic(trimmed)
                            newTopicName = ""
                        }
                    },
                    enabled = newTopicName.trim().isNotEmpty(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RemoraAccent,
                        disabledContainerColor = RemoraAccent.copy(alpha = 0.4f)
                    ),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 14.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Topic List
            if (topics.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No groups created yet. Groups help you organize related verses.",
                        fontSize = 13.sp,
                        color = RemoraTextMuted,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f, fill = false)
                ) {
                    items(topics, key = { it.id }) { topic ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = RemoraCardBg,
                            border = BorderStroke(1.dp, RemoraCardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (editingTopicId == topic.id) {
                                // Inline editing row
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedTextField(
                                        value = editingTopicName,
                                        onValueChange = { editingTopicName = it },
                                        singleLine = true,
                                        shape = RoundedCornerShape(8.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedContainerColor = RemoraCardBgElevated,
                                            unfocusedContainerColor = RemoraCardBgElevated,
                                            focusedTextColor = RemoraTextPrimary,
                                            unfocusedTextColor = RemoraTextPrimary,
                                            focusedBorderColor = RemoraAccent,
                                            unfocusedBorderColor = RemoraCardBorder
                                        ),
                                        modifier = Modifier.weight(1f)
                                    )

                                    IconButton(
                                        onClick = {
                                            val trimmed = editingTopicName.trim()
                                            if (trimmed.isNotEmpty()) {
                                                onRenameTopic(topic.id, trimmed)
                                            }
                                            editingTopicId = null
                                            editingTopicName = ""
                                        },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = "Save",
                                            tint = RemoraAccentLight,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }

                                    IconButton(
                                        onClick = {
                                            editingTopicId = null
                                            editingTopicName = ""
                                        },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Cancel",
                                            tint = RemoraTextMuted,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            } else {
                                // Normal topic row
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = topic.name,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = RemoraTextPrimary,
                                        modifier = Modifier.weight(1f)
                                    )

                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        IconButton(
                                            onClick = {
                                                editingTopicId = topic.id
                                                editingTopicName = topic.name
                                            },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Edit,
                                                contentDescription = "Edit group",
                                                tint = RemoraTextMuted,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }

                                        IconButton(
                                            onClick = { topicToDelete = topic },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Delete,
                                                contentDescription = "Delete group",
                                                tint = RemoraDanger.copy(alpha = 0.8f),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Delete Confirmation Dialog (Faithfully matching React's ManageTopicsModal alert)
        topicToDelete?.let { topic ->
            AlertDialog(
                onDismissRequest = { topicToDelete = null },
                containerColor = RemoraCardBgElevated,
                title = {
                    Text(
                        text = "Delete \"${topic.name}\"?",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextPrimary
                    )
                },
                text = {
                    Text(
                        text = "Are you sure you want to delete this group? All verses that belong exclusively to this group will also be permanently deleted.",
                        fontSize = 13.sp,
                        color = RemoraTextSecondary,
                        lineHeight = 18.sp
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            onDeleteTopic(topic.id)
                            topicToDelete = null
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = RemoraDanger),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { topicToDelete = null }) {
                        Text("Cancel", color = RemoraTextSecondary)
                    }
                }
            )
        }
    }
}
