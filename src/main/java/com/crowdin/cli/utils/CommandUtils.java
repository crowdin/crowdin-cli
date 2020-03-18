package com.crowdin.cli.utils;

import com.crowdin.cli.BaseCli;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

public class CommandUtils extends BaseCli {

    private static final String USER_HOME = "user.home";

    public boolean isSourceContainsPattern(String source) {
        if (source == null) {
            return false;
        }
        return source.contains("**")
                || source.contains("*")
                || source.contains("?")
                || (source.contains("[") && source.contains("]"))
                || (source.contains("\\") && !Utils.isWindows());
    }

    public static String replaceDoubleAsteriskInTranslation(String translations, String sources, String source, String basePath) {
        if (StringUtils.isAnyEmpty(translations, sources)) {
            throw new RuntimeException("No sources and/or translations");
        }
        if (!translations.contains("**")) {
            return translations;
        }
        sources = Utils.replaceBasePath(sources, basePath);
        String replacement = "";
        if (!source.contains("**")) {
            return translations;
        }
        source = StringUtils.replacePattern(source, "[\\\\/]+", "/");
        sources = StringUtils.replacePattern(sources, "[\\\\/]+", "/");

        String[] sourceNodes = source.split("\\*\\*");
        for (int i = 0; i < sourceNodes.length; i++) {
            if (sources.contains(sourceNodes[i])) {
                sources = sources.replaceFirst(sourceNodes[i], "");
            } else if (sourceNodes.length - 1 == i) {
                if (sourceNodes[i].contains("/")) {
                    String[] sourceNodesTmp = sourceNodes[i].split("/");
                    for (String sourceNode : sourceNodesTmp) {
                        String s = "/" + sourceNode + "/";
                        s = s.replaceAll("/+", "/");
                        if (sources.contains(s)) {
                            sources = sources.replaceFirst(s, "/");
                        } else if (StringUtils.indexOfAny(s, new String[]{"*", "?", "[", "]", "."}) >= 0) {
                            if (sources.lastIndexOf("/") > 0) {
                                sources = sources.substring(0, sources.lastIndexOf("/"));
                            } else {
                                sources = "";
                            }
                        }
                    }
                } else if (sources.contains(".")) {
                    sources = "";
                }
            }
        }
        replacement = sources;
        translations = translations.replace("**", replacement);
        translations = translations.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        return translations;
    }

    public static String getCommonPath(List<String> sources, String basePath) {
        String prepBasePath = StringUtils.removeStart(basePath, Utils.PATH_SEPARATOR);
        return StringUtils.removeStart(getCommonPath(sources), prepBasePath);
    }

    public static String getCommonPath(List<String> sources) {
        String result = "";
        String commonPrefix = StringUtils.getCommonPrefix(sources.toArray(new String[0]));
        result = commonPrefix.substring(0, commonPrefix.lastIndexOf(Utils.PATH_SEPARATOR)+1);
        result = StringUtils.removeStart(result, Utils.PATH_SEPARATOR);
        return result;
    }
}
