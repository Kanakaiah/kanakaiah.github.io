package com.example.telugubible.util

import com.example.telugubible.data.db.ChapterProgressEntity
import com.example.telugubible.data.db.ThemeProgressEntity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.ChapterAnchor
import com.example.telugubible.data.model.UserMemoryVerse
import kotlin.math.max

sealed class SessionItem(
    open val id: String,
    open val kind: String,
    open val dueAt: Long
) {
    data class Verse(
        val verseId: Long,
        val bookId: Int,
        val bookName: String,
        val chapter: Int,
        val verse: Int,
        val textEn: String,
        val textTe: String,
        val repetition: Int,
        override val dueAt: Long
    ) : SessionItem("verse:$verseId", "verse", dueAt)

    data class Anchor(
        val bookId: Int,
        val bookName: String,
        val bookKey: String,
        val chapter: Int,
        val word: String,
        val scene: String,
        val direction: AnchorDirection,
        val siblings: List<AnchorSibling>,
        val nominated: Boolean,
        val repetition: Int,
        val interval: Int,
        override val dueAt: Long
    ) : SessionItem("anchor:$bookId:$chapter", "anchor", dueAt)

    data class Introduce(
        val bookId: Int,
        val bookName: String,
        val bookKey: String,
        val chapter: Int,
        val word: String,
        val scene: String,
        val prevWord: String?
    ) : SessionItem("introduce:$bookId:$chapter", "introduce", Long.MAX_VALUE)

    data class Theme(
        val bookId: Int,
        val bookName: String,
        val bookKey: String,
        val themeWord: String,
        val keyWord: String,
        val subtitle: String,
        override val dueAt: Long
    ) : SessionItem("theme:$bookId", "theme", dueAt)
}

data class SessionPlan(
    val items: List<SessionItem>,
    val heldBack: Int,
    val heldBackAll: Int,
    val newHeldBack: Int
)

data class SessionOptions(
    val cap: Int = 20,
    val newChapters: Int = 2,
    val bookId: Int? = null,
    val now: Long = System.currentTimeMillis(),
    val shuffle: ((List<SessionItem>) -> List<SessionItem>)? = null
)

object SessionPlanner {
    const val DEFAULT_CAP = 20
    private const val RESERVE_FRACTION = 0.3
    private const val WARM_UP = 3

    fun findCurrentBookId(
        allProgress: Map<String, ChapterProgressEntity>,
        anchorsByBook: Map<Int, List<ChapterAnchor>>,
        booksMap: Map<Int, Book>
    ): Int? {
        var bestBookId: Int? = null
        var latestTouch = 0L

        for (p in allProgress.values) {
            if (p.attempts > 0 && p.nextDueDate > latestTouch) {
                bestBookId = p.bookId
                latestTouch = p.nextDueDate
            }
        }

        if (bestBookId == null) return 1 // Start with Genesis

        val bookAnchors = anchorsByBook[bestBookId] ?: emptyList()
        val hasUntouched = bookAnchors.any { a ->
            val p = allProgress["$bestBookId:${a.chapter}"]
            p == null || p.attempts == 0
        }

        return if (hasUntouched) bestBookId else null
    }

