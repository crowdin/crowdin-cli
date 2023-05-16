package com.crowdin.cli.utils;

import lombok.NonNull;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.SystemUtils;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.util.List;
import java.util.Optional;
import java.util.ResourceBundle;

import static com.crowdin.cli.BaseCli.HTTP_PROXY_HOST_ENV;
import static com.crowdin.cli.BaseCli.HTTP_PROXY_PASSWORD_ENV;
import static com.crowdin.cli.BaseCli.HTTP_PROXY_PORT_ENV;
import static com.crowdin.cli.BaseCli.HTTP_PROXY_USER_ENV;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.PlaceholderUtil.ESCAPE_ROUND_BRACKET_CLOSE;
import static com.crowdin.cli.utils.PlaceholderUtil.ESCAPE_ROUND_BRACKET_OPEN;
import static com.crowdin.cli.utils.PlaceholderUtil.ROUND_BRACKET_CLOSE;
import static com.crowdin.cli.utils.PlaceholderUtil.ROUND_BRACKET_OPEN;

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

    public static final String PRESERVE_HIERARCHY_REGEX_PART = "(.*" + Utils.PATH_SEPARATOR_REGEX + ")?";

    private static final ResourceBundle CROWDIN_PROPERTIES = ResourceBundle.getBundle("crowdin");

    public static String getAppName() {
        return CROWDIN_PROPERTIES.getString(APPLICATION_NAME);
    }

    public static String getAppVersion() {
        return CROWDIN_PROPERTIES.getString(APPLICATION_VERSION);
    }

    public static String getLatestVersionUrl() {
        return CROWDIN_PROPERTIES.getString("application.version_file_url");
    }

    public static String getBaseUrl() {
        return CROWDIN_PROPERTIES.getString(APPLICATION_BASE_URL);
    }

    public static Boolean isWindows() {
        return SystemUtils.IS_OS_WINDOWS;
    }

    public static List<String> readResource(String path) {
        try {
            return IOUtils.readLines(Utils.class.getResourceAsStream(path), "UTF-8");
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.read_resource_file"), path), e);
        }
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

    public static String unixPath(String path) {
        return (path != null) ? path.replaceAll("[\\\\/]+", "/") : null;
    }

    public static String windowsPath(String path) {
        return (path != null) ? path.replaceAll("[\\\\/]+", "\\\\") : null;
    }

    public static String normalizePath(String path) {
        return (path != null) ? path.replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX) : null;
    }

    public static String noSepAtStart(String path) {
        return (path != null) ? path.replaceAll("^[\\\\/]+", "") : null;
    }

    public static String sepAtStart(String path) {
        return (path != null) ? Utils.PATH_SEPARATOR + noSepAtStart(path) : null;
    }

    public static String noSepAtEnd(String path) {
        return (path != null) ? path.replaceAll("[\\\\/]+$", "") : null;
    }

    public static String sepAtEnd(String path) {
        return (path != null) ? (noSepAtEnd(path) + Utils.PATH_SEPARATOR) : null;
    }

    public static String regexPath(String path) {
        if (path != null) {
            return path.replaceAll("\\\\", "\\\\\\\\")
                .replace(ROUND_BRACKET_OPEN, ESCAPE_ROUND_BRACKET_OPEN)
                .replace(ROUND_BRACKET_CLOSE, ESCAPE_ROUND_BRACKET_CLOSE);
        } else {
            return null;
        }
    }

    public static String joinPaths(String... paths) {
        return String.join(Utils.PATH_SEPARATOR, paths).replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX);
    }

    public static String[] splitPath(String path) {
        return path.split("[\\\\/]+");
    }

    /**
     * return parent directory with slash on end, or "/" if root
     * @param path
     * @return
     */
    public static String getParentDirectory(String path) {
        path = noSepAtEnd(path);
        if (!path.contains(Utils.PATH_SEPARATOR)) {
            return Utils.PATH_SEPARATOR;
        }
        return path.substring(0, path.lastIndexOf(Utils.PATH_SEPARATOR)+1);
    }

    public static Optional<Pair<String, Integer>> proxyHost() {
        if (System.getenv(HTTP_PROXY_HOST_ENV) == null || System.getenv(HTTP_PROXY_PORT_ENV) == null) {
            return Optional.empty();
        }
        Integer port;
        try {
            port = Integer.valueOf(System.getenv(HTTP_PROXY_PORT_ENV));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
        return Optional.of(new ImmutablePair<>(System.getenv(HTTP_PROXY_HOST_ENV), port));
    }

    public static Optional<Pair<String, String>> proxyCredentials() {
        if (System.getenv(HTTP_PROXY_USER_ENV) != null && System.getenv(HTTP_PROXY_PASSWORD_ENV) != null) {
            return Optional.of(new ImmutablePair<>(System.getenv(HTTP_PROXY_USER_ENV), System.getenv(HTTP_PROXY_PASSWORD_ENV)));
        } else {
            return Optional.empty();
        }
    }

    public static String encodeURL(@NonNull String toEncode) {
        try {
            return URLEncoder.encode(toEncode, StandardCharsets.UTF_8.toString());
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
    }
}
