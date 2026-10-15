package com.example.telugubible

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.telugubible.theme.TeluguBibleTheme
import com.example.telugubible.ui.reader.ChapterReaderScreen
import com.example.telugubible.ui.reader.ReaderViewModel

class MainActivity : ComponentActivity() {
    private val readerViewModel: ReaderViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()
        setContent {
            TeluguBibleTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ChapterReaderScreen(viewModel = readerViewModel)
                }
            }
        }
    }
}
