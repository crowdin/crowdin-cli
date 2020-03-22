package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.PropertiesBean;
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
            .flatMap(file -> SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                .map(source -> {
                    String fileSource = Utils.replaceBasePath(source.getAbsolutePath(), pb.getBasePath());
                    String translation = TranslationsUtils.replaceDoubleAsterisk(file.getSource(), file.getTranslation(), fileSource);
                    return placeholderUtil.replaceFileDependentPlaceholders(translation, source);
                })
                .flatMap(translation -> {
                    Map<String, Map<String, String>> languageMapping = file.getLanguagesMapping() != null ? file.getLanguagesMapping() : new HashMap<>();
                    if (projectLanguageMapping.isPresent()) {
                        TranslationsUtils.populateLanguageMappingFromServer(languageMapping, projectLanguageMapping.get());
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
}
