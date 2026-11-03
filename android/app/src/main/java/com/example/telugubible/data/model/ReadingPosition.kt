package com.example.telugubible.data.model

/** One atomic value, independent of review session state and translation choice. */
data class ReadingPosition(val bookId: Int, val chapter: Int) {
    fun encode(): String = "$bookId:$chapter"

    companion object {
        const val STORAGE_KEY = "reader_position"

        fun decode(value: String?): ReadingPosition? {
            val parts = value?.split(':') ?: return null
            if (parts.size != 2) return null
            val book = parts[0].toIntOrNull() ?: return null
            val chapter = parts[1].toIntOrNull() ?: return null
            return if (book > 0 && chapter > 0) ReadingPosition(book, chapter) else null
        }
    }
}
