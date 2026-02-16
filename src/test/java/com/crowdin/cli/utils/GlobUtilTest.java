package com.crowdin.cli.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class GlobUtilTest {

    @Test
    public void testGlobToRegex() {
        assertTrue(GlobUtil.matches("*.txt", "file.txt"));
        assertFalse(GlobUtil.matches("*.txt", "file.jpg"));
        assertTrue(GlobUtil.matches("**/*.txt", "dir/file.txt"));
        assertFalse(GlobUtil.matches("**/*.txt", "dir/file.jpg"));
        assertTrue(GlobUtil.matches("file?.txt", "file1.txt"));
        assertFalse(GlobUtil.matches("file?.txt", "file12.txt"));
        assertTrue(GlobUtil.matches("file[0-9].txt", "file1.txt"));
        assertFalse(GlobUtil.matches("file[0-9].txt", "filea.txt"));
        assertTrue(GlobUtil.matches("src/**/test.json", "src/a/n/c/test.json"));
        assertTrue(GlobUtil.matches("**/*.*", "src/a/n/c/test.json"));
        assertTrue(GlobUtil.matches("src/a/b.txt", "src/a/b.txt"));
        assertFalse(GlobUtil.matches("src/a/b.txt", "src/a/b.json"));
    }
}
