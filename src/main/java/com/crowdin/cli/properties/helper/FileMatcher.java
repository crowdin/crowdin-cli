package com.crowdin.cli.properties.helper;

import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
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

    FileMatcher(String pattern, FileBean fileBean, PropertiesBean propertiesBean) {

        // Making matchers match the full path.
        if (propertiesBean != null && propertiesBean.getBasePath() != null) {
            if (!propertiesBean.getBasePath().trim().endsWith(Utils.PATH_SEPARATOR) && !pattern.trim().startsWith(Utils.PATH_SEPARATOR)) {
                pattern = propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + pattern;
            } else {
                pattern = propertiesBean.getBasePath().trim() + pattern.trim();
                pattern = pattern.replace(Utils.PATH_SEPARATOR_REGEX + Utils.PATH_SEPARATOR_REGEX, Utils.PATH_SEPARATOR_REGEX);
            }
        }
        pattern = pattern.replaceAll("\\\\+", "\\\\");
        pattern = pattern.replaceAll("/+", "/");

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
