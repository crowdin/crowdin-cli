package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.File;
import org.apache.commons.lang3.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class DryrunTranslations extends Dryrun {

    private PropertiesWithFiles pb;
    private PlaceholderUtil placeholderUtil;
    private boolean filesMustExist;
    private LanguageMapping projectLanguageMapping;
    private List<Language> languages;
    private Map<String, File> projectSources;

    public DryrunTranslations(
        PropertiesWithFiles pb, LanguageMapping projectLanguageMapping,
        PlaceholderUtil placeholderUtil, List<Language> languages, boolean filesMustExist, Map<String, File> projectSources
    ) {
        super("message.translation_file");
        this.pb = pb;
        this.placeholderUtil = placeholderUtil;
        this.filesMustExist = filesMustExist;
        this.projectLanguageMapping = projectLanguageMapping;
        this.languages = languages;
        this.projectSources = projectSources;
    }

    @Override
    protected List<String> getFiles() {
        return pb.getFiles()
            .stream()
            .flatMap(fileBean -> SourcesUtils.getFiles(pb.getBasePath(), fileBean.getSource(), fileBean.getIgnore(), placeholderUtil)
                .flatMap(source -> {
                    String fileSource = StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath());
                    String translation = TranslationsUtils.replaceDoubleAsterisk(fileBean.getSource(), fileBean.getTranslation(), fileSource);
                    String translation2 = placeholderUtil.replaceFileDependentPlaceholders(translation, source);
                    LanguageMapping localLanguageMapping = LanguageMapping.fromConfigFileLanguageMapping(fileBean.getLanguagesMapping());
                    LanguageMapping languageMapping = LanguageMapping.populate(localLanguageMapping, projectLanguageMapping);
                    File projectSource = projectSources.get(fileSource);
                    return languages.stream()
                        .filter(l -> containsExcludedLanguage(projectSource, l))
                        .map(l -> placeholderUtil.replaceLanguageDependentPlaceholders(translation2, languageMapping, l));
                }))
            .distinct()
            .filter(file -> (!filesMustExist) || new java.io.File(pb.getBasePath() + StringUtils.removeStart(file, Utils.PATH_SEPARATOR)).exists())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .collect(Collectors.toList());
    }

    private boolean containsExcludedLanguage(File sourceFile, Language language) {
        return sourceFile == null || sourceFile.getExcludedTargetLanguages() == null || !sourceFile.getExcludedTargetLanguages().contains(language.getId());
    }
}
