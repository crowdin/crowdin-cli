package com.crowdin.cli.properties.helper;

import com.crowdin.cli.utils.Utils;

import java.io.File;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.util.regex.Pattern;

import static com.crowdin.cli.utils.Utils.isWindows;

/**
 * File matcher for Crowdin CLI's documented syntax.
 */
class FileMatcher implements PathMatcher {
    private final PathMatcher delegate;

    public static final String ESCAPE_BRACKET_OPEN = isWindows() ? "^[" : "\\[";
    public static final String ESCAPE_BRACKET_CLOSE = isWindows() ? "^]" : "\\]";
    public static final String ESCAPE_BRACKET_OPEN_REGEX = "\\\\[";
    public static final String ESCAPE_BRACKET_CLOSE_REGEX = "\\\\]";
    private static final String ESCAPE_BRACKET_OPEN_PLACEHOLDER = "ESCAPE_BRACKET_OPEN_PLACEHOLDER";
    private static final String ESCAPE_BRACKET_CLOSE_PLACEHOLDER = "ESCAPE_BRACKET_CLOSE_PLACEHOLDER";

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
        pattern = pattern.replaceAll(Pattern.quote(ESCAPE_BRACKET_OPEN), ESCAPE_BRACKET_OPEN_PLACEHOLDER);
        pattern = pattern.replaceAll(Pattern.quote(ESCAPE_BRACKET_CLOSE), ESCAPE_BRACKET_CLOSE_PLACEHOLDER);

        pattern = pattern.replaceAll("\\\\+", Utils.PATH_SEPARATOR_REGEX + Utils.PATH_SEPARATOR_REGEX);
        pattern = pattern.replaceAll("/+", "/");
        pattern = pattern.replaceAll("\\{\\{+", "\\\\{\\\\{");
        pattern = pattern.replaceAll("}}+", "\\\\}\\\\}");

        pattern = pattern.replaceAll(ESCAPE_BRACKET_OPEN_PLACEHOLDER, ESCAPE_BRACKET_OPEN_REGEX);
        pattern = pattern.replaceAll(ESCAPE_BRACKET_CLOSE_PLACEHOLDER, ESCAPE_BRACKET_CLOSE_REGEX);

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
}
