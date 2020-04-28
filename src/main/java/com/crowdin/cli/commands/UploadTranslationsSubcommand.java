package com.crowdin.cli.commands;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.commands.parts.Command;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
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
import picocli.CommandLine;

import java.io.FileInputStream;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.console.ExecutionStatus.*;

@CommandLine.Command(
    name ="translations",
    sortOptions = false
)
public class UploadTranslationsSubcommand extends Command {

    @CommandLine.Option(names = {"--auto-approve-imported"}, negatable = true)
    protected boolean autoApproveImported;

    @CommandLine.Option(names = {"--import-duplicates"}, negatable = true)
    protected boolean importDuplicates;

    @CommandLine.Option(names = {"--import-eq-suggestions"}, negatable = true)
    protected boolean importEqSuggestions;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();

        Client client = new CrowdinClient(pb.getApiToken(), PropertiesBeanUtils.getOrganization(pb.getBaseUrl()), Long.parseLong(pb.getProjectId()));

        Project project;
        try {
            ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            project = client.downloadFullProject();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(true), pb.getBasePath());

        Optional<Map<String, Map<String, String>>> projectLanguageMapping = project.getLanguageMapping();

        if (dryrun) {
            (new DryrunTranslations(pb, projectLanguageMapping, placeholderUtil, Optional.empty(), true)).run(treeView);
            return;
        }

        Map<String, File> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFiles());

        List<Language> languages = (languageId != null)
            ? project.findLanguage(languageId)
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
            String branchPath = (StringUtils.isNotEmpty(this.branch) ? branch + Utils.PATH_SEPARATOR : "");
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
                    request.setImportDuplicates(this.importDuplicates);
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
                        request.setImportDuplicates(this.importDuplicates);
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
                    try {
                        Long storageId = client.uploadStorage(translationFile.getName(), new FileInputStream(translationFile));
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
            ConcurrencyUtil.executeAndWait(tasks);
        }
    }
}
