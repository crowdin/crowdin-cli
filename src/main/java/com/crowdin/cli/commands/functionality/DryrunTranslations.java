package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

public class DryrunTranslations extends Dryrun {

    private PropertiesBean pb;
    private PlaceholderUtil placeholderUtil;
    private boolean filesMustExist;
    private Optional<Map<String, Map<String, String>>> projectLanguageMapping;

    public DryrunTranslations(PropertiesBean pb, Optional<Map<String, Map<String, String>>> projectLanguageMapping, PlaceholderUtil placeholderUtil, boolean filesMustExist) {
        this.pb = pb;
        this.placeholderUtil = placeholderUtil;
        this.filesMustExist = filesMustExist;
        this.projectLanguageMapping = projectLanguageMapping;
    }

    @Override
    protected List<String> getFiles() {
        return pb.getFiles()
            .stream()
            .flatMap(file -> CommandUtils.getFileSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil)
                .stream()
                .map(source -> {
                    String translation = CommandUtils.replaceDoubleAsteriskInTranslation(file.getTranslation(), source.getAbsolutePath(), file.getSource(), pb.getBasePath());
                    return placeholderUtil.replaceFileDependentPlaceholders(translation, source);
                })
                .flatMap(translation -> {
                    Map<String, Map<String, String>> languageMapping = file.getLanguagesMapping() != null ? file.getLanguagesMapping() : new HashMap<>();
                    if (projectLanguageMapping.isPresent()) {
                        populateLanguageMapping(languageMapping, projectLanguageMapping.get(), BaseCli.placeholderMappingForServer);
                    }
                    return placeholderUtil.replaceLanguageDependentPlaceholders(translation, languageMapping).stream();
                })
                .map(translation -> (file.getTranslationReplace() != null ? file.getTranslationReplace() : Collections.<String, String>emptyMap())
                    .keySet()
                    .stream()
                    .reduce(translation, (trans, k) -> StringUtils.replace(
                        trans,
                        k.replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX),
                        file.getTranslationReplace().get(k)))
                )
            )
            .distinct()
            .filter(file -> (!filesMustExist) || new File(pb.getBasePath() + StringUtils.removeStart(file, Utils.PATH_SEPARATOR)).exists())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .collect(Collectors.toList());
    }

    private void populateLanguageMapping (Map<String, Map<String, String>> toPopulate, Map<String, Map<String, String>> from, Map<String, String> placeholderMapping) {
        for (String langCode : from.keySet()) {
            for (String fromPlaceholder : from.get(langCode).keySet()) {
                String toPlaceholder = placeholderMapping.getOrDefault(fromPlaceholder, fromPlaceholder);
                toPopulate.putIfAbsent(toPlaceholder, new HashMap<>());
                toPopulate.get(toPlaceholder).putIfAbsent(langCode, from.get(langCode).get(fromPlaceholder));
            }
        }
    }
}
