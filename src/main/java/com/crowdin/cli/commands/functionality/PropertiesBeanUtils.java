package com.crowdin.cli.commands.functionality;

import org.apache.commons.lang3.StringUtils;

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
            return null;
        }

        String[] schemePart = fileScheme.split(",");
        Map<String, Integer> scheme = new HashMap<>();
        for (int i = 0; i < schemePart.length; i++) {
            scheme.put(schemePart[i], i);
        }
        return scheme;
    }

    public static Optional<String> getUpdateOption(String fileUpdateOption) {
        if (fileUpdateOption == null) {
            return Optional.empty();
        }
        switch(fileUpdateOption) {
            case UPDATE_OPTION_KEEP_TRANSLATIONS_CONF:
                return Optional.of(UPDATE_OPTION_KEEP_TRANSLATIONS);
            case UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF:
                return Optional.of(UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS);
            default:
                return Optional.empty();
        }
    }
}
