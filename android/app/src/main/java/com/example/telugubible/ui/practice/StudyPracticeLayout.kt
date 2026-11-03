package com.example.telugubible.ui.practice

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
internal fun StudyPracticeLayout(modifier: Modifier = Modifier, scrollKey: Any = Unit, content: @Composable ColumnScope.() -> Unit) {
    val scroll = rememberScrollState()
    LaunchedEffect(scrollKey) { scroll.scrollTo(0) }
    Surface(modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize().imePadding(), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxSize().verticalScroll(scroll)
                .navigationBarsPadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(20.dp), content = content)
        }
    }
}

@Composable
internal fun StudyAnswerCard(label: String, answer: String, detail: String, keyword: String = "") {
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(answer, style = MaterialTheme.typography.headlineSmall)
            if (keyword.isNotBlank()) Text(keyword, style = MaterialTheme.typography.titleMedium)
            if (detail.isNotBlank()) Text(detail, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
internal fun PracticeEndCard(empty: Boolean, title: String, onRestart: () -> Unit, onExit: () -> Unit, exitLabel: String) {
    Text(if (empty) "Nothing to practice in this queue" else title, style = MaterialTheme.typography.headlineMedium)
    Text(if (empty) "Choose another set or return to your verses." else "You reached the end of this queue.", style = MaterialTheme.typography.bodyLarge)
    Button(onClick = onExit, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(exitLabel) }
    if (!empty) OutlinedButton(onClick = onRestart, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Practice again") }
}
