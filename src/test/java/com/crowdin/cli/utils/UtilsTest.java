package com.crowdin.cli.utils;

import java.util.Optional;
import org.apache.commons.lang3.SystemUtils;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
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

    @Test
    public void testUnixPath() {
        assertEquals("/path/to/file", Utils.unixPath("\\path\\to\\file"));
    }

    @Test
    public void testWindowsPath() {
        assertEquals("\\path\\to\\file", Utils.windowsPath("/path/to/file"));
    }

    @Test
    public void testNormalizePath() {
        assertEquals(Utils.PATH_SEPARATOR + "path" + Utils.PATH_SEPARATOR + "to" + Utils.PATH_SEPARATOR + "file", Utils.normalizePath("/path/to/file"));
    }

    @Test
    public void testNoSepAtStart() {
        assertEquals("path/to/file", Utils.noSepAtStart("/path/to/file"));
    }

    @Test
    public void testSepAtStart() {
        assertEquals(Utils.PATH_SEPARATOR + "path/to/file", Utils.sepAtStart("path/to/file"));
    }

    @Test
    public void testNoSepAtEnd() {
        assertEquals("/path/to/file", Utils.noSepAtEnd("/path/to/file/"));
    }

    @Test
    public void testSepAtEnd() {
        assertEquals("/path/to/file" + Utils.PATH_SEPARATOR, Utils.sepAtEnd("/path/to/file"));
    }

    @Test
    public void testRegexPath() {
        assertEquals("\\\\path\\\\to\\\\file", Utils.regexPath("\\path\\to\\file"));
    }

    @Test
    public void testJoinPaths() {
        assertEquals("path" + Utils.PATH_SEPARATOR + "to" + Utils.PATH_SEPARATOR + "file", Utils.joinPaths("path", "to", "file"));
    }

    @Test
    public void testSplitPath() {
        assertArrayEquals(new String[]{"path", "to", "file"}, Utils.splitPath("path/to/file"));
    }

    @Test
    public void testGetParentDirectory() {
        assertEquals("path" + Utils.PATH_SEPARATOR + "to" + Utils.PATH_SEPARATOR, Utils.getParentDirectory("path" + Utils.PATH_SEPARATOR + "to" + Utils.PATH_SEPARATOR + "file"));
    }

    @Test
    public void testProxyHost() {
        assertEquals(Optional.empty(), Utils.proxyHost());
    }

    @Test
    public void testProxyCredentials() {
        assertEquals(Optional.empty(), Utils.proxyCredentials());
    }

    @Test
    public void testEncodeURL() {
        assertEquals("Hello+World", Utils.encodeURL("Hello World"));
    }
}
