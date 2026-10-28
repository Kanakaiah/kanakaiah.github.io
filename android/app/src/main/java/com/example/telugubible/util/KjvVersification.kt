package com.example.telugubible.util

import com.example.telugubible.data.model.Book

data class GenreInfo(
    val id: String,
    val ordinal: Int,
    val label: String,
    val colorHex: Long
)

data class VerseCoord(
    val vid: Int,
    val bookId: Int,       // 1..66
    val bookName: String,
    val chapter: Int,      // 1-based
    val verse: Int,        // 1-based
    val genre: GenreInfo,
    val isOldTestament: Boolean
)

object KjvVersification {
    const val TOTAL_VERSES = 31102
    const val MAX_TARGET_SPAN = 181

    val GENRES: List<GenreInfo> = listOf(
        GenreInfo("law", 0, "Law", 0xFFEB568F),
        GenreInfo("history", 1, "History", 0xFFCD4805),
        GenreInfo("poetry", 2, "Poetry & Wisdom", 0xFFB48F05),
        GenreInfo("major-prophets", 3, "Major Prophets", 0xFFCD489D),
        GenreInfo("minor-prophets", 4, "Minor Prophets", 0xFF88A00D),
        GenreInfo("gospels", 5, "Gospels", 0xFF17A7B4),
        GenreInfo("acts", 6, "Acts", 0xFF119245),
        GenreInfo("pauline-epistles", 7, "Pauline Epistles", 0xFF0593E6),
        GenreInfo("general-epistles", 8, "General Epistles", 0xFF03AC8F),
        GenreInfo("revelation", 9, "Revelation", 0xFFA06AEC)
    )

    fun getGenreForBookId(bookId: Int): GenreInfo = when {
        bookId <= 5 -> GENRES[0]   // Gen–Deut (Law)
        bookId <= 17 -> GENRES[1]  // Josh–Esth (History)
        bookId <= 22 -> GENRES[2]  // Job–Song (Poetry & Wisdom)
        bookId <= 27 -> GENRES[3]  // Isa–Dan (Major Prophets)
        bookId <= 39 -> GENRES[4]  // Hos–Mal (Minor Prophets)
        bookId <= 43 -> GENRES[5]  // Matt–John (Gospels)
        bookId == 44 -> GENRES[6]  // Acts (Acts)
        bookId <= 57 -> GENRES[7]  // Rom–Phlm (Pauline Epistles)
        bookId <= 65 -> GENRES[8]  // Heb–Jude (General Epistles)
        else -> GENRES[9]          // Rev (Revelation)
    }

    val BOOK_NAMES_EN: Array<String> = arrayOf(
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
        "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
        "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
        "Zephaniah", "Haggai", "Zechariah", "Malachi",
        "Matthew", "Mark", "Luke", "John", "Acts",
        "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
        "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
        "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
        "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
        "Jude", "Revelation"
    )

    val KJV_CHAPTER_VERSE_COUNTS: Array<IntArray> = arrayOf(
        // 1 Genesis
        intArrayOf(31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26),
        // 2 Exodus
        intArrayOf(22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38),
        // 3 Leviticus
        intArrayOf(17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34),
        // 4 Numbers
        intArrayOf(54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13),
        // 5 Deuteronomy
        intArrayOf(46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12),
        // 6 Joshua
        intArrayOf(18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33),
        // 7 Judges
        intArrayOf(36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25),
        // 8 Ruth
        intArrayOf(22, 23, 18, 22),
        // 9 1 Samuel
        intArrayOf(28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13),
        // 10 2 Samuel
        intArrayOf(27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25),
        // 11 1 Kings
        intArrayOf(53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53),
        // 12 2 Kings
        intArrayOf(18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30),
        // 13 1 Chronicles
        intArrayOf(54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30),
        // 14 2 Chronicles
        intArrayOf(17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23),
        // 15 Ezra
        intArrayOf(11, 70, 13, 24, 17, 22, 28, 36, 15, 44),
        // 16 Nehemiah
        intArrayOf(11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31),
        // 17 Esther
        intArrayOf(22, 23, 15, 17, 14, 14, 10, 17, 32, 3),
        // 18 Job
        intArrayOf(22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17),
        // 19 Psalms
        intArrayOf(6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6),
        // 20 Proverbs
        intArrayOf(33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31),
        // 21 Ecclesiastes
        intArrayOf(18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14),
        // 22 Song of Solomon
        intArrayOf(17, 17, 11, 16, 16, 13, 13, 14),
        // 23 Isaiah
        intArrayOf(31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24),
        // 24 Jeremiah
        intArrayOf(19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34),
        // 25 Lamentations
        intArrayOf(22, 22, 66, 22, 22),
        // 26 Ezekiel
        intArrayOf(28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35),
        // 27 Daniel
        intArrayOf(21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13),
        // 28 Hosea
        intArrayOf(11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9),
        // 29 Joel
        intArrayOf(20, 32, 21),
        // 30 Amos
        intArrayOf(15, 16, 15, 13, 27, 14, 17, 14, 15),
        // 31 Obadiah
        intArrayOf(21),
        // 32 Jonah
        intArrayOf(17, 10, 10, 11),
        // 33 Micah
        intArrayOf(16, 13, 12, 13, 15, 16, 20),
        // 34 Nahum
        intArrayOf(15, 13, 19),
        // 35 Habakkuk
        intArrayOf(17, 20, 19),
        // 36 Zephaniah
        intArrayOf(18, 15, 20),
        // 37 Haggai
        intArrayOf(15, 23),
        // 38 Zechariah
        intArrayOf(21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21),
        // 39 Malachi
        intArrayOf(14, 17, 18, 6),
        // 40 Matthew
        intArrayOf(25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20),
        // 41 Mark
        intArrayOf(45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20),
        // 42 Luke
        intArrayOf(80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53),
        // 43 John
        intArrayOf(51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25),
        // 44 Acts
        intArrayOf(26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31),
        // 45 Romans
        intArrayOf(32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27),
        // 46 1 Corinthians
        intArrayOf(31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24),
        // 47 2 Corinthians
        intArrayOf(24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14),
        // 48 Galatians
        intArrayOf(24, 21, 29, 31, 26, 18),
        // 49 Ephesians
        intArrayOf(23, 22, 21, 32, 33, 24),
        // 50 Philippians
        intArrayOf(30, 30, 21, 23),
        // 51 Colossians
        intArrayOf(29, 23, 25, 18),
        // 52 1 Thessalonians
        intArrayOf(10, 20, 13, 18, 28),
        // 53 2 Thessalonians
        intArrayOf(12, 17, 18),
        // 54 1 Timothy
        intArrayOf(20, 15, 16, 16, 25, 21),
        // 55 2 Timothy
        intArrayOf(18, 26, 17, 22),
        // 56 Titus
        intArrayOf(16, 15, 15),
        // 57 Philemon
        intArrayOf(25),
        // 58 Hebrews
        intArrayOf(14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25),
        // 59 James
        intArrayOf(27, 26, 18, 17, 20),
        // 60 1 Peter
        intArrayOf(25, 25, 22, 19, 14),
        // 61 2 Peter
        intArrayOf(21, 22, 18),
        // 62 1 John
        intArrayOf(10, 29, 24, 21, 21),
        // 63 2 John
        intArrayOf(13),
        // 64 3 John
        intArrayOf(14),
        // 65 Jude
        intArrayOf(25),
        // 66 Revelation
        intArrayOf(20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21)
    )

