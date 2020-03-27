package com.crowdin.cli.utils;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.SystemUtils;

import java.net.URL;
import java.nio.file.FileSystems;
import java.util.List;
import java.util.Optional;
import java.util.ResourceBundle;


public class Utils {

    private static final String APPLICATION_BASE_URL = "application.base_url";

    private static final String APPLICATION_NAME = "application.name";

    private static final String APPLICATION_VERSION = "application.version";

    /**
     * Path separator for use when concatenating or using non-regex findLanguage/replace methods.
     */
    public static final String PATH_SEPARATOR = FileSystems.getDefault().getSeparator();

    /**
     * Path separator for use in regex patterns, or in regex replacements, which use the same escaping.
     */
    public static final String PATH_SEPARATOR_REGEX = "\\".equals(PATH_SEPARATOR) ? "\\\\" : PATH_SEPARATOR;

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;
    private static final ResourceBundle CROWDIN_PROPERTIES = ResourceBundle.getBundle("crowdin");

    public static String getAppName() {
        return CROWDIN_PROPERTIES.getString(APPLICATION_NAME);
    }

    public static String getAppVersion() {
        return CROWDIN_PROPERTIES.getString(APPLICATION_VERSION);
    }

    public static String getBaseUrl() {
        return CROWDIN_PROPERTIES.getString(APPLICATION_BASE_URL);
    }

    public static String replaceBasePath(String path, String basePath) {
        if (StringUtils.isEmpty(path)) {
            return "";
        }
        String result;
        if (StringUtils.isNotEmpty(basePath)) {
            path = path.replaceAll(PATH_SEPARATOR_REGEX + "+", PATH_SEPARATOR_REGEX);
            result = path.replace(basePath, PATH_SEPARATOR);
        } else {
            String[] nodes = path.split(PATH_SEPARATOR_REGEX);
            result = nodes[nodes.length-1];
        }
        result = result.replaceAll(PATH_SEPARATOR_REGEX + "+", PATH_SEPARATOR_REGEX);
        return result;
    }

    public static Boolean isWindows() {
        return SystemUtils.IS_OS_WINDOWS;
    }

    public static Optional<String> getAppNewLatestVersion() {
        try {
            List<String> versionFile = IOUtils.readLines(new URL(CROWDIN_PROPERTIES.getString("application.version_file_url")).openStream(), "UTF-8");
            return (versionFile.size() > 0 && !getAppVersion().equals(versionFile.get(0)))
                ? Optional.of(versionFile.get(0))
                : Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public static Optional<String> getNewVersionMassage() {
        String message2 = RESOURCE_BUNDLE.getString("message.new_version_text.2");
        return getAppNewLatestVersion()
            .map(newVersion -> String.format(MessageSource.RESOURCE_BUNDLE.getString("message.new_version_text"), Utils.getAppVersion(), newVersion))
            .map(newVersionText ->
                  "\n"
                + "┌──" + StringUtils.repeat("─", newVersionText.length()) + "──┐\n"
                + "│  " + newVersionText                                       + "  │\n"
                + "│  " + StringUtils.center(message2, newVersionText.length())+ "  │\n"
                + "└──" + StringUtils.repeat("─", newVersionText.length()) + "──┘");
    }

    public static String buildUserAgent() {
        return String.format("%s/%s java/%s/%s %s/%s",
            getAppName(),
            getAppVersion(),
            System.getProperty("java.vendor"),
            System.getProperty("java.version"),
            System.getProperty("os.name"),
            System.getProperty("os.version"));
    }

    public static String normalizePath(String path) {
        return path.replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX);
    }
}