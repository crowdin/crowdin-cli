package com.crowdin.cli;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class LauncherTest {

    @Test
    void parsesLegacyOneDotScheme() {
        assertEquals(8, Launcher.parseMajor("1.8"));
        assertEquals(7, Launcher.parseMajor("1.7"));
    }

    @Test
    void parsesModernSingleNumberScheme() {
        assertEquals(17, Launcher.parseMajor("17"));
        assertEquals(21, Launcher.parseMajor("21"));
    }

    @Test
    void parsesModernSchemeWithMinorComponent() {
        assertEquals(17, Launcher.parseMajor("17.0.5"));
    }

    @Test
    void returnsZeroForMissingOrBlankValue() {
        assertEquals(0, Launcher.parseMajor(null));
        assertEquals(0, Launcher.parseMajor(""));
        assertEquals(0, Launcher.parseMajor("   "));
    }

    @Test
    void returnsZeroForUnparseableValue() {
        assertEquals(0, Launcher.parseMajor("not-a-version"));
    }

    @Test
    void thresholdRejectsOlderRuntimesAndAcceptsSupportedOnes() {
        assertTrue(Launcher.parseMajor("1.8") < Launcher.MIN_JAVA_MAJOR);
        assertTrue(Launcher.parseMajor("11") < Launcher.MIN_JAVA_MAJOR);
        assertFalse(Launcher.parseMajor("17") < Launcher.MIN_JAVA_MAJOR);
        assertFalse(Launcher.parseMajor("21") < Launcher.MIN_JAVA_MAJOR);
    }
}
