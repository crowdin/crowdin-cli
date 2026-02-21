package com.crowdin.cli.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class AiContextUtilTest {

    @Test
    public void testGetManualContext() {
        assertEquals(
                "This is the manual context.",
                AiContextUtil.getManualContext("This is the manual context.\n\n✨ AI Context\nThis is the AI context.\n✨ 🔚")
        );
        assertEquals(
                "This is the manual context.",
                AiContextUtil.getManualContext("This is the manual context.")
        );
        assertEquals(
                "",
                AiContextUtil.getManualContext("")
        );
    }

    @Test
    public void testGetAiContextSection() {
        assertEquals(
                "This is the AI context.",
                AiContextUtil.getAiContextSection("This is the manual context.\n\n✨ AI Context\nThis is the AI context.\n✨ 🔚")
        );
        assertEquals(
                "",
                AiContextUtil.getAiContextSection("This is the manual context.")
        );
        assertEquals(
                "",
                AiContextUtil.getAiContextSection("")
        );
    }
}
