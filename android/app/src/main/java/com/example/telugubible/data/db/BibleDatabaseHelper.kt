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
import com.example.telugubible.data.model.LinkDirection
import com.example.telugubible.data.model.PresetCollection
import com.example.telugubible.data.model.StepBibleWord
import com.example.telugubible.data.model.StepBibleWordOccurrence
import com.example.telugubible.data.model.StrongsEntry
import com.example.telugubible.data.model.UserMemoryVerse
import com.example.telugubible.data.model.Verse
import com.example.telugubible.data.model.VerseConnectionsData
import com.example.telugubible.data.model.VerseSearchResult
import com.example.telugubible.util.KjvVersification
import java.io.File
import java.io.FileOutputStream

data class PresetVerseEntry(
    val bookId: Int,
    val chapter: Int,
    val startVerse: Int,
    val endVerse: Int? = null,
    val reference: String = ""
)

class BibleDatabaseHelper(val context: Context) :
    SQLiteOpenHelper(context, STATIC_DB_NAME, null, STATIC_DB_VERSION) {

    companion object {
        const val ASSET_NAME = "bible.db"
        const val STATIC_DB_NAME = "bible_static.db"
        const val STATIC_DB_VERSION = 8
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

    fun getRangeVerseText(bookId: Int, chapter: Int, startVerse: Int, endVerse: Int): Pair<String?, String?> {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT text_te, text_en FROM verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse ASC",
            arrayOf(bookId.toString(), chapter.toString(), startVerse.toString(), endVerse.toString())
        )
        val teList = mutableListOf<String>()
        val enList = mutableListOf<String>()
        cursor.use {
            while (it.moveToNext()) {
                if (!it.isNull(0)) teList.add(it.getString(0))
                if (!it.isNull(1)) enList.add(it.getString(1))
            }
        }
        val te = if (teList.isNotEmpty()) teList.joinToString(" ") else null
        val en = if (enList.isNotEmpty()) enList.joinToString(" ") else null
        return Pair(te, en)
    }

    fun getPresetRangesMap(): Map<Triple<Int, Int, Int>, Int> {
        val map = mutableMapOf<Triple<Int, Int, Int>, Int>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, chapter, verse, reference FROM preset_verses WHERE reference LIKE '%-%'",
            null
        )
        cursor.use {
            while (it.moveToNext()) {
                val bId = it.getInt(0)
                val ch = it.getInt(1)
                val vs = it.getInt(2)
                val ref = it.getString(3) ?: ""
                val endVerse = ref.substringAfterLast(':', "").split('-').getOrNull(1)?.trim()?.toIntOrNull()
                if (endVerse != null && endVerse > vs) {
                    map[Triple(bId, ch, vs)] = endVerse
                }
            }
        }
        return map
    }

    fun getPresetVerseEntries(collectionId: String): List<PresetVerseEntry> {
        val list = mutableListOf<PresetVerseEntry>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT book_id, chapter, verse, reference FROM preset_verses WHERE collection_id = ?",
            arrayOf(collectionId)
        )
        cursor.use {
            while (it.moveToNext()) {
                val bId = it.getInt(0)
                val ch = it.getInt(1)
                val vs = it.getInt(2)
                val ref = it.getString(3) ?: ""
                val endVerse = if (ref.contains('-')) {
                    ref.substringAfterLast(':', "").split('-').getOrNull(1)?.trim()?.toIntOrNull()
                } else null
                list.add(PresetVerseEntry(bId, ch, vs, endVerse, ref))
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
        val presetRanges = getPresetRangesMap()
        val verseTexts = getVerseTexts(userVerses.map { Triple(it.bookId, it.chapter, it.verse) })

        return userVerses.map { uv ->
            val book = books[uv.bookId]
            val effectiveEndVerse = uv.endVerse ?: presetRanges[Triple(uv.bookId, uv.chapter, uv.verse)]
            val (te, en) = if (effectiveEndVerse != null && effectiveEndVerse > uv.verse) {
                getRangeVerseText(uv.bookId, uv.chapter, uv.verse, effectiveEndVerse)
            } else {
                verseTexts[Triple(uv.bookId, uv.chapter, uv.verse)] ?: Pair(null, null)
            }
            UserMemoryVerse(
                id = uv.id,
                bookId = uv.bookId,
                bookKey = book?.key ?: "",
                bookNameEn = book?.nameEn ?: "",
                bookNameTe = book?.nameTe ?: "",
                chapter = uv.chapter,
                verse = uv.verse,
                endVerse = effectiveEndVerse,
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

    fun getCrossReferences(
        bookId: Int,
        chapter: Int,
        verse: Int,
        minVotes: Int = 4
    ): List<CrossReference> {
        val vid = KjvVersification.toVerseIndex(bookId, chapter, verse) ?: return emptyList()
        val db = readableDatabase
        val rawLinks = mutableListOf<Triple<Long, Pair<Int, Int>, Int>>()
        val effectiveMin = if (minVotes <= 0) Int.MIN_VALUE else minVotes
        val cursor = db.rawQuery(
            """
            SELECT id, to_start, to_end, votes
            FROM cross_references
            WHERE from_vid = ? AND votes >= ?
            ORDER BY to_start ASC, to_end ASC, id ASC
            """.trimIndent(),
            arrayOf(vid.toString(), effectiveMin.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                rawLinks.add(
                    Triple(
                        it.getLong(0),
                        Pair(it.getInt(1), it.getInt(2)),
                        it.getInt(3)
                    )
                )
            }
        }
        if (rawLinks.isEmpty()) return emptyList()

        // Batch-fetch all verse texts needed for snippets (up to 12 verses per range)
        val keysNeeded = rawLinks.flatMap { (_, range, _) ->
            val cappedEnd = minOf(range.second, range.first + 11)
            (range.first..cappedEnd).map { targetVid ->
                val c = KjvVersification.fromVerseIndex(targetVid)
                Triple(c.bookId, c.chapter, c.verse)
            }
        }.distinct()
        val textsMap = getVerseTexts(keysNeeded)

        return rawLinks.map { (id, range, votes) ->
            val toStart = range.first
            val toEnd = range.second
            val startCoord = KjvVersification.fromVerseIndex(toStart)
            val endCoord = KjvVersification.fromVerseIndex(toEnd)
            val toRef = KjvVersification.formatVerseIndexRange(toStart, toEnd)
            val (snippetTe, snippetEn) = buildSnippetFromMap(toStart, toEnd, textsMap)

            CrossReference(
                id = id,
                fromBookId = bookId,
                fromChapter = chapter,
                fromVerse = verse,
                toRef = toRef,
                toBookId = startCoord.bookId,
                toChapter = startCoord.chapter,
                toVerse = startCoord.verse,
                toEndVerse = if (toEnd > toStart && endCoord.bookId == startCoord.bookId && endCoord.chapter == startCoord.chapter) endCoord.verse else null,
                targetTextEn = snippetEn,
                targetTextTe = snippetTe,
                votes = votes,
                direction = LinkDirection.OUTGOING,
                otherStartVid = toStart,
                otherEndVid = toEnd,
                landingNote = null
            )
        }
    }

    fun getIncomingCrossReferences(
        bookId: Int,
        chapter: Int,
        verse: Int,
        minVotes: Int = 4
    ): List<CrossReference> {
        val vid = KjvVersification.toVerseIndex(bookId, chapter, verse) ?: return emptyList()
        val minStart = maxOf(0, vid - KjvVersification.MAX_TARGET_SPAN)
        val db = readableDatabase
        data class RawIncoming(val id: Long, val fromVid: Int, val toStart: Int, val toEnd: Int, val votes: Int)
        val rawLinks = mutableListOf<RawIncoming>()
        val effectiveMin = if (minVotes <= 0) Int.MIN_VALUE else minVotes
        val cursor = db.rawQuery(
            """
            SELECT id, from_vid, to_start, to_end, votes
            FROM cross_references
            WHERE to_start BETWEEN ? AND ? AND to_end >= ? AND votes >= ?
            ORDER BY from_vid ASC, to_start ASC, to_end ASC, id ASC
            """.trimIndent(),
            arrayOf(minStart.toString(), vid.toString(), vid.toString(), effectiveMin.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                rawLinks.add(
                    RawIncoming(
                        id = it.getLong(0),
                        fromVid = it.getInt(1),
                        toStart = it.getInt(2),
                        toEnd = it.getInt(3),
                        votes = it.getInt(4)
                    )
                )
            }
        }
        if (rawLinks.isEmpty()) return emptyList()

        val keysNeeded = rawLinks.map { raw ->
            val c = KjvVersification.fromVerseIndex(raw.fromVid)
            Triple(c.bookId, c.chapter, c.verse)
        }.distinct()
        val textsMap = getVerseTexts(keysNeeded)

        return rawLinks.map { raw ->
            val sourceCoord = KjvVersification.fromVerseIndex(raw.fromVid)
            val sourceRef = KjvVersification.formatVerseIndexRange(raw.fromVid, raw.fromVid)
            val pair = textsMap[Triple(sourceCoord.bookId, sourceCoord.chapter, sourceCoord.verse)]
            val landing = if (raw.toEnd > raw.toStart) {
                "to ${KjvVersification.formatVerseIndexRange(raw.toStart, raw.toEnd)}"
            } else null

            CrossReference(
                id = raw.id,
                fromBookId = bookId,
                fromChapter = chapter,
                fromVerse = verse,
                toRef = sourceRef,
                toBookId = sourceCoord.bookId,
                toChapter = sourceCoord.chapter,
                toVerse = sourceCoord.verse,
                toEndVerse = null,
                targetTextEn = pair?.second,
                targetTextTe = pair?.first,
                votes = raw.votes,
                direction = LinkDirection.INCOMING,
                otherStartVid = raw.fromVid,
                otherEndVid = raw.fromVid,
                landingNote = landing
            )
        }
    }

    fun getOriginalWordsForVerse(bookId: Int, chapter: Int, verse: Int): List<StepBibleWord> {
        val vid = KjvVersification.toVerseIndex(bookId, chapter, verse) ?: return emptyList()
        val list = mutableListOf<StepBibleWord>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            """
            SELECT w.id, w.strongs, w.lemma, w.transliteration, w.gloss, w.verse_count
            FROM stepbible_word_verses wv
            JOIN stepbible_words w ON w.id = wv.word_id
            WHERE wv.vid = ?
            ORDER BY w.verse_count ASC, w.id ASC
            """.trimIndent(),
            arrayOf(vid.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    StepBibleWord(
                        id = it.getInt(0),
                        strongs = it.getString(1),
                        lemma = it.getString(2),
                        transliteration = it.getString(3),
                        gloss = it.getString(4),
                        verseCount = it.getInt(5)
                    )
                )
            }
        }
        return list
    }

    fun getOccurrencesForStepBibleWord(wordId: Int): List<StepBibleWordOccurrence> {
        val vids = mutableListOf<Int>()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT vid FROM stepbible_word_verses WHERE word_id = ? ORDER BY vid ASC",
            arrayOf(wordId.toString())
        )
        cursor.use {
            while (it.moveToNext()) {
                vids.add(it.getInt(0))
            }
        }
        if (vids.isEmpty()) return emptyList()

        val coords = vids.map { KjvVersification.fromVerseIndex(it) }
        val keys = coords.map { Triple(it.bookId, it.chapter, it.verse) }
        val textsMap = getVerseTexts(keys)

        return coords.map { c ->
            val pair = textsMap[Triple(c.bookId, c.chapter, c.verse)]
            StepBibleWordOccurrence(
                vid = c.vid,
                bookId = c.bookId,
                chapter = c.chapter,
                verse = c.verse,
                refLabel = "${c.bookName} ${c.chapter}:${c.verse}",
                textEn = pair?.second,
                textTe = pair?.first
            )
        }
    }

    fun getVerseConnections(
        bookId: Int,
        chapter: Int,
        verse: Int,
        minVotes: Int = 4
    ): VerseConnectionsData {
        val vid = KjvVersification.toVerseIndex(bookId, chapter, verse) ?: 0
        val outgoing = getCrossReferences(bookId, chapter, verse, minVotes)
        val incoming = getIncomingCrossReferences(bookId, chapter, verse, minVotes)
        val words = getOriginalWordsForVerse(bookId, chapter, verse)
        return VerseConnectionsData(
            vid = vid,
            bookId = bookId,
            chapter = chapter,
            verse = verse,
            outgoing = outgoing,
            incoming = incoming,
            originalWords = words
        )
    }

    private fun buildSnippetFromMap(
        startVid: Int,
        endVid: Int,
        textsMap: Map<Triple<Int, Int, Int>, Pair<String?, String?>>,
        maxVerses: Int = 12
    ): Pair<String?, String?> {
        if (startVid == endVid) {
            val c = KjvVersification.fromVerseIndex(startVid)
            return textsMap[Triple(c.bookId, c.chapter, c.verse)] ?: Pair(null, null)
        }
        val total = endVid - startVid + 1
        val cappedEnd = minOf(endVid, startVid + maxVerses - 1)
        val teParts = mutableListOf<String>()
        val enParts = mutableListOf<String>()
        for (v in startVid..cappedEnd) {
            val c = KjvVersification.fromVerseIndex(v)
            val pair = textsMap[Triple(c.bookId, c.chapter, c.verse)]
            pair?.first?.takeIf { it.isNotBlank() }?.let { teParts.add("${c.verse} $it") }
            pair?.second?.takeIf { it.isNotBlank() }?.let { enParts.add("${c.verse} $it") }
        }
        val extra = total - maxVerses
        if (extra > 0) {
            val suffix = "(+ $extra more ${if (extra == 1) "verse" else "verses"})"
            if (teParts.isNotEmpty()) teParts.add(suffix)
            if (enParts.isNotEmpty()) enParts.add(suffix)
        }
        return Pair(
            teParts.takeIf { it.isNotEmpty() }?.joinToString(" "),
            enParts.takeIf { it.isNotEmpty() }?.joinToString(" ")
        )
    }

    fun getCrossReferenceCount(bookId: Int, chapter: Int, verse: Int, minVotes: Int = 4): Int {
        val vid = KjvVersification.toVerseIndex(bookId, chapter, verse) ?: return 0
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT COUNT(*) FROM cross_references WHERE from_vid = ? AND votes >= ?",
            arrayOf(vid.toString(), minVotes.toString())
        )
        cursor.use {
            if (it.moveToNext()) {
                return it.getInt(0)
            }
        }
        return 0
    }

    fun getCrossReferenceCountsForChapter(bookId: Int, chapter: Int, minVotes: Int = 4): Map<Int, Int> {
        val range = KjvVersification.getChapterVidRange(bookId, chapter) ?: return emptyMap()
        val startVid = range.first
        val endVid = range.last
        val map = mutableMapOf<Int, Int>()
        val db = readableDatabase

        // 1. Outgoing counts for each verse in the chapter
        val outCursor = db.rawQuery(
            "SELECT from_vid, COUNT(*) FROM cross_references WHERE from_vid BETWEEN ? AND ? AND votes >= ? GROUP BY from_vid",
            arrayOf(startVid.toString(), endVid.toString(), minVotes.toString())
        )
        outCursor.use {
            while (it.moveToNext()) {
                val vid = it.getInt(0)
                val vNum = vid - startVid + 1
                map[vNum] = it.getInt(1)
            }
        }

        // 2. Also ensure verses that only have incoming links at >= minVotes get a non-zero count for the ✻ marker
        val minStart = maxOf(0, startVid - KjvVersification.MAX_TARGET_SPAN)
        val inCursor = db.rawQuery(
            "SELECT to_start, to_end FROM cross_references WHERE to_start BETWEEN ? AND ? AND to_end >= ? AND votes >= ?",
            arrayOf(minStart.toString(), endVid.toString(), startVid.toString(), minVotes.toString())
        )
        inCursor.use {
            while (it.moveToNext()) {
                val s = maxOf(startVid, it.getInt(0))
                val e = minOf(endVid, it.getInt(1))
                for (vid in s..e) {
                    val vNum = vid - startVid + 1
                    if (!map.containsKey(vNum)) {
                        map[vNum] = 1
                    }
                }
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


