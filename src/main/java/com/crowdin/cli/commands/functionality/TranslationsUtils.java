package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;

import java.util.HashMap;
import java.util.Map;

import static com.crowdin.cli.utils.MessageSource.RESOURCE_BUNDLE;

public class TranslationsUtils {

    public static String replaceDoubleAsterisk(String sourcePattern, String translationPattern, String sourceFile) {//File fileSource, String basePath) {
        if (StringUtils.isAnyEmpty(translationPattern, sourceFile)) {
            throw new RuntimeException("No sources and/or translations");
        }
        if (!translationPattern.contains("**")) {
            return translationPattern;
        }
        if (!sourcePattern.contains("**")) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.config.double_asterisk"));
        }
        sourcePattern = StringUtils.removeStart(sourcePattern, Utils.PATH_SEPARATOR);
        String[] sourceNodes = sourcePattern.split("\\*\\*");
        for (int i = 0; i < sourceNodes.length; i++) {
            if (sourceFile.contains(sourceNodes[i])) {
                sourceFile = sourceFile.replaceFirst(sourceNodes[i], "");
            } else if (sourceNodes.length - 1 == i) {
                if (sourceNodes[i].contains(Utils.PATH_SEPARATOR)) {
                    String[] sourceNodesTmp = sourceNodes[i].split(Utils.PATH_SEPARATOR);
                    for (String sourceNode : sourceNodesTmp) {
                        String s = Utils.PATH_SEPARATOR + sourceNode + Utils.PATH_SEPARATOR;
                        s = s.replaceAll(Utils.PATH_SEPARATOR + "+", Utils.PATH_SEPARATOR);
                        if (sourceFile.contains(s)) {
                            sourceFile = sourceFile.replaceFirst(s, Utils.PATH_SEPARATOR);
                        } else if (StringUtils.indexOfAny(s, new String[]{"*", "?", "[", "]", "."}) >= 0) {
                            if (sourceFile.lastIndexOf(Utils.PATH_SEPARATOR) > 0) {
                                sourceFile = sourceFile.substring(0, sourceFile.lastIndexOf(Utils.PATH_SEPARATOR));
                            } else {
                                sourceFile = "";
                            }
                        }
                    }
                } else if (sourceFile.contains(".")) {
                    sourceFile = "";
                }
            }
        }
        translationPattern = translationPattern.replace("**", sourceFile);
        translationPattern = translationPattern.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        return translationPattern;
    }

    public static void populateLanguageMappingFromServer(Map<String, Map<String, String>> toPopulate, Map<String, Map<String, String>> from) {
        for (String langCode : from.keySet()) {
            for (String fromPlaceholder : from.get(langCode).keySet()) {
                String toPlaceholder = BaseCli.PLACEHOLDER_MAPPING_FOR_SERVER.getOrDefault(fromPlaceholder, fromPlaceholder);
                toPopulate.putIfAbsent(toPlaceholder, new HashMap<>());
                toPopulate.get(toPlaceholder).putIfAbsent(langCode, from.get(langCode).get(fromPlaceholder));
            }
        }
    }
}
