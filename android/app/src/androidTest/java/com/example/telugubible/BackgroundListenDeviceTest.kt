package com.example.telugubible

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import android.os.PowerManager
import com.example.telugubible.util.BackgroundListenService
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class BackgroundListenDeviceTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    @Test fun realEngineRepeatsAdvancesAndStops() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        check(context.packageName.endsWith(".uitest"))
        var started = false
        compose.runOnUiThread {
            started = BackgroundListenService.start(context,
                listOf("In the beginning.", "Let there be light."), listOf("en", "en"),
                longArrayOf(101, 102), 0, 2, true, 1f)
        }
        assertTrue(started)
        try {
            runBlocking { withTimeout(30_000) { BackgroundListenService.state.first { it.playing && it.index == 1 } } }
            assertEquals(102L, BackgroundListenService.state.value.itemId)
        } finally {
            compose.runOnUiThread { BackgroundListenService.stop(context) }
        }
        runBlocking { withTimeout(5000) { BackgroundListenService.state.first { !it.playing } } }
        assertNull(BackgroundListenService.state.value.error)
    }

    @Test fun speechContinuesWhenScreenTurnsOff() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        check(context.packageName.endsWith(".uitest"))
        check(context.getSystemService(PowerManager::class.java).isInteractive)
        var started = false
        compose.runOnUiThread {
            started = BackgroundListenService.start(context,
                listOf("In the beginning God created the heavens and the earth."), listOf("en"),
                longArrayOf(201), 0, 3, false, 1f)
        }
        assertTrue(started)
        try {
            runBlocking { withTimeout(10_000) { BackgroundListenService.state.first { it.playing } } }
            instrumentation.uiAutomation.executeShellCommand("input keyevent KEYCODE_SLEEP").close()
            runBlocking { withTimeout(30_000) { BackgroundListenService.state.first { it.playing && it.iteration >= 2 } } }
            assertFalse(context.getSystemService(PowerManager::class.java).isInteractive)
        } finally {
            instrumentation.uiAutomation.executeShellCommand("input keyevent KEYCODE_WAKEUP").close()
            compose.runOnUiThread { BackgroundListenService.stop(context) }
        }
    }

    @Test fun speechContinuesAfterLeavingApp() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        check(context.packageName.endsWith(".uitest"))
        var started = false
        compose.runOnUiThread {
            started = BackgroundListenService.start(context,
                listOf("In the beginning God created the heavens and the earth."), listOf("en"),
                longArrayOf(301), 0, 3, false, 1f)
        }
        assertTrue(started)
        try {
            runBlocking { withTimeout(10_000) { BackgroundListenService.state.first { it.playing } } }
            instrumentation.uiAutomation.executeShellCommand("input keyevent KEYCODE_HOME").close()
            runBlocking { withTimeout(30_000) { BackgroundListenService.state.first { it.playing && it.iteration >= 2 } } }
        } finally {
            compose.runOnUiThread { BackgroundListenService.stop(context) }
        }
    }
}
