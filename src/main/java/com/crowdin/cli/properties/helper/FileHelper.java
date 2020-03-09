package com.crowdin.cli.properties.helper;

import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.filefilter.RegexFileFilter;

import java.io.File;
import java.io.FileFilter;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;


public class FileHelper {

    private static final String DOUBLED_ASTERISK = "**";

    private static final String REGEX = "regex";

    private static final String ASTERISK = "*";

    private static final String QUESTION_MARK = "?";

    private static final String DOT = ".";

    private static final String DOT_PLUS = ".+";

    private static final String SET_OPEN_BRECKET = "[";

    private static final String SET_CLOSE_BRECKET = "]";

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

    private final String basePath;

    public FileHelper(String basePath) {
        if (basePath == null) {
            throw new NullPointerException("in FileHelper.constructor");
        }
        this.basePath = basePath;
    }

    public List<File> getFileSource(String source) {
        if (source == null) {
            return Collections.emptyList();
        }

        List<File> resultList = new ArrayList<>();

        String pattern = basePath + Utils.PATH_SEPARATOR + source;
        pattern = pattern.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);

        String[] nodes = pattern.split(Utils.PATH_SEPARATOR_REGEX);
        StringBuilder resultPath = new StringBuilder();
        for (String node : nodes) {
            if (!node.isEmpty()) {
                if (!DOUBLED_ASTERISK.equals(node)) {
                    node = translateToRegex(node);
                }
                if (DOUBLED_ASTERISK.equals(node)) {
                    resultList = findFiles(DOUBLED_ASTERISK, resultList, node, resultPath);
                } else {
                    resultList = findFiles(REGEX, resultList, node, resultPath);
                }
                if (resultList.isEmpty()) {
                    break;
                }
            }
        }
        return resultList;
    }

    /**
     * Filters the provided list of source files using the configured filters.
     *
     * @param sources  the source files.
     * @param ignores the configured filters.
     * @return the list of source files withoug the ignores.
     */
    public List<File> filterOutIgnoredFiles(List<File> sources, List<String> ignores) {
        if (sources == null) {
            return sources;
        }

        if (ignores == null || ignores.isEmpty()) {
            return sources;
        }

        List<FileMatcher> matchers = new ArrayList<>(ignores.size());
        for (String pattern : ignores) {
            if (new File(basePath + pattern).isDirectory()) {
                matchers.add(new FileMatcher(pattern + Utils.PATH_SEPARATOR + "*", basePath));
                matchers.add(new FileMatcher(pattern + Utils.PATH_SEPARATOR + "**" + Utils.PATH_SEPARATOR + "*", basePath));
            } else {
                matchers.add(new FileMatcher(pattern, basePath));
            }
        }

        return sources
            .stream()
            .filter(source -> matchers.stream().anyMatch(m -> m.matches(source)))
            .collect(Collectors.toList());
    }

    private String translateToRegex(String node) {
        if (node == null) {
            throw new NullPointerException("Null arg in FileHelper.translateToRegex");
        }
        node = node
            .replace(ESCAPE_DOT, ESCAPE_DOT_PLACEHOLDER)
            .replace(DOT, ESCAPE_DOT)
            .replace(ESCAPE_DOT_PLACEHOLDER, ESCAPE_DOT);
        node = node
            .replace(ESCAPE_QUESTION, ESCAPE_QUESTION_PLACEHOLDER)
            .replace(QUESTION_MARK, DOT)
            .replace(ESCAPE_QUESTION_PLACEHOLDER, ESCAPE_QUESTION);
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
     * @param patternName either {@link #DOUBLED_ASTERISK} or {@link #REGEX}.
     * @param resultList  the list of results.  <strong>Mutated as a side-effect!</strong>
     * @param node        the current element of the pattern being matched.
     * @param resultPath  the current path being matched.  <strong>Mutated as a side-effect!</strong>
     * @return the new list of results.
     */
    private List<File> findFiles(String patternName, List<File> resultList, String node, StringBuilder resultPath) {
        if (!resultList.isEmpty()) {
            List<File> tmpResultList = new ArrayList<>(resultList);
            resultList.clear();
            for (File file : tmpResultList) {
                StringBuilder absolutePath = new StringBuilder(file.getAbsolutePath());
                absolutePath.append(Utils.PATH_SEPARATOR);
                if (null != patternName) {
                    if (DOUBLED_ASTERISK.equals(patternName)) {
                        List<File> files = getlistDirectory(absolutePath.toString());
                        if (!files.isEmpty()) {
                            for (File f : files) {
                                File tmpFile = new File(f.getAbsolutePath());
                                if (Files.isDirectory(tmpFile.toPath(), LinkOption.NOFOLLOW_LINKS)) {
                                    resultList.add(tmpFile);
                                }
                            }
                        }
                    } else if (REGEX.equals(patternName)) {
                        File dir = new File(absolutePath.toString());
                        FileFilter fileFilter;
                        fileFilter = new RegexFileFilter(node);
                        File[] files = dir.listFiles(fileFilter);
                        if (files != null && files.length > 0) {
                            resultList.addAll(Arrays.asList(files));
                        }
                    } else {
                        absolutePath.append(node);
                        File tmpFile = new File(absolutePath.toString());
                        if (tmpFile.exists()) {
                            resultList.add(tmpFile);
                        }
                    }
                }
            }
        } else {
            if (node != null && node.endsWith(":")) {
                resultPath.append(node).append(Utils.PATH_SEPARATOR);
            } else {
                resultPath.append(Utils.PATH_SEPARATOR);
            }
            if (null != patternName) {
                if (DOUBLED_ASTERISK.equals(patternName)) {
                    List<File> files = getlistDirectory(resultPath.toString());
                    if (!files.isEmpty()) {
                        resultList.clear();
                        for (File f : files) {
                            //TODO: Seems questionable - f.getName() is just the last name, but the method above
                            //      listed the directory recursively, so it may not be directly inside resultPath.
                            //      I couldn't get this code to actually be executed, so it's hard to know.
                            File tmpFile = new File(resultPath.toString(), f.getName());
                            if (Files.isDirectory(tmpFile.toPath(), LinkOption.NOFOLLOW_LINKS)) {
                                resultList.add(tmpFile);
                            }
                        }
                    }
                } else if (REGEX.equals(patternName)) {
                    File dir = new File(resultPath.toString());
                    FileFilter fileFilter;
                    fileFilter = new RegexFileFilter(node);
                    File[] files;
                    if (node != null && node.endsWith(":")) {
                        resultList.clear();
                        resultList.add(dir);
                        return resultList;
                    } else {
                        files = dir.listFiles(fileFilter);
                    }
                    if (files != null) {
                        resultList.clear();
                        resultList.addAll(Arrays.asList(files));
                    }
                } else {
                    resultPath.append(node);
                }
            } else {
                resultPath.append(node);
            }
        }
        return resultList;
    }

    private List<File> getlistDirectory(String pathname) {
        File directory = new File(pathname);
        List<File> resultList = new ArrayList<>();
        resultList.add(directory);
        File[] fList = directory.listFiles();
        if (fList != null) {
            for (File file : fList) {
                if (Files.isDirectory(file.toPath(), LinkOption.NOFOLLOW_LINKS)) {
                    resultList.addAll(getlistDirectory(file.getAbsolutePath()));
                }
            }
        }
        return resultList;
    }

}