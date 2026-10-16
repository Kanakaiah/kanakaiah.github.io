package com.example.telugubible.ui.common

import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.RemoraCardBgElevated
import com.example.telugubible.theme.RemoraTextMuted
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object BookCoverLoader {
    private val memoryCache = mutableMapOf<String, ImageBitmap>()

    suspend fun loadCover(context: Context, bookKey: String): ImageBitmap? {
        val key = bookKey.lowercase().trim()
        memoryCache[key]?.let { return it }

        return withContext(Dispatchers.IO) {
            try {
                context.assets.open("books/$key.png").use { stream ->
                    val bitmap = BitmapFactory.decodeStream(stream)
                    val imgBitmap = bitmap.asImageBitmap()
                    memoryCache[key] = imgBitmap
                    imgBitmap
                }
            } catch (e: Exception) {
                null
            }
        }
    }
}

@Composable
fun BookCoverImage(
    bookKey: String,
    contentDescription: String?,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var imageBitmap by remember(bookKey) { mutableStateOf<ImageBitmap?>(null) }

    LaunchedEffect(bookKey) {
        imageBitmap = BookCoverLoader.loadCover(context, bookKey)
    }

    if (imageBitmap != null) {
        Image(
            bitmap = imageBitmap!!,
            contentDescription = contentDescription,
            modifier = modifier,
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = modifier.background(RemoraCardBgElevated),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = bookKey.take(1).uppercase(),
                color = RemoraTextMuted,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
