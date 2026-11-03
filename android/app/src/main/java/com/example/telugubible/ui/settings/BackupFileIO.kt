package com.example.telugubible.ui.settings

import java.io.InputStream
import java.io.OutputStream

internal object BackupFileIO {
    const val MAX_CHARACTERS = 10_000_000

    fun checkSize(size: Int) {
        if (size > MAX_CHARACTERS) throw BackupTooLargeException()
    }

    fun read(open: () -> InputStream?): String {
        val stream = open() ?: throw IllegalStateException("The selected file could not be opened.")
        return stream.bufferedReader(Charsets.UTF_8).use { reader ->
            val result = StringBuilder()
            val buffer = CharArray(8192)
            while (true) {
                val count = reader.read(buffer)
                if (count < 0) break
                checkSize(result.length + count)
                result.append(buffer, 0, count)
            }
            require(result.isNotBlank()) { "The selected file is empty." }
            result.toString()
        }
    }

    fun write(open: () -> OutputStream?, json: String) {
        checkSize(json.length)
        val stream = open() ?: throw IllegalStateException("The selected location could not be opened.")
        stream.use { it.write(json.toByteArray(Charsets.UTF_8)); it.flush() }
    }
}

internal class BackupTooLargeException : IllegalArgumentException("The backup exceeds this app's size limit.")
