package com.example.telugubible.ui.settings

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.OutputStream
import org.junit.Assert.*
import org.junit.Test

class BackupFileIOTest {
    @Test fun roundTripAndMissingOrFailedStreams() {
        val output = ByteArrayOutputStream()
        BackupFileIO.write({ output }, "{\"verses\":[]}")
        assertEquals("{\"verses\":[]}", BackupFileIO.read { ByteArrayInputStream(output.toByteArray()) })
        assertThrows(IllegalStateException::class.java) { BackupFileIO.write({ null }, "data") }
        assertThrows(IllegalStateException::class.java) { BackupFileIO.read { null } }
        assertThrows(IllegalArgumentException::class.java) { BackupFileIO.read { ByteArrayInputStream(byteArrayOf()) } }
        assertThrows(IOException::class.java) { BackupFileIO.write({ object : OutputStream() {
            override fun write(value: Int) { throw IOException("failure") }
        } }, "data") }
    }
}
