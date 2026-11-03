package com.example.telugubible.util

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.content.ContextCompat
import com.example.telugubible.MainActivity
import com.example.telugubible.data.model.Book
import com.example.telugubible.data.model.ReadingPosition
import com.example.telugubible.data.repository.BibleRepository
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update

data class BackgroundListenState(
    val playing: Boolean = false,
    val index: Int = -1,
    val itemId: Long = -1,
    val iteration: Int = 1,
    val repeat: Int = 1,
    val source: String = "",
    val error: String? = null
)

internal fun nextListeningChapter(books: List<Book>, bookId: Int, chapter: Int): ReadingPosition? {
    val ordered = books.sortedBy { it.id }
    val index = ordered.indexOfFirst { it.id == bookId }
    if (index < 0 || chapter !in 1..ordered[index].chapters) return null
    if (chapter < ordered[index].chapters) return ReadingPosition(bookId, chapter + 1)
    return ordered.getOrNull(index + 1)?.let { ReadingPosition(it.id, 1) }
}

/** A service-owned queue keeps the listening session alive independently of the screen. */
class BackgroundListenService : Service() {
    companion object {
        private const val CHANNEL = "listening"
        private const val NOTIFICATION_ID = 801
        private const val STOP = "com.example.telugubible.STOP_LISTENING"
        private const val START = "com.example.telugubible.START_LISTENING"
        private val mutableState = MutableStateFlow(BackgroundListenState())
        val state = mutableState.asStateFlow()

        fun start(context: Context, texts: List<String>, languages: List<String>, ids: LongArray,
                  index: Int, repeat: Int, autoAdvance: Boolean, speed: Float, source: String = "practice",
                  readerVersion: String? = null): Boolean {
            if (texts.isEmpty() || texts.size != languages.size || texts.size != ids.size || index !in texts.indices) return false
            // Stay comfortably below Android's intent transaction limit.
            if (texts.sumOf { it.length } > 200_000) return false
            val intent = Intent(context, BackgroundListenService::class.java).setAction(START)
                .putStringArrayListExtra("texts", ArrayList(texts))
                .putStringArrayListExtra("languages", ArrayList(languages))
                .putExtra("ids", ids).putExtra("index", index).putExtra("repeat", repeat)
                .putExtra("advance", autoAdvance).putExtra("speed", speed).putExtra("source", source)
                .putExtra("readerVersion", readerVersion)
            return try { ContextCompat.startForegroundService(context, intent); true } catch (_: Exception) { false }
        }

        fun stop(context: Context) {
            if (state.value.playing) context.startService(Intent(context, BackgroundListenService::class.java).setAction(STOP))
        }

        fun forgetPosition() {
            mutableState.update { if (it.source == "practice") it.copy(index = -1, itemId = -1) else it }
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var manager: TtsManager? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var session: MediaSession? = null
    private var focusRequest: AudioFocusRequest? = null
    private val audio by lazy { getSystemService(AudioManager::class.java) }
    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) finish()
    }
    private var texts = emptyList<String>()
    private var languages = emptyList<String>()
    private var ids = longArrayOf()
    private var index = 0
    private var iteration = 1
    private var repeat = 1
    private var advance = false
    private var speed = 1f
    private var source = ""
    private var readerVersion: String? = null
    private var generation = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= 26) getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "Listening", NotificationManager.IMPORTANCE_LOW))
        session = MediaSession(this, "Remora listening").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onStop() { finish() }
                override fun onPause() { finish() }
            })
            setPlaybackState(PlaybackState.Builder().setActions(PlaybackState.ACTION_STOP or PlaybackState.ACTION_PAUSE)
                .setState(PlaybackState.STATE_PLAYING, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f).build())
            isActive = true
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == STOP) { finish(); return START_NOT_STICKY }
        if (intent?.action != START) { finish(); return START_NOT_STICKY }
        startForeground(NOTIFICATION_ID, notification())
        generation++
        manager?.shutdown()
        texts = intent.getStringArrayListExtra("texts") ?: arrayListOf()
        languages = intent.getStringArrayListExtra("languages") ?: arrayListOf()
        ids = intent.getLongArrayExtra("ids") ?: longArrayOf()
        index = intent.getIntExtra("index", 0)
        repeat = intent.getIntExtra("repeat", 1).coerceIn(1, 999)
        advance = intent.getBooleanExtra("advance", false)
        speed = intent.getFloatExtra("speed", 1f).coerceIn(0.5f, 2f)
        source = intent.getStringExtra("source").orEmpty()
        readerVersion = intent.getStringExtra("readerVersion")
        iteration = 1
        if (texts.size != ids.size || texts.size != languages.size || index !in texts.indices || !requestFocus()) {
            finish("Unable to start listening."); return START_NOT_STICKY
        }
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Remora:Listening").apply { acquire(4 * 60 * 60 * 1000L) }
        val player = TtsManager(this)
        manager = player
        val run = generation
        mutableState.value = BackgroundListenState(true, index, ids[index], iteration, repeat, source)
        scope.launch {
            val ready = withTimeoutOrNull(15_000) { player.state.first { it.isReady || it.initializationFailed } }
            if (run != generation) return@launch
            if (ready?.isReady == true) play(run) else finish("Speech is unavailable. Check your device's text-to-speech voice.")
        }
        return START_NOT_STICKY
    }

    private fun play(run: Int) {
        if (run != generation) return
        mutableState.value = BackgroundListenState(true, index, ids[index], iteration, repeat, source)
        val started = manager?.speak(texts[index], languages[index], speed,
            onFailure = { if (run == generation) finish("Speech could not be played. Check your device's voice.") },
            onDone = {
                if (run == generation) {
                    when {
                        iteration < repeat -> iteration++
                        advance && index < texts.lastIndex -> { index++; iteration = 1 }
                        advance && readerVersion != null && source.startsWith("reader:") -> {
                            loadNextChapter(run)
                            return@speak
                        }
                        else -> { finish(); return@speak }
                    }
                    play(run)
                }
            }) == true
        if (!started) finish("Speech is unavailable. Check your device's voice.")
    }

    private fun loadNextChapter(run: Int) {
        val version = readerVersion ?: return
        val parts = source.split(':')
        val bookId = parts.getOrNull(1)?.toIntOrNull()
        val chapter = parts.getOrNull(2)?.toIntOrNull()
        if (bookId == null || chapter == null) { finish("Couldn't continue to the next chapter."); return }
        scope.launch {
            try {
                val repository = BibleRepository(applicationContext)
                val next = nextListeningChapter(repository.getBooks(), bookId, chapter)
                if (run != generation) return@launch
                if (next == null) { finish(); return@launch }
                val verses = repository.getChapterVerses(next.bookId, next.chapter, version)
                if (run != generation) return@launch
                if (verses.isEmpty()) { finish("Couldn't load the next chapter. Please try again."); return@launch }
                val language = when (version.uppercase()) { "TELIRV" -> "te"; "TBSI" -> "ta"; else -> "en" }
                texts = verses.map { it.getTextForVersion(version) }
                languages = List(verses.size) { language }
                ids = verses.map { it.verse.toLong() }.toLongArray()
                index = 0
                iteration = 1
                source = "reader:${next.bookId}:${next.chapter}"
                play(run)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                if (run == generation) finish("Couldn't load the next chapter. Please try again.")
            }
        }
    }

    private fun requestFocus(): Boolean {
        val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
        return if (Build.VERSION.SDK_INT >= 26) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(focusListener).build()
            focusRequest = request
            audio.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audio.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun notification(): android.app.Notification {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this, 1, Intent(this, BackgroundListenService::class.java).setAction(STOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(this, CHANNEL) else android.app.Notification.Builder(this)
        return builder.setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Listening to Scripture").setContentText("Tap Stop to end playback")
            .setContentIntent(open).setOngoing(true).addAction(android.app.Notification.Action.Builder(null, "Stop", stop).build())
            .setStyle(android.app.Notification.MediaStyle().setMediaSession(session?.sessionToken).setShowActionsInCompactView(0))
            .build()
    }

    private fun finish(error: String? = null) {
        generation++
        manager?.shutdown(); manager = null
        focusRequest?.let { if (Build.VERSION.SDK_INT >= 26) audio.abandonAudioFocusRequest(it) }
        @Suppress("DEPRECATION")
        if (Build.VERSION.SDK_INT < 26) audio.abandonAudioFocus(focusListener)
        focusRequest = null
        wakeLock?.let { if (it.isHeld) it.release() }; wakeLock = null
        mutableState.update { it.copy(playing = false, error = error) }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        generation++
        manager?.shutdown(); manager = null
        focusRequest?.let { if (Build.VERSION.SDK_INT >= 26) audio.abandonAudioFocusRequest(it) }
        @Suppress("DEPRECATION")
        if (Build.VERSION.SDK_INT < 26) audio.abandonAudioFocus(focusListener)
        wakeLock?.let { if (it.isHeld) it.release() }
        mutableState.update { it.copy(playing = false) }
        session?.release(); session = null
        scope.cancel()
        super.onDestroy()
    }
}
