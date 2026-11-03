package com.example.telugubible.ui

internal enum class BackTarget { READER, GUIDE, SETTINGS, RETENTION, TODAY, EXIT }

// Match screen rendering order: dismiss the visible destination before its parent tab.
internal fun backTarget(
    reader: Boolean,
    guide: Boolean,
    settings: Boolean,
    retention: Boolean,
    atToday: Boolean
): BackTarget = when {
    reader -> BackTarget.READER
    guide -> BackTarget.GUIDE
    settings -> BackTarget.SETTINGS
    retention -> BackTarget.RETENTION
    !atToday -> BackTarget.TODAY
    else -> BackTarget.EXIT
}