    fun buildSession(
        allVerses: List<UserMemoryVerse>,
        allChapterProgress: Map<String, ChapterProgressEntity>,
        allThemeProgress: Map<Int, ThemeProgressEntity>,
        booksMap: Map<Int, Book>,
        anchorsByBook: Map<Int, List<ChapterAnchor>>,
        options: SessionOptions = SessionOptions()
    ): SessionPlan {
        val now = options.now

        // 1. Due Verses
        val verseItems: List<SessionItem.Verse> = allVerses
            .filter { it.nextDueDate <= now }
            .map { v ->
                val book = booksMap[v.bookId]
                SessionItem.Verse(
                    verseId = v.id,
                    bookId = v.bookId,
                    bookName = book?.nameEn ?: "Book ${v.bookId}",
                    chapter = v.chapter,
                    verse = v.verse,
                    textEn = v.textEn ?: "",
                    textTe = v.textTe ?: "",
                    repetition = v.repetition,
                    dueAt = v.nextDueDate
                )
            }

        // 2. Due Chapter Anchors
        val anchorCandidates = allChapterProgress.values
            .filter { it.attempts > 0 && it.nextDueDate <= now }
            .sortedBy { it.nextDueDate }

        val anchorItems = mutableListOf<SessionItem.Anchor>()
        for (cp in anchorCandidates) {
            val book = booksMap[cp.bookId] ?: continue
            val bookAnchors = anchorsByBook[cp.bookId] ?: emptyList()
            val anchor = bookAnchors.find { it.chapter == cp.chapter } ?: continue
            val siblings = bookAnchors.map { AnchorSibling(it.chapter, it.word) }

            anchorItems.add(
                SessionItem.Anchor(
                    bookId = cp.bookId,
                    bookName = book.nameEn,
                    bookKey = book.key,
                    chapter = cp.chapter,
                    word = anchor.word,
                    scene = anchor.scene,
                    direction = AnchorJudge.directionFor(cp.repetition, hasArt = true),
                    siblings = siblings,
                    nominated = false,
                    repetition = cp.repetition,
                    interval = cp.interval,
                    dueAt = cp.nextDueDate
                )
            )
        }

        // 3. Due Book Themes
        val themeItems: List<SessionItem.Theme> = allThemeProgress.values
            .filter { it.attempts > 0 && it.nextDueDate <= now }
            .sortedBy { it.nextDueDate }
            .mapNotNull { tp ->
                val book = booksMap[tp.bookId] ?: return@mapNotNull null
                SessionItem.Theme(
                    bookId = tp.bookId,
                    bookName = book.nameEn,
                    bookKey = book.key,
                    themeWord = book.themeWord,
                    keyWord = book.keyWord,
                    subtitle = book.subtitle,
                    dueAt = tp.nextDueDate
                )
            }

        // 4. New Material (Introduce + Anchor atomic pairs)
        val newPairs = mutableListOf<List<SessionItem>>()
        val targetBookId = options.bookId ?: findCurrentBookId(allChapterProgress, anchorsByBook, booksMap)
        if (targetBookId != null && options.newChapters > 0) {
            val book = booksMap[targetBookId]
            val anchors = anchorsByBook[targetBookId] ?: emptyList()
            if (book != null && anchors.isNotEmpty()) {
                val freshAnchors = anchors
                    .filter { a ->
                        val p = allChapterProgress["$targetBookId:${a.chapter}"]
                        p == null || p.attempts == 0
                    }
                    .sortedBy { it.chapter }
                    .take(options.newChapters)

                for (a in freshAnchors) {
                    val prev = anchors.find { it.chapter == a.chapter - 1 }
                    val siblings = anchors.map { AnchorSibling(it.chapter, it.word) }
                    newPairs.add(
                        listOf(
                            SessionItem.Introduce(
                                bookId = targetBookId,
                                bookName = book.nameEn,
                                bookKey = book.key,
                                chapter = a.chapter,
                                word = a.word,
                                scene = a.scene,
                                prevWord = prev?.word
                            ),
                            SessionItem.Anchor(
                                bookId = targetBookId,
                                bookName = book.nameEn,
                                bookKey = book.key,
                                chapter = a.chapter,
                                word = a.word,
                                scene = a.scene,
                                direction = AnchorDirection.N2W,
                                siblings = siblings,
                                nominated = false,
                                repetition = 0,
                                interval = 0,
                                dueAt = now
                            )
                        )
                    )
                }
            }
        }

        // 5. Reserved share for new material (30% fraction)
        val maxNewSlots = max(2, (options.cap * RESERVE_FRACTION).toInt())
        val admittedPairs = mutableListOf<List<SessionItem>>()
        var newSlots = 0
        for (pair in newPairs) {
            if (newSlots + pair.size > maxNewSlots) break
            admittedPairs.add(pair)
            newSlots += pair.size
        }

        // 6. Selection of reviews: prioritize most overdue
        val allDue = mutableListOf<SessionItem>()
        allDue.addAll(verseItems)
        allDue.addAll(anchorItems)
        allDue.addAll(themeItems)

        val focus = options.bookId
        val inFocusReviews = if (focus != null) {
            allDue.filter { item ->
                when (item) {
                    is SessionItem.Verse -> item.bookId == focus
                    is SessionItem.Anchor -> item.bookId == focus
                    is SessionItem.Theme -> item.bookId == focus
                    else -> true
                }
            }
        } else {
            allDue
        }

        val mostOverdueFirst = inFocusReviews.sortedBy { it.dueAt }
        val remainingSlots = max(0, options.cap - newSlots)
        val candidateReviews = mostOverdueFirst.take(remainingSlots)

        // Presentation interleaving (shuffle selected reviews to eliminate sequential cues)
        val shuffleFn = options.shuffle ?: { it.shuffled() }
        val admittedReviews = shuffleFn(candidateReviews)

        // 7. Warm-up placement: 3 reviews -> new pairs -> rest of reviews
        val items = mutableListOf<SessionItem>()
        items.addAll(admittedReviews.take(WARM_UP))
        items.addAll(admittedPairs.flatten())
        items.addAll(admittedReviews.drop(WARM_UP))

        val newOffered = newPairs.flatten().size
        val heldBack = max(0, inFocusReviews.size + newOffered - items.size)
        val heldBackAll = max(0, allDue.size + newOffered - items.size)
        val newHeldBack = max(0, newOffered - newSlots)

        return SessionPlan(
            items = items,
            heldBack = heldBack,
            heldBackAll = heldBackAll,
            newHeldBack = newHeldBack
        )
    }
}
