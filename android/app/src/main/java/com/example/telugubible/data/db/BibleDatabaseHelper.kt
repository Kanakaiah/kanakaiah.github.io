package com.example.telugubible.data.db

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.BookGuide
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.CrossReference
import com.example.telugubible.data.model.GuideBlock
import com.example.telugubible.data.model.GuideKeyVerse
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseSearchResult
import java.io.File
import java.io.FileOutputStream

class BibleDatabaseHelper(val context: Context) :
    SQLiteOpenHelper(context, STATIC_DB_NAME, null, STATIC_DB_VERSION) {

    companion object {
        const val ASSET_NAME = "bible.db"
        const val STATIC_DB_NAME = "bible_static.db"
        const val STATIC_DB_VERSION = 6
        private const val PREFS_NAME = "bible_static_db_prefs"
        private const val KEY_COPIED_VERSION = "copied_static_db_version"

        @Volatile
        private var instance: BibleDatabaseHelper? = null

        fun getInstance(context: Context): BibleDatabaseHelper =
            instance ?: synchronized(this) {
                instance ?: BibleDatabaseHelper(context.applicationContext).also { instance = it }
            }
    }

    private val dbPath: File
        get() = context.getDatabasePath(STATIC_DB_NAME)

    @Volatile
    private var cachedBooksMap: Map<Int, Book>? = null

    init {
        copyDatabaseIfNeeded()
    }

    @Synchronized
    private fun copyDatabaseIfNeeded() {
        val dbFile = dbPath
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val copiedVersion = prefs.getInt(KEY_COPIED_VERSION, 0)

        if (!dbFile.exists() || dbFile.length() == 0L || copiedVersion < STATIC_DB_VERSION) {
            dbFile.parentFile?.mkdirs()
            val inputStream = try {
                context.assets.open(ASSET_NAME)
            } catch (e: Exception) {
                // In local JVM / Robolectric unit test environments, locate asset on disk
                val testPaths = listOf(
                    File("src/main/assets", ASSET_NAME),
                    File("app/src/main/assets", ASSET_NAME),
                    File("android/app/src/main/assets", ASSET_NAME)
                )
                val found = testPaths.firstOrNull { it.exists() }
                found?.inputStream() ?: throw e
            }

            inputStream.use { input ->
                FileOutputStream(dbFile).use { output ->
                    input.copyTo(output)
                }
            }
            prefs.edit().putInt(KEY_COPIED_VERSION, STATIC_DB_VERSION).apply()
            cachedBooksMap = null
        }
    }

    override fun onCreate(db: SQLiteDatabase?) {
        // Pre-populated from asset
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        // Static database is updated by copying fresh asset in copyDatabaseIfNeeded
    }

    fun getAllBooks(): List<Book> {
        val list = mutableListOf<Book>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_key, name_en, name_te, name_ta, testament, section, chapters, theme_word, key_word, subtitle FROM books ORDER BY id ASC",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    Book(
                        id = it.getInt(0),
                        key = it.getString(1),
                        nameEn = it.getString(2),
                        nameTe = it.getString(3),
                        nameTa = if (it.isNull(4)) null else it.getString(4),
                        testament = it.getString(5),
                        section = it.getString(6),
                        chapters = it.getInt(7),
                        themeWord = if (it.isNull(8)) "" else it.getString(8),
                        keyWord = if (it.isNull(9)) "" else it.getString(9),
                        subtitle = if (it.isNull(10)) "" else it.getString(10)
                    )
                )
            }
        }
        return list
    }

    fun getBooksMap(): Map<Int, Book> {
        val cached = cachedBooksMap
        if (cached != null) return cached
        val map = getAllBooks().associateBy { it.id }
        cachedBooksMap = map
        return map
    }

    fun getBook(bookId: Int): Book? {
        val cached = cachedBooksMap
        if (cached != null) {
            return cached[bookId]
        }
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_key, name_en, name_te, name_ta, testament, section, chapters, theme_word, key_word, subtitle FROM books WHERE id = ?",
            arrayOf(bookId.toString())
        )
        cursor.use {
            if (it.moveToNext()) {
                return Book(
                    id = it.getInt(0),
                    key = it.getString(1),
                    nameEn = it.getString(2),
                    nameTe = it.getString(3),
                    nameTa = if (it.isNull(4)) null else it.getString(4),
                    testament = it.getString(5),
                    section = it.getString(6),
                    chapters = it.getInt(7),
                    themeWord = if (it.isNull(8)) "" else it.getString(8),
                    keyWord = if (it.isNull(9)) "" else it.getString(9),
                    subtitle = if (it.isNull(10)) "" else it.getString(10)
                )
            }
        }
        return null
    }

    fun getVerses(bookId: Int, chapter: Int): List<Verse> {
        val list = mutableListOf<Verse>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_id, chapter, verse, text_te, text_en, text_ta FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse ASC",
            arrayOf(bookId.toString(), chapter.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    Verse(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        chapter = it.getInt(2),
                        verse = it.getInt(3),
                        textTe = if (it.isNull(4)) null else it.getString(4),
                        textEn = if (it.isNull(5)) null else it.getString(5),
                        textTa = if (it.isNull(6)) null else it.getString(6)
                    )
                )
            }
        }
        return list
    }

    fun getVerse(bookId: Int, chapter: Int, verse: Int): Verse? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_id, chapter, verse, text_te, text_en, text_ta FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?",
            arrayOf(bookId.toString(), chapter.toString(), verse.toString())
        )
        cursor.use {
            if (it.moveToNext()) {
                return Verse(
                    id = it.getLong(0),
                    bookId = it.getInt(1),
                    chapter = it.getInt(2),
                    verse = it.getInt(3),
                    textTe = if (it.isNull(4)) null else it.getString(4),
                    textEn = if (it.isNull(5)) null else it.getString(5),
                    textTa = if (it.isNull(6)) null else it.getString(6)
                )
            }
        }
        return null
    }

    fun getVerseTexts(keys: List<Triple<Int, Int, Int>>): Map<Triple<Int, Int, Int>, Pair<String?, String?>> {
        if (keys.isEmpty()) return emptyMap()
        val result = mutableMapOf<Triple<Int, Int, Int>, Pair<String?, String?>>()
        val db = readableDatabase

        keys.chunked(100).forEach { batch ->
            val placeholders = batch.joinToString(" OR ") { "(book_id = ? AND chapter = ? AND verse = ?)" }
            val args = batch.flatMap { listOf(it.first.toString(), it.second.toString(), it.third.toString()) }.toTypedArray()
            val cursor = db.rawQuery(
                "SELECT book_id, chapter, verse, text_te, text_en FROM verses WHERE $placeholders",
                args
            )
            cursor.use {
                while (it.moveToNext()) {
                    val bId = it.getInt(0)
                    val ch = it.getInt(1)
                    val vs = it.getInt(2)
                    val te = if (it.isNull(3)) null else it.getString(3)
                    val en = if (it.isNull(4)) null else it.getString(4)
                    result[Triple(bId, ch, vs)] = Pair(te, en)
                }
            }
        }
        return result
    }

    fun getParagraphBreaks(bookId: Int, chapter: Int): Set<Int> {
        val set = mutableSetOf<Int>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT verse FROM paragraph_breaks WHERE book_id = ? AND chapter = ?",
            arrayOf(bookId.toString(), chapter.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                set.add(it.getInt(0))
            }
        }
        return set
    }

    fun getStrongs(id: String): StrongsEntry? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, lang, lemma, xlit, pron, derivation, strongs_def, kjv_def, pos FROM strongs WHERE id = ?",
            arrayOf(id.uppercase())
        )
        cursor.use {
            if (it.moveToNext()) {
                return StrongsEntry(
                    id = it.getString(0),
                    lang = it.getString(1),
                    lemma = if (it.isNull(2)) null else it.getString(2),
                    xlit = if (it.isNull(3)) null else it.getString(3),
                    pron = if (it.isNull(4)) null else it.getString(4),
                    derivation = if (it.isNull(5)) null else it.getString(5),
                    strongsDef = if (it.isNull(6)) null else it.getString(6),
                    kjvDef = if (it.isNull(7)) null else it.getString(7),
                    pos = if (it.isNull(8)) null else it.getString(8)
                )
            }
        }
        return null
    }

    fun searchVerses(query: String, limit: Int = 40): List<VerseSearchResult> {
        val list = mutableListOf<VerseSearchResult>()
        if (query.isBlank()) return list
        val db = readableDatabase
        val searchPattern = "%${query.trim()}%"
        val cursor = db.rawQuery(
            """
            SELECT v.id, v.book_id, b.book_key, b.name_en, b.name_te, v.chapter, v.verse, v.text_te, v.text_en 
            FROM verses v 
            JOIN books b ON v.book_id = b.id 
            WHERE v.text_en LIKE ? OR v.text_te LIKE ?
            ORDER BY v.book_id ASC, v.chapter ASC, v.verse ASC 
            LIMIT ?
            """.trimIndent(),
            arrayOf(searchPattern, searchPattern, limit.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    VerseSearchResult(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        bookKey = it.getString(2),
                        bookNameEn = it.getString(3),
                        bookNameTe = it.getString(4),
                        chapter = it.getInt(5),
                        verse = it.getInt(6),
                        textTe = if (it.isNull(7)) null else it.getString(7),
                        textEn = if (it.isNull(8)) null else it.getString(8)
                    )
                )
            }
        }
        return list
    }

    fun searchStrongs(query: String, limit: Int = 30): List<StrongsEntry> {
        val list = mutableListOf<StrongsEntry>()
        if (query.isBlank()) return list
        val db = readableDatabase
        val trimmed = query.trim()
        val searchPattern = "%$trimmed%"
        val cursor = db.rawQuery(
            """
            SELECT id, lang, lemma, xlit, pron, derivation, strongs_def, kjv_def, pos 
            FROM strongs 
            WHERE id = ? OR lemma LIKE ? OR xlit LIKE ? OR strongs_def LIKE ? OR kjv_def LIKE ?
            LIMIT ?
            """.trimIndent(),
            arrayOf(trimmed.uppercase(), searchPattern, searchPattern, searchPattern, searchPattern, limit.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    StrongsEntry(
                        id = it.getString(0),
                        lang = it.getString(1),
                        lemma = if (it.isNull(2)) null else it.getString(2),
                        xlit = if (it.isNull(3)) null else it.getString(3),
                        pron = if (it.isNull(4)) null else it.getString(4),
                        derivation = if (it.isNull(5)) null else it.getString(5),
                        strongsDef = if (it.isNull(6)) null else it.getString(6),
                        kjvDef = if (it.isNull(7)) null else it.getString(7),
                        pos = if (it.isNull(8)) null else it.getString(8)
                    )
                )
            }
        }
        return list
    }

    fun getPresetCollections(): List<PresetCollection> {
        val list = mutableListOf<PresetCollection>()
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT id, title, description, count FROM preset_collections ORDER BY count ASC", null)
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    PresetCollection(
                        id = it.getString(0),
                        title = it.getString(1),
                        description = it.getString(2),
                        count = it.getInt(3)
                    )
                )
            }
        }
        return list
    }

    fun getPresetVerses(collectionId: String): List<Triple<Int, Int, Int>> {
        val list = mutableListOf<Triple<Int, Int, Int>>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, chapter, verse FROM preset_verses WHERE collection_id = ?",
            arrayOf(collectionId)
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(Triple(it.getInt(0), it.getInt(1), it.getInt(2)))
            }
        }
        return list
    }

    // Delegations to UserDatabaseHelper for backward compatibility
    fun getUserMemoryVerses(): List<UserMemoryVerse> {
        val userDb = UserDatabaseHelper.getInstance(context)
        val userVerses = userDb.getUserVerses()
        if (userVerses.isEmpty()) return emptyList()

        val books = getBooksMap()
        val verseTexts = getVerseTexts(userVerses.map { Triple(it.bookId, it.chapter, it.verse) })

        return userVerses.map { uv ->
            val book = books[uv.bookId]
            val (te, en) = verseTexts[Triple(uv.bookId, uv.chapter, uv.verse)] ?: Pair(null, null)
            UserMemoryVerse(
                id = uv.id,
                bookId = uv.bookId,
                bookKey = book?.key ?: "",
                bookNameEn = book?.nameEn ?: "",
                bookNameTe = book?.nameTe ?: "",
                chapter = uv.chapter,
                verse = uv.verse,
                textTe = te,
                textEn = en,
                status = uv.status,
                repetition = uv.repetition,
                interval = uv.interval,
                efactor = uv.efactor,
                nextDueDate = uv.nextDueDate,
                createdAt = uv.createdAt
            )
        }
    }

    fun addUserVerse(bookId: Int, chapter: Int, verse: Int): Boolean {
        return UserDatabaseHelper.getInstance(context).addUserVerse(bookId, chapter, verse)
    }

    fun removeUserVerse(id: Long) {
        UserDatabaseHelper.getInstance(context).removeUserVerse(id)
    }

    fun gradeUserVerse(id: Long, score: Int) {
        UserDatabaseHelper.getInstance(context).gradeUserVerse(id, score)
    }

    fun getStreak(): Int {
        return UserDatabaseHelper.getInstance(context).getStreak()
    }

    fun addPresetCollection(collectionId: String): Int {
        val verses = getPresetVerses(collectionId)
        return UserDatabaseHelper.getInstance(context).addUserVerses(verses)
    }

    fun getBookGuide(bookId: Int): BookGuide? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, book_key, subtitle, structure_formula, memory_sentence, icon FROM book_guides WHERE book_id = ?",
            arrayOf(bookId.toString())
        )
        val guideBase = cursor.use {
            if (it.moveToNext()) {
                Triple(
                    it.getString(1),
                    it.getString(2),
                    Triple(it.getString(3), it.getString(4), it.getString(5))
                )
            } else null
        } ?: return null

        val blocks = getGuideBlocks(bookId)
        val keyVerses = getGuideKeyVerses(bookId)
        val anchors = getChapterAnchors(bookId)

        return BookGuide(
            bookId = bookId,
            bookKey = guideBase.first,
            subtitle = guideBase.second,
            structureFormula = guideBase.third.first,
            memorySentence = guideBase.third.second,
            icon = guideBase.third.third,
            blocks = blocks,
            keyVerses = keyVerses,
            anchors = anchors
        )
    }

    fun getGuideBlocks(bookId: Int): List<GuideBlock> {
        val list = mutableListOf<GuideBlock>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_id, block_index, chapters, label, description, unit FROM guide_blocks WHERE book_id = ? ORDER BY block_index ASC",
            arrayOf(bookId.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    GuideBlock(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        blockIndex = it.getInt(2),
                        chapters = it.getString(3),
                        label = it.getString(4),
                        description = it.getString(5),
                        unit = it.getString(6)
                    )
                )
            }
        }
        return list
    }

    fun getGuideKeyVerses(bookId: Int): List<GuideKeyVerse> {
        val list = mutableListOf<GuideKeyVerse>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_id, ref, text, theme FROM guide_key_verses WHERE book_id = ? ORDER BY id ASC",
            arrayOf(bookId.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    GuideKeyVerse(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        ref = it.getString(2),
                        text = it.getString(3),
                        theme = if (it.isNull(4)) null else it.getString(4)
                    )
                )
            }
        }
        return list
    }

    fun getChapterAnchors(bookId: Int): List<ChapterAnchor> {
        val rawList = mutableListOf<ChapterAnchor>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT id, book_id, chapter, word, scene FROM chapter_anchors WHERE book_id = ? ORDER BY chapter ASC",
            arrayOf(bookId.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                rawList.add(
                    ChapterAnchor(
                        id = it.getLong(0),
                        bookId = it.getInt(1),
                        chapter = it.getInt(2),
                        word = it.getString(3),
                        scene = it.getString(4)
                    )
                )
            }
        }
        return rawList.mapIndexed { index, anchor ->
            val prevWord = if (index > 0) rawList[index - 1].word else null
            val nextWord = if (index < rawList.size - 1) rawList[index + 1].word else null
            anchor.copy(prevWord = prevWord, nextWord = nextWord)
        }
    }

    fun getCrossReferences(bookId: Int, chapter: Int, verse: Int): List<CrossReference> {
        val list = mutableListOf<CrossReference>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT cr.id, cr.from_book_id, cr.from_chapter, cr.from_verse, cr.to_ref,
                   cr.to_book_id, cr.to_chapter, cr.to_verse, cr.to_end_verse,
                   v.text_en, v.text_te
            FROM cross_references cr
            LEFT JOIN verses v ON v.book_id = cr.to_book_id AND v.chapter = cr.to_chapter AND v.verse = cr.to_verse
            WHERE cr.from_book_id = ? AND cr.from_chapter = ? AND cr.from_verse = ?
            ORDER BY cr.id ASC
            """.trimIndent(),
            arrayOf(bookId.toString(), chapter.toString(), verse.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    CrossReference(
                        id = it.getLong(0),
                        fromBookId = it.getInt(1),
                        fromChapter = it.getInt(2),
                        fromVerse = it.getInt(3),
                        toRef = it.getString(4),
                        toBookId = if (it.isNull(5)) null else it.getInt(5),
                        toChapter = if (it.isNull(6)) null else it.getInt(6),
                        toVerse = if (it.isNull(7)) null else it.getInt(7),
                        toEndVerse = if (it.isNull(8)) null else it.getInt(8),
                        targetTextEn = if (it.isNull(9)) null else it.getString(9),
                        targetTextTe = if (it.isNull(10)) null else it.getString(10)
                    )
                )
            }
        }
        return list
    }

    fun getCrossReferenceCount(bookId: Int, chapter: Int, verse: Int): Int {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT COUNT(*) FROM cross_references WHERE from_book_id = ? AND from_chapter = ? AND from_verse = ?",
            arrayOf(bookId.toString(), chapter.toString(), verse.toString())
        )
        cursor.use {
            if (it.moveToNext()) {
                return it.getInt(0)
            }
        }
        return 0
    }

    fun getCrossReferenceCountsForChapter(bookId: Int, chapter: Int): Map<Int, Int> {
        val map = mutableMapOf<Int, Int>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT from_verse, COUNT(*) FROM cross_references WHERE from_book_id = ? AND from_chapter = ? GROUP BY from_verse",
            arrayOf(bookId.toString(), chapter.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                map[it.getInt(0)] = it.getInt(1)
            }
        }
        return map
    }

    fun isOtQuote(bookId: Int, chapter: Int, verse: Int): Boolean {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT 1 FROM ot_quotes WHERE nt_book_id = ? AND nt_chapter = ? AND nt_verse = ? LIMIT 1",
            arrayOf(bookId.toString(), chapter.toString(), verse.toString())
        )
        cursor.use {
            return it.moveToNext()
        }
    }

    fun getOtQuotesForChapter(bookId: Int, chapter: Int): Set<Int> {
        val set = mutableSetOf<Int>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT nt_verse FROM ot_quotes WHERE nt_book_id = ? AND nt_chapter = ?",
            arrayOf(bookId.toString(), chapter.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                set.add(it.getInt(0))
            }
        }
        return set
    }
}