    private val vidToCoord: Array<VerseCoord> = Array(TOTAL_VERSES) {
        VerseCoord(0, 1, "Genesis", 1, 1, GENRES[0], true)
    }

    // 1..66 -> IntArray of chapter start vids (1-based chapter index)
    private val bookChapterOffsets: Array<IntArray> = Array(67) { IntArray(0) }

    init {
        var vid = 0
        for (bIdx in 0 until 66) {
            val bookId = bIdx + 1
            val bookName = BOOK_NAMES_EN[bIdx]
            val genre = getGenreForBookId(bookId)
            val chCounts = KJV_CHAPTER_VERSE_COUNTS[bIdx]
            val chOffsets = IntArray(chCounts.size + 1)
            for (cIdx in chCounts.indices) {
                chOffsets[cIdx + 1] = vid
                val vCount = chCounts[cIdx]
                val chapter = cIdx + 1
                for (v in 1..vCount) {
                    vidToCoord[vid] = VerseCoord(
                        vid = vid,
                        bookId = bookId,
                        bookName = bookName,
                        chapter = chapter,
                        verse = v,
                        genre = genre,
                        isOldTestament = bookId <= 39
                    )
                    vid++
                }
            }
            bookChapterOffsets[bookId] = chOffsets
        }
    }

    fun toVerseIndex(bookId: Int, chapter: Int, verse: Int): Int? {
        if (bookId !in 1..66) return null
        val chCounts = KJV_CHAPTER_VERSE_COUNTS[bookId - 1]
        if (chapter < 1 || chapter > chCounts.size) return null
        val maxVerse = chCounts[chapter - 1]
        if (verse < 1 || verse > maxVerse) return null
        return bookChapterOffsets[bookId][chapter] + (verse - 1)
    }

    fun getChapterVidRange(bookId: Int, chapter: Int): IntRange? {
        if (bookId !in 1..66) return null
        val chCounts = KJV_CHAPTER_VERSE_COUNTS[bookId - 1]
        if (chapter < 1 || chapter > chCounts.size) return null
        val start = bookChapterOffsets[bookId][chapter]
        val end = start + chCounts[chapter - 1] - 1
        return start..end
    }

    fun fromVerseIndex(vid: Int): VerseCoord {
        if (vid !in 0 until TOTAL_VERSES) return vidToCoord[0]
        return vidToCoord[vid]
    }

    fun formatVerseIndexRange(
        startVid: Int,
        endVid: Int,
        booksMap: Map<Int, Book>? = null,
        isTelugu: Boolean = false
    ): String {
        val start = fromVerseIndex(startVid)
        val startBookObj = booksMap?.get(start.bookId)
        val startBookName = if (isTelugu) {
            startBookObj?.nameTe?.takeIf { it.isNotBlank() } ?: start.bookName
        } else {
            startBookObj?.nameEn?.takeIf { it.isNotBlank() } ?: start.bookName
        }

        if (startVid == endVid) {
            return "$startBookName ${start.chapter}:${start.verse}"
        }

        val end = fromVerseIndex(endVid)
        if (start.bookId == end.bookId) {
            if (start.chapter == end.chapter) {
                return "$startBookName ${start.chapter}:${start.verse}–${end.verse}"
            }
            return "$startBookName ${start.chapter}:${start.verse}–${end.chapter}:${end.verse}"
        }

        val endBookObj = booksMap?.get(end.bookId)
        val endBookName = if (isTelugu) {
            endBookObj?.nameTe?.takeIf { it.isNotBlank() } ?: end.bookName
        } else {
            endBookObj?.nameEn?.takeIf { it.isNotBlank() } ?: end.bookName
        }
        return "$startBookName ${start.chapter}:${start.verse}–$endBookName ${end.chapter}:${end.verse}"
    }
}
