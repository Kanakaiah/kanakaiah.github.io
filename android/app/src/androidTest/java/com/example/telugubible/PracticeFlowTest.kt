package com.example.telugubible

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.material3.Surface
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.example.telugubible.data.db.UserDatabaseHelper
import com.example.telugubible.data.model.DisplayLanguage
import com.example.telugubible.data.repository.BibleRepository
import com.example.telugubible.theme.RemoraTheme
import com.example.telugubible.ui.practice.*
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File

class PracticeFlowTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private lateinit var repository: BibleRepository
    private lateinit var vm: PracticeViewModel
    private var verseId: Long? = null
    private var topicId: String? = null
    private var exited = false

    @Before fun setUp() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        check(context.packageName.endsWith(".uitest")) { "Fixtures require the isolated test app" }
        repository = BibleRepository(context)
        runBlocking {
            val existing = repository.getUserMemoryVerses()
            val number = (1..31).first { candidate -> existing.none { it.bookId == 1 && it.chapter == 1 && it.verse == candidate } }
            check(UserDatabaseHelper.getInstance(context).addUserVerse(1, 1, number))
            verseId = repository.getUserMemoryVerses().single { it.bookId == 1 && it.chapter == 1 && it.verse == number }.id
            topicId = repository.createTopic("Practice UI fixture").id
            repository.addTopicToVerse(verseId!!, topicId!!)
        }
        compose.runOnUiThread {
            vm = ViewModelProvider(compose.activity, object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return PracticeViewModel(compose.activity.application, repository) as T
                }
            })[PracticeViewModel::class.java]
        }
        compose.waitUntil(15000) { !vm.uiState.value.isLoading }
        compose.runOnUiThread { vm.startCollectionReview(topicId) }
        compose.waitUntil(15000) { !vm.uiState.value.isLoading && vm.uiState.value.verses.size == 1 && vm.uiState.value.currentVerse?.id == verseId }
        compose.runOnUiThread {
            vm.setDisplayLanguage(DisplayLanguage.ENGLISH)
            vm.setPracticeMode(PracticeMode.READ)
        }
        compose.setContent { RemoraTheme("white") { Surface {
            PracticeScreen(vm, {}, { exited = true }, modifier = Modifier.widthIn(max = 400.dp).heightIn(max = 700.dp))
        } } }
    }

    @After fun cleanUp() = runBlocking {
        if (::repository.isInitialized) {
            verseId?.let { repository.removeUserVerse(it) }
            topicId?.let { repository.deleteTopic(it) }
        }
    }

    @Test fun recallRevealGradeAndExit() {
        compose.onNodeWithText("Good").assertDoesNotExist()
        val verseText = vm.uiState.value.currentVerse?.textEn.orEmpty()
        if (verseText.isNotBlank()) compose.onNodeWithText(verseText.take(30), substring = true).assertDoesNotExist()
        runBlocking { assertTrue(repository.getReviewLog().none { it.itemKind == "verse" && it.itemId == verseId.toString() }) }
        screenshot("practice-recall")
        compose.onNodeWithText("Show verse").performScrollTo().performClick()
        runBlocking { assertTrue(repository.getReviewLog().none { it.itemKind == "verse" && it.itemId == verseId.toString() }) }
        compose.onNodeWithText("Easy").performScrollTo().assertIsEnabled()
        screenshot("practice-revealed")
        compose.onNodeWithText("Good").performClick()
        compose.waitUntil(15000) { vm.uiState.value.isFinished && !vm.uiState.value.isGrading }
        compose.onNodeWithText("Practice complete").assertIsDisplayed()
        runBlocking { assertEquals(4, repository.getReviewLog().filter { it.itemKind == "verse" && it.itemId == verseId.toString() }.single().score) }
        screenshot("practice-complete")
        compose.onNodeWithText("Back to Today").performScrollTo().performClick()
        compose.runOnIdle { assertTrue(exited) }
    }

    @Test fun firstLetterHintsLimitGrades() {
        compose.onNodeWithText("Mode: Recall").performClick()
        compose.onNodeWithText("First letters").performClick()
        compose.onNodeWithContentDescription("Hint").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Hint").performClick()
        compose.onNodeWithText("Done Reciting — Check Recall").performScrollTo().performClick()
        compose.onNodeWithText("Easy").performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText("Good").assertIsNotEnabled()
        compose.onNodeWithText("Hard").assertIsEnabled()
        screenshot("practice-hint-grades")
        compose.onNodeWithText("Hard").performClick()
        compose.waitUntil(15000) { vm.uiState.value.isFinished && !vm.uiState.value.isGrading }
        runBlocking { assertEquals(3, repository.getReviewLog().filter { it.itemKind == "verse" && it.itemId == verseId.toString() }.single().score) }
    }

    @Test fun typedAnswerRemainsVisibleBeforeGrading() {
        compose.onNodeWithText("Mode: Recall").performClick()
        compose.onNodeWithText("Type").performClick()
        compose.onNode(hasSetTextAction()).performScrollTo().performClick()
        compose.waitUntil(10000) {
            ViewCompat.getRootWindowInsets(compose.activity.window.decorView)?.isVisible(WindowInsetsCompat.Type.ime()) == true
        }
        compose.waitForIdle()
        compose.onNode(hasSetTextAction()).performTextInput("In the beginning")
        compose.onNode(hasSetTextAction()).assertTextContains("In the beginning")
        compose.onNodeWithText("Check", substring = false).performScrollTo().assertIsEnabled()
        compose.waitForIdle()
        compose.onNodeWithText("Check", substring = false).performClick()
        compose.runOnIdle { assertTrue("Check must reveal the submitted answer", vm.uiState.value.isRevealed) }
        compose.onNodeWithText("words matched", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Your answer").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("In the beginning").assertIsDisplayed()
        compose.onNodeWithText("Again").performScrollTo().performClick()
        compose.waitUntil(15000) { vm.uiState.value.isFinished && !vm.uiState.value.isGrading }
        runBlocking {
            val log = repository.getReviewLog().filter { it.itemKind == "verse" && it.itemId == verseId.toString() }.single()
            assertEquals(1, log.score)
            assertEquals("typing", log.mode)
            assertNotNull(log.measuredAccuracy)
        }
    }

    private fun screenshot(name: String) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "baseline").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use {
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
