package com.crowdin.cli.utils;

import org.apache.commons.lang3.SystemUtils;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class UtilsTest {

    @Test
    public void testGetAppName() {
        assertNotNull(Utils.getAppName());
    }

    @Test
    public void testGetAppVersion() {
        assertNotNull(Utils.getAppVersion());
    }

    @Test
    public void testGetBaseUrl() {
        assertNotNull(Utils.getBaseUrl());
    }

    @Test
    public void testIsWindows() {
        assertEquals(SystemUtils.IS_OS_WINDOWS, Utils.isWindows());
    }

    @Test
    public void testBuildUserAgent() {
        assertNotNull(Utils.buildUserAgent());
    }
}
