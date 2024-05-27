package com.crowdin.cli.utils.language;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LangCodesUtilTest {

    @Test
    public void testValidCode() {
        assertTrue(LangCodesUtil.isValidCode("ach"));
        assertTrue(LangCodesUtil.isValidCode("af"));
        assertTrue(LangCodesUtil.isValidCode("ar-eg"));
    }
    @Test
    public void testValidCodeCaseInsensitive() {
        assertTrue(LangCodesUtil.isValidCode("ACH"));
        assertTrue(LangCodesUtil.isValidCode("Af"));
        assertTrue(LangCodesUtil.isValidCode("AR-EG"));
    }

    @Test
    public void testInvalidCode() {
        assertFalse(LangCodesUtil.isValidCode("invalid"));
        assertFalse(LangCodesUtil.isValidCode("english"));
        assertFalse(LangCodesUtil.isValidCode("esus"));
    }

    @Test
    public void testNullCode() {
        assertThrows(NullPointerException.class, () -> {
            LangCodesUtil.isValidCode(null);
        });
    }

    @Test
    public void testEmptyCode() {
        assertFalse(LangCodesUtil.isValidCode(""));
    }
}
