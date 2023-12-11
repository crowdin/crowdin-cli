package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.UpdateOption;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class PropertiesBeanUtils {

    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_CONF = "update_as_unapproved";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF = "update_without_changes";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS = "keep_translations";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS = "keep_translations_and_approvals";

    public static Map<String, Integer> getSchemeObject(String fileScheme) {
        if (StringUtils.isEmpty(fileScheme)) {
            return new HashMap<>();
        }

        String[] schemePart = fileScheme.split(",");
        Map<String, Integer> scheme = new HashMap<>();
        for (int i = 0; i < schemePart.length; i++) {
            scheme.put(StringUtils.trim(schemePart[i]), i);
        }
        return scheme;
    }

    public static Optional<UpdateOption> getUpdateOption(String fileUpdateOption) {
        if (fileUpdateOption == null) {
            return Optional.empty();
        }
        switch (fileUpdateOption) {
            case UPDATE_OPTION_KEEP_TRANSLATIONS_CONF:
                return Optional.of(UpdateOption.KEEP_TRANSLATIONS);
            case UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF:
                return Optional.of(UpdateOption.KEEP_TRANSLATIONS_AND_APPROVALS);
            default:
                return Optional.empty();
        }
    }

    public static String useTranslationReplace(String translationPath, Map<String, String> translationReplace) {
        if (translationReplace == null) {
            return translationPath;
        }
        return translationReplace.keySet().stream()
            .reduce(translationPath, (trans, k) ->
                StringUtils.replace(trans, Utils.normalizePath(k), Utils.normalizePath(translationReplace.get(k))));
    }

    public static boolean isOrganization(String baseUrl) {
        return PropertiesBeanUtils.getOrganization(baseUrl) != null;
    }

    public static String getOrganization(String baseUrl) {
        String organization = baseUrl
            .replaceAll("^https?:?/?/?", "")
            .replaceAll("(\\.?[^.]+)?\\.?crowdin.dev(/api/v2)?/?$", "")
            .replaceAll("\\.?api\\.", "")
            .replaceAll("\\.?crowdin.com(/api/v2)?/?$", "")
            .replaceAll(".+\\.test$", "")
            .replaceAll("\\.e-test$", "");
        return (StringUtils.isEmpty(organization)) ? null : organization;
    }

    public static boolean isUrlForTesting(String baseUrl) {
        return baseUrl.matches("^https://[^.]+\\.crowdin\\.dev(/api/v2)?$")
            || baseUrl.matches("^https://[^.]+\\.[^.]+\\.crowdin\\.dev(/api/v2)?$")
            || baseUrl.matches("^https://.+\\.test\\.crowdin\\.com(/api/v2)?$")
            || baseUrl.matches("^https://.+\\.e-test\\.crowdin\\.com(/api/v2)?$");
    }

    private static boolean isUrlOfficial(String baseUrl) {
        return baseUrl.matches("^https://[^.]+\\.(api\\.)?crowdin.com(/api/v2)?$")
            || baseUrl.matches("^https://(api\\.)?crowdin.com(/api/v2)?");
    }

    public static boolean isUrlValid(String baseUrl) {
        return isUrlForTesting(baseUrl) || isUrlOfficial(baseUrl);
    }

    /**
     * Builds source file destination from 'dest' parameter
     * @param dest 'dest' parameter
     * @param sourceFile relative path to file. Mostly done by StringUtils.removeStart(sourceFile, pb.getBasePath())
     * @param placeholderUtil placeholderUtil
     * @return built source file destination
     */
    public static String prepareDest(String dest, String sourceFile, PlaceholderUtil placeholderUtil) {
        return placeholderUtil.replaceFileDependentPlaceholders(Utils.noSepAtStart(dest), new File(sourceFile));
    }
}
