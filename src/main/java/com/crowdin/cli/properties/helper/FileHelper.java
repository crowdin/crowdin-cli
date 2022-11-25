package com.crowdin.cli.properties.helper;

import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.filefilter.RegexFileFilter;

import java.io.File;
import java.io.FileFilter;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class FileHelper {

    private static final String DOUBLED_ASTERISK = "**";

    private static final String REGEX = "regex";

    private static final String ASTERISK = "*";

    private static final String QUESTION_MARK = "?";

    private static final String DOT = ".";

    private static final String DOT_PLUS = ".+";

    private static final String SET_OPEN_BRACKET = "[";

    private static final String SET_CLOSE_BRACKET = "]";

    private static final String ROUND_BRACKET_OPEN = "(";

    private static final String ROUND_BRACKET_CLOSE = ")";

    private static final String ESCAPE_ROUND_BRACKET_OPEN = "\\(";

    private static final String ESCAPE_ROUND_BRACKET_CLOSE = "\\)";

    private static final String ESCAPE_DOT = "\\.";

    private static final String ESCAPE_DOT_PLACEHOLDER = "{ESCAPE_DOT}";

    private static final String ESCAPE_QUESTION = "\\?";

    private static final String ESCAPE_QUESTION_PLACEHOLDER = "{ESCAPE_QUESTION_MARK}";

    private static final String ESCAPE_ASTERISK = "\\*";

    private static final String ESCAPE_ASTERISK_PLACEHOLDER = "{ESCAPE_ASTERISK}";

    private static final String PLUS = "+";

    private static final String ESCAPE_PLUS = "\\+";

    private final String basePath;

    public FileHelper(String basePath) {
        if (basePath == null) {
            throw new NullPointerException("in FileHelper.constructor");
        }
        this.basePath = basePath;
    }

    public List<File> getFiles(String source) {
        if (source == null) {
            throw new NullPointerException("NPE in FileHelper.getFiles");
        }

        Set<File> resultList = new HashSet<>();

        String[] nodes = Utils.normalizePath(source).split(Utils.PATH_SEPARATOR_REGEX);
        resultList.add(new File(basePath));
        for (String node : nodes) {
            if (node.isEmpty()) {
                continue;
            }
            if (DOUBLED_ASTERISK.equals(node)) {
                resultList = findFiles(resultList, node);
            } else {
                resultList = findFiles(resultList, translateToRegex(node));
            }
            if (resultList.isEmpty()) {
                break;
            }
        }
        return new ArrayList<>(resultList);
    }

    /**
     * Filters the provided list of source files using the configured filters.
     *
     * @param sources  the source files.
     * @param ignores the configured filters.
     * @return the list of source files without the ignores.
     */
    public List<File> filterOutIgnoredFiles(List<File> sources, List<String> ignores) {
        if (sources == null || ignores == null) {
            throw new NullPointerException("NPE in FileHelper.filterOutIgnoredFiles");
        }

        List<FileMatcher> matchers = new ArrayList<>(ignores.size());
        for (String pattern : ignores) {
            if (new File(basePath + pattern).isDirectory()) {
                matchers.add(new FileMatcher(pattern + Utils.PATH_SEPARATOR + "*", basePath));
                matchers.add(new FileMatcher(pattern + Utils.PATH_SEPARATOR + "**" + Utils.PATH_SEPARATOR + "*", basePath));
            } else {
                matchers.add(new FileMatcher(pattern, basePath));
                if (pattern.contains("**")) {
                    matchers.add(new FileMatcher(pattern.replace("**" + Utils.PATH_SEPARATOR, ""), basePath));
                }
            }
        }

        return sources
            .stream()
            .filter(source -> matchers.stream().noneMatch(m -> m.matches(source)))
            .collect(Collectors.toList());
    }

    private String translateToRegex(String node) {
        node = node
            .replace(ESCAPE_DOT, ESCAPE_DOT_PLACEHOLDER)
            .replace(DOT, ESCAPE_DOT)
            .replace(ESCAPE_DOT_PLACEHOLDER, ESCAPE_DOT);
        node = node
            .replace(ESCAPE_QUESTION, ESCAPE_QUESTION_PLACEHOLDER)
            .replace(QUESTION_MARK, DOT)
            .replace(ESCAPE_QUESTION_PLACEHOLDER, ESCAPE_QUESTION);
        node = node
            .replace(PLUS, ESCAPE_PLUS);
        node = node
            .replace(ESCAPE_ASTERISK, ESCAPE_ASTERISK_PLACEHOLDER)
            .replace(ASTERISK, DOT_PLUS)
            .replace(ESCAPE_ASTERISK_PLACEHOLDER, ESCAPE_ASTERISK);
        node = node
            .replace(ROUND_BRACKET_OPEN, ESCAPE_ROUND_BRACKET_OPEN);
        node = node
            .replace(ROUND_BRACKET_CLOSE, ESCAPE_ROUND_BRACKET_CLOSE);
        return node;
    }

    /**
     * Finds files at the path specified by the current contents of {@code resultPath}, putting files matching
     * the next level of the pattern into {@code resultList} for the next iteration.
     *
     * @param paths  the list of results.  <strong>Mutated as a side-effect!</strong>
     * @param node        the current element of the pattern being matched.
     * @return the new list of results.
     */
    private Set<File> findFiles(Set<File> paths, String node) {
        Set<File> result = new HashSet<>();
        for (File file : paths) {
            if (!file.exists()) {
                continue;
            }
            if (DOUBLED_ASTERISK.equals(node)) {
                result.addAll(getListDirectory(file));
            } else if (file.isDirectory()) {
                FileFilter fileFilter = new RegexFileFilter(node);
                File[] files = file.listFiles(fileFilter);
                if (files == null) {
                    continue;
                }
                result.addAll(Arrays.asList(files));
            }
        }
        return result;
    }

    private List<File> getListDirectory(File directory) {
        List<File> resultList = new ArrayList<>();
        resultList.add(directory);
        File[] fileList = directory.listFiles();
        if (fileList != null) {
            for (File file : fileList) {
                if (Files.isDirectory(file.toPath(), LinkOption.NOFOLLOW_LINKS)) {
                    resultList.addAll(getListDirectory(file));
                }
            }
        }
        return resultList;
    }
}
