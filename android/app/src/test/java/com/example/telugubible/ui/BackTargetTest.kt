package com.example.telugubible.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class BackTargetTest {
    @Test fun detailClosesBeforeItsParentTab() {
        assertEquals(BackTarget.READER, backTarget(true, true, false, false, false))
        assertEquals(BackTarget.GUIDE, backTarget(false, true, false, false, false))
        assertEquals(BackTarget.SETTINGS, backTarget(false, false, true, false, false))
        assertEquals(BackTarget.RETENTION, backTarget(false, false, false, true, false))
    }

    @Test fun everyOtherRootReturnsToTodayBeforeExit() {
        assertEquals(BackTarget.TODAY, backTarget(false, false, false, false, false))
        assertEquals(BackTarget.EXIT, backTarget(false, false, false, false, true))
    }
}
