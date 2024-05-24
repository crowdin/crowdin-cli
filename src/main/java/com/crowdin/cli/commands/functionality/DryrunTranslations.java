package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.File;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class DryrunTranslations extends Dryrun {

    private PropertiesWithFiles pb;
    private PlaceholderUtil placeholderUtil;
    private boolean filesMustExist;
    private LanguageMapping projectLanguageMapping;
    private List<Language> languages;
    private Map<String, File> projectSources;
    private boolean useServerSources;

    public DryrunTranslations(
        PropertiesWithFiles pb, LanguageMapping projectLanguageMapping, PlaceholderUtil placeholderUtil,
        List<Language> languages, boolean filesMustExist, Map<String, File> projectSources, boolean useServerSources, boolean isUpload
    ) {

        super(isUpload ? "message.uploading_file" : "message.file_path");
        this.pb = pb;
        this.placeholderUtil = placeholderUtil;
        this.filesMustExist = filesMustExist;
        this.projectLanguageMapping = projectLanguageMapping;
        this.languages = languages;
        this.projectSources = projectSources;
        this.useServerSources = useServerSources;
    }

    @Override
    protected List<String> getFiles() {
        return pb.getFiles()
            .stream()
            .flatMap(fileBean -> {
                List<java.io.File> foundSources = SourcesUtils.getFiles(pb.getBasePath(), fileBean.getSource(), fileBean.getIgnore(), placeholderUtil)
                    .collect(Collectors.toList());
                if (useServerSources) {
                    String searchPattern = fileBean.getDest() != null ? fileBean.getDest() : fileBean.getSource();
                    List<java.io.File> serverSources = SourcesUtils.filterProjectFiles(new ArrayList<>(projectSources.keySet()), searchPattern, fileBean.getIgnore(), pb.getPreserveHierarchy(), placeholderUtil)
                        .stream()
                        .map(s -> new java.io.File(Utils.joinPaths(pb.getBasePath(), s)))
                        .filter(s -> !foundSources.contains(s))
                        .collect(Collectors.toList());
                    foundSources.addAll(serverSources);
                }
                return foundSources.stream()
                    .flatMap(source -> {
                        String fileSource = StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath());
                        String translation = TranslationsUtils.replaceDoubleAsterisk(fileBean.getSource(), fileBean.getTranslation(), fileSource);
                        String translation2 = placeholderUtil.replaceFileDependentPlaceholders(translation, source);
                        LanguageMapping localLanguageMapping = LanguageMapping.fromConfigFileLanguageMapping(fileBean.getLanguagesMapping());
                        LanguageMapping languageMapping = LanguageMapping.populate(localLanguageMapping, projectLanguageMapping);
                        File projectSource = projectSources.get(fileSource);
                        return languages.stream()
                            .filter(l -> containsExcludedLanguage(projectSource, l))
                            .map(l -> placeholderUtil.replaceLanguageDependentPlaceholders(translation2, languageMapping, l))
                            .map(file -> PropertiesBeanUtils.useTranslationReplace(file, fileBean.getTranslationReplace()));
                    });
            })
            .distinct()
            .filter(file -> (!filesMustExist) || new java.io.File(pb.getBasePath() + StringUtils.removeStart(file, Utils.PATH_SEPARATOR)).exists())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .collect(Collectors.toList());
    }

    private boolean containsExcludedLanguage(File sourceFile, Language language) {
        return sourceFile == null || sourceFile.getExcludedTargetLanguages() == null || !sourceFile.getExcludedTargetLanguages().contains(language.getId());
    }
}
