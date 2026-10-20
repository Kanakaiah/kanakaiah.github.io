package com.example.telugubible.ui.common

import android.content.Context
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.telugubible.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

object ChapterArtworkLoader {
    private val memoryCache = LruCache<String, ImageBitmap>(80)

    suspend fun loadChapterArtwork(context: Context, bookKey: String, chapter: Int): ImageBitmap? {
        val key = "${bookKey.lowercase().trim()}_ch$chapter"
        memoryCache.get(key)?.let { return it }

        return withContext(Dispatchers.IO) {
            val cacheDir = File(context.cacheDir, "chapter_artwork").apply { mkdirs() }
            val diskFile = File(cacheDir, "$key.img")

            // 1. Try disk cache
            if (diskFile.exists() && diskFile.length() > 0) {
                try {
                    val bmp = BitmapFactory.decodeFile(diskFile.absolutePath)
                    if (bmp != null) {
                        val img = bmp.asImageBitmap()
                        memoryCache.put(key, img)
                        return@withContext img
                    }
                } catch (e: Exception) {}
            }

            // 2. Download from GitHub Pages (.png first, then .jpg)
            val baseSlug = bookKey.lowercase().trim()
            val urls = listOf(
                "https://kanakaiah.github.io/chapters/$baseSlug/ch$chapter.png",
                "https://kanakaiah.github.io/chapters/$baseSlug/ch$chapter.jpg"
            )

            for (urlStr in urls) {
                var conn: HttpURLConnection? = null
                try {
                    val url = URL(urlStr)
                    conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        connectTimeout = 8000
                        readTimeout = 8000
                        setRequestProperty("User-Agent", "Remora-Android/1.0")
                    }
                    if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                        val bytes = conn.inputStream.use { it.readBytes() }
                        if (bytes.isNotEmpty()) {
                            // Save to disk cache
                            FileOutputStream(diskFile).use { it.write(bytes) }
                            val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                            if (bmp != null) {
                                val img = bmp.asImageBitmap()
                                memoryCache.put(key, img)
                                return@withContext img
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Try next URL fallback
                } finally {
                    conn?.disconnect()
                }
            }
            null
        }
    }
}

@Composable
fun ChapterPlateImage(
    bookKey: String,
    chapter: Int,
    contentDescription: String?,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var imageBitmap by remember(bookKey, chapter) { mutableStateOf<ImageBitmap?>(null) }
    var isLoading by remember(bookKey, chapter) { mutableStateOf(true) }

    LaunchedEffect(bookKey, chapter) {
        isLoading = true
        imageBitmap = ChapterArtworkLoader.loadChapterArtwork(context, bookKey, chapter)
        isLoading = false
    }

    Box(
        modifier = modifier
            .background(RemoraCardBgElevated)
            .clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp))
    ) {
        if (imageBitmap != null) {
            Image(
                bitmap = imageBitmap!!,
                contentDescription = contentDescription,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            // Elegant placeholder numeral plate
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = RemoraAccent.copy(alpha = 0.5f)
                    )
                } else {
                    Text(
                        text = chapter.toString(),
                        fontSize = 38.sp,
                        fontWeight = FontWeight.Bold,
                        color = RemoraTextMuted.copy(alpha = 0.25f)
                    )
                }
            }
        }

        // Top-left chapter numeral badge
        Box(
            modifier = Modifier
                .padding(8.dp)
                .size(28.dp)
                .background(RemoraBackground.copy(alpha = 0.88f), CircleShape)
                .border(1.dp, RemoraCardBorder, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = chapter.toString(),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = RemoraTextPrimary
            )
        }
    }
}
