package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class TranslationsUtils {

    /**
     * Replaces double asterisks in pattern. Mostly used with PlaceholderUtils.replaceFileDependentPlaceholders()
     * @param sourcePattern 'source' parameter
     * @param translationPattern 'translation' parameter
     * @param sourceFile relative path to file. Mostly done by StringUtils.removeStart(sourceFile, pb.getBasePath())
     * @return pattern with replaced double asterisks
     */
    public static String replaceDoubleAsterisk(String sourcePattern, String translationPattern, String sourceFile) {
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
                sourceFile = StringUtils.substring(sourceFile, sourceFile.indexOf(sourceNodes[i]), sourceFile.length() - 1)
                        .replaceFirst(Utils.regexPath(sourceNodes[i]), "");
            } else if (sourceNodes.length - 1 == i) {
                if (sourceNodes[i].contains(Utils.PATH_SEPARATOR)) {
                    String[] sourceNodesTmp = sourceNodes[i].split(Utils.PATH_SEPARATOR_REGEX);
                    for (String sourceNode : sourceNodesTmp) {
                        String s = Utils.PATH_SEPARATOR + sourceNode + Utils.PATH_SEPARATOR;
                        if (sourceFile.contains(s)) {
                            sourceFile = sourceFile.replaceFirst(Utils.regexPath(s), Utils.regexPath(Utils.PATH_SEPARATOR));
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
}
