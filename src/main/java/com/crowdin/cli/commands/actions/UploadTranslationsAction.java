package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.commands.functionality.TranslationsUtils;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;

public class UploadTranslationsAction implements Action {

    private boolean noProgress;
    private String languageId;
    private String branchName;
    private boolean importEqSuggestions;
    private boolean autoApproveImported;
    private boolean debug;

    public UploadTranslationsAction(boolean noProgress, String languageId, String branchName, boolean importEqSuggestions, boolean autoApproveImported, boolean debug) {
        this.noProgress = noProgress;
        this.languageId = languageId;
        this.branchName = branchName;
        this.importEqSuggestions = importEqSuggestions;
        this.autoApproveImported = autoApproveImported;
        this.debug = debug;
    }

    @Override
    public void act(PropertiesBean pb, Client client) {
        Project project;
        try {
            ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            project = client.downloadFullProject();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }

        if (!project.isManagerAccess()) {
            System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
            return;
        }

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(true), pb.getBasePath());

        Optional<Map<String, Map<String, String>>> projectLanguageMapping = project.getLanguageMapping();

        Map<String, File> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFiles());

        List<Language> languages = (languageId != null)
            ? project.findLanguage(languageId, true)
                .map(Collections::singletonList)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.not_found_language"), languageId)))
            : project.getProjectLanguages(false);

        for (FileBean file : pb.getFiles()) {
            List<String> fileSourcesWithoutIgnores = SourcesUtils
                .getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                .map(java.io.File::getAbsolutePath)
                .collect(Collectors.toList());

            String commonPath = (pb.getPreserveHierarchy())
                ? ""
                : SourcesUtils.getCommonPath(fileSourcesWithoutIgnores, pb.getBasePath());

            if (fileSourcesWithoutIgnores.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
            }

            Map<java.io.File, Pair<List<Language>, UploadTranslationsRequest>> preparedRequests = new HashMap<>();
            String branchPath = (StringUtils.isNotEmpty(this.branchName) ? branchName + Utils.PATH_SEPARATOR : "");
            fileSourcesWithoutIgnores.forEach(source -> {
                String filePath = branchPath + (StringUtils.isNotEmpty(file.getDest())
                    ? file.getDest()
                    : StringUtils.removeStart(source, pb.getBasePath() + commonPath));

                if (!paths.containsKey(filePath)) {
                    System.out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("error.source_not_exists_in_project"), StringUtils.removeStart(source, pb.getBasePath()), filePath)));
                    return;
                }
                Long fileId = paths.get(filePath).getId();

//                build filePath to each source and project language
                String fileSource = StringUtils.removeStart(source, pb.getBasePath());
                String translation = TranslationsUtils.replaceDoubleAsterisk(file.getSource(), file.getTranslation(), fileSource);
                translation = placeholderUtil.replaceFileDependentPlaceholders(translation, new java.io.File(source));
                if (file.getScheme() != null) {
                    java.io.File transFile = new java.io.File(pb.getBasePath() + Utils.PATH_SEPARATOR + translation);
                    if (!transFile.exists()) {
                        System.out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("error.translation_not_exists"), StringUtils.removeStart(transFile.getAbsolutePath(), pb.getBasePath()))));
                        return;
                    }
                    UploadTranslationsRequest request = new UploadTranslationsRequest();
                    request.setFileId(fileId);
                    request.setImportEqSuggestions(this.importEqSuggestions);
                    request.setAutoApproveImported(this.autoApproveImported);
                    preparedRequests.put(transFile, Pair.of(languages, request));
                } else {
                    for (Language language : languages) {
                        Map<String, Map<String, String>> languageMapping = file.getLanguagesMapping() != null ? file.getLanguagesMapping() : new HashMap<>();
                        if (projectLanguageMapping.isPresent()) {
                            TranslationsUtils.populateLanguageMappingFromServer(languageMapping, projectLanguageMapping.get());
                        }

                        String transFileName = placeholderUtil.replaceLanguageDependentPlaceholders(translation, languageMapping, language);
                        transFileName = PropertiesBeanUtils.useTranslationReplace(transFileName, file.getTranslationReplace());
                        java.io.File transFile = new java.io.File(pb.getBasePath() + Utils.PATH_SEPARATOR + transFileName);
                        if (!transFile.exists()) {
                            System.out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("error.translation_not_exists"), StringUtils.removeStart(transFile.getAbsolutePath(), pb.getBasePath()))));
                            continue;
                        }
                        UploadTranslationsRequest request = new UploadTranslationsRequest();
                        request.setFileId(fileId);
                        request.setImportEqSuggestions(this.importEqSuggestions);
                        request.setAutoApproveImported(this.autoApproveImported);
                        preparedRequests.put(transFile, Pair.of(Collections.singletonList(language), request));
                    }
                }
            });

            List<Runnable> tasks = preparedRequests.entrySet()
                .stream()
                .map(entry -> (Runnable) () -> {
                    java.io.File translationFile = entry.getKey();
                    List<Language> langs = entry.getValue().getLeft();
                    UploadTranslationsRequest request = entry.getValue().getRight();
                    try (InputStream fileStream = new FileInputStream(translationFile)) {
                        Long storageId = client.uploadStorage(translationFile.getName(), fileStream);
                        request.setStorageId(storageId);
                    } catch (Exception e) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_translation_to_storage"), e);
                    }
                    try {
                        for (Language lang : langs) {
                            client.uploadTranslations(lang.getId(), request);
                        }
                    } catch (Exception e) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_translation"), e);
                    }
                    System.out.println(
                            OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.translation_uploaded"), StringUtils.removeStart(translationFile.getAbsolutePath(), pb.getBasePath()))));
                })
                .collect(Collectors.toList());
            ConcurrencyUtil.executeAndWait(tasks, debug);
        }
    }
}
