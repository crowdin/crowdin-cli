package com.crowdin.cli.utils;

import lombok.Data;
import lombok.SneakyThrows;
import org.json.JSONObject;

import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.Objects;

public class AiContextUtil {

    private static final String AI_CONTEXT_MARKER_START = "✨ AI Context";
    private static final String AI_CONTEXT_MARKER_END = "✨ 🔚";

    private static final String AI_CONTEXT_SECTION_START = "\n\n" + AI_CONTEXT_MARKER_START + "\n";
    private static final String AI_CONTEXT_SECTION_END = "\n" + AI_CONTEXT_MARKER_END;

    private AiContextUtil() {
    }

    public static String getManualContext(String context) {
        if (context == null || context.isEmpty()) {
            return "";
        }

        int startIndex = context.indexOf(AI_CONTEXT_MARKER_START);
        if (startIndex != -1) {
            return context.substring(0, startIndex).trim();
        }

        return context.trim();
    }

    public static String getAiContextSection(String context) {
        if (context == null || context.isEmpty()) {
            return "";
        }

        int startIndex = context.indexOf(AI_CONTEXT_MARKER_START);
        if (startIndex == -1) {
            return "";
        }

        int sectionStart = startIndex + AI_CONTEXT_MARKER_START.length();
        int endIndex = context.indexOf(AI_CONTEXT_MARKER_END, sectionStart);

        if (endIndex != -1) {
            return context.substring(sectionStart, endIndex).trim();
        }

        return "";
    }

    public static String fullContext(String manualContext, String aiContext) {
        StringBuilder fullContext = new StringBuilder(manualContext.trim());
        if (aiContext != null && !aiContext.isEmpty()) {
            fullContext.append(AI_CONTEXT_SECTION_START).append(aiContext.trim()).append(AI_CONTEXT_SECTION_END);
        }
        return fullContext.toString();
    }

    @SneakyThrows
    public static List<StringContextRecord> readRecords(File file) {
        return Files.readAllLines(file.toPath())
                .stream()
                .map(line -> {
                    try {
                        var object = new JSONObject(line);
                        return new StringContextRecord(
                                object.getLong("id"),
                                object.getString("key"),
                                object.getString("text"),
                                object.getString("file"),
                                object.getString("context"),
                                object.getString("ai_context")
                        );
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Data
    public static class StringContextRecord {
        private final Long id;
        private final String key;
        private final String text;
        private final String file;
        private final String context;
        private final String ai_context;
    }
}
