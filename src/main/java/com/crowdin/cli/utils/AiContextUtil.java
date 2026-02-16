package com.crowdin.cli.utils;

public class AiContextUtil {

    private static final String AI_CONTEXT_SECTION_START = "\n\n✨ AI Context\n";
    private static final String AI_CONTEXT_SECTION_END = "\n✨ 🔚";

    private AiContextUtil() {}

    public static String getManualContext(String context) {
        int startIndex = context.indexOf(AI_CONTEXT_SECTION_START);
        if (startIndex != -1) {
            return context.substring(0, startIndex).trim();
        }
        return context.trim();
    }

    public static String getAiContextSection(String context) {
        int startIndex = context.indexOf(AI_CONTEXT_SECTION_START);
        int endIndex = context.indexOf(AI_CONTEXT_SECTION_END);

        if (startIndex != -1 && endIndex != -1 && startIndex < endIndex) {
            return context.substring(startIndex + AI_CONTEXT_SECTION_START.length(), endIndex);
        }

        return "";
    }
}
