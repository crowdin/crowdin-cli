package com.crowdin.cli.utils;

import com.crowdin.cli.BaseCli;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.SystemUtils;

import java.io.IOException;
import java.net.URL;
import java.nio.file.FileSystems;
import java.util.List;
import java.util.Optional;
import java.util.ResourceBundle;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;


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

    public static Boolean isWindows() {
        return SystemUtils.IS_OS_WINDOWS;
    }

    public static Optional<String> getAppNewLatestVersion() {
        try {
            List<String> versionFile = IOUtils.readLines(new URL(CROWDIN_PROPERTIES.getString("application.version_file_url")).openStream(), "UTF-8");
            return (versionFile.size() > 0 && !getAppVersion().equals(versionFile.get(0)))
                ? Optional.of(versionFile.get(0))
                : Optional.empty();
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    public static List<String> readResource(String path) {
        try {
            return IOUtils.readLines(Utils.class.getResourceAsStream(path), "UTF-8");
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.read_resource_file"), path), e);
        }
    }

    public static Optional<String> getNewVersionMessage() {
        String message2 = BaseCli.RESOURCE_BUNDLE.getString("message.new_version_text.2");
        String message3 = BaseCli.RESOURCE_BUNDLE.getString("message.new_version_text.3");
        String c1 = Utils.isWindows() ? "┌" : "\u256d";
        String c2 = Utils.isWindows() ? "┐" : "\u256e";
        String c3 = Utils.isWindows() ? "└" : "\u2570";
        String c4 = Utils.isWindows() ? "┘" : "\u256f";
        return getAppNewLatestVersion()
            .map(newVersion -> String.format(BaseCli.RESOURCE_BUNDLE.getString("message.new_version_text"), Utils.getAppVersion(), newVersion))
            .map(newVersionText ->
                "\n"
                    + c1 + "──" + StringUtils.repeat("─", message2.length())   + "──" + c2 + "\n"
                    + "│  " + StringUtils.center(newVersionText, message2.length()) + "  │\n"
                    + "\u251c──" + StringUtils.repeat("─", message2.length())   + "──\u2524\n"
                    + "│  " + message2                                              + "  │\n"
                    + "│  " + StringUtils.center(message3, message2.length())       + "  │\n"
                    + c3 + "──" + StringUtils.repeat("─", message2.length())   + "──" + c4);
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

    public static String regexPath(String path) {
        return path.replaceAll("\\\\", "\\\\\\\\");
    }
}