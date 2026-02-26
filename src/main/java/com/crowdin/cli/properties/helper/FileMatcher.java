package com.crowdin.cli.properties.helper;

import com.crowdin.cli.utils.Utils;

import java.io.File;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.PathMatcher;

/**
 * File matcher for Crowdin CLI's documented syntax.
 */
class FileMatcher implements PathMatcher {
    private final PathMatcher delegate;

    FileMatcher(String pattern, String basePath) {

        // Making matchers match the full path.
        if (basePath != null) {
            if (!basePath.trim().endsWith(Utils.PATH_SEPARATOR) && !pattern.trim().startsWith(Utils.PATH_SEPARATOR)) {
                pattern = basePath + Utils.PATH_SEPARATOR + pattern;
            } else {
                pattern = basePath.trim() + pattern.trim();
                pattern = pattern.replace(Utils.PATH_SEPARATOR_REGEX + Utils.PATH_SEPARATOR_REGEX, Utils.PATH_SEPARATOR_REGEX);
            }
        }
        pattern = pattern.replaceAll("\\\\+", Utils.PATH_SEPARATOR_REGEX + Utils.PATH_SEPARATOR_REGEX);
        pattern = pattern.replaceAll("/+", "/");
        pattern = pattern.replaceAll("\\{\\{+", "\\\\{\\\\{");
        pattern = pattern.replaceAll("}}+", "\\\\}\\\\}");

        // Escape brackets that are not part of valid character class patterns like [0-9], [a-z], etc.
        // Valid character classes have the pattern [^...]? where content is a-z, 0-9, or ranges like a-z
        pattern = escapeInvalidBrackets(pattern);

        // We *could* implement exactly what's documented. The idea would be to implement something like
        // Java's Globs.toRegexPattern but supporting only the documented syntax. Instead, we will use
        // the real globber.
        delegate = FileSystems.getDefault().getPathMatcher("glob:" + pattern);
    }

    @Override
    public boolean matches(Path path) {
        return delegate.matches(path);
    }

    boolean matches(File file) {
        return matches(file.toPath());
    }

    /**
     * Escapes square brackets that are not part of valid character class patterns.
     * Valid patterns include: [0-9], [a-z], [abc], etc.
     * Invalid patterns like [test.Folder dev] will be escaped to \[test.Folder dev\]
     */
    private static String escapeInvalidBrackets(String pattern) {
        StringBuilder result = new StringBuilder();
        int i = 0;
        while (i < pattern.length()) {
            if (pattern.charAt(i) == '[') {
                int closeIndex = pattern.indexOf(']', i + 1);
                if (closeIndex == -1) {
                    // Unclosed bracket, escape it
                    result.append("\\[");
                    i++;
                } else {
                    String bracketContent = pattern.substring(i + 1, closeIndex);
                    if (isValidCharacterClass(bracketContent)) {
                        // Valid character class, keep as is
                        result.append('[').append(bracketContent).append(']');
                        i = closeIndex + 1;
                    } else {
                        // Invalid character class, escape the brackets
                        result.append("\\[").append(bracketContent).append("\\]");
                        i = closeIndex + 1;
                    }
                }
            } else {
                result.append(pattern.charAt(i));
                i++;
            }
        }
        return result.toString();
    }

    /**
     * Checks if the content within brackets forms a valid character class.
     * Valid patterns: single characters, ranges (a-z, 0-9), or combinations
     * Examples: "0-9", "a-z", "abc", "^abc", "a-zA-Z0-9"
     */
    private static boolean isValidCharacterClass(String content) {
        if (content.isEmpty()) {
            return false;
        }

        // Handle negation
        int startIndex = content.startsWith("^") ? 1 : 0;
        if (startIndex >= content.length()) {
            return false;
        }

        String chars = content.substring(startIndex);

        // A valid character class should only contain letters, digits, hyphens, and underscores
        // Examples: [0-9], [a-z], [a-zA-Z0-9_], [abc], but NOT [test.Folder dev]
        // We're being conservative: spaces, dots, and other special chars disqualify it
        for (char c : chars.toCharArray()) {
            if (!Character.isLetterOrDigit(c) && c != '-' && c != '_') {
                return false;
            }
        }

        return true;
    }
}
