package com.crowdin.cli.commands;

import com.crowdin.cli.client.StorageClient;
import com.crowdin.cli.client.TranslationsClient;
import com.crowdin.cli.client.request.TranslationPayloadWrapper;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.commands.parts.Command;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.ConcurrencyUtil;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.common.Settings;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Language;
import com.crowdin.common.request.TranslationPayload;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import picocli.CommandLine;

import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
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
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectProxy project = new ProjectProxy(pb.getProjectId(), settings);
        try {
            ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
            project.downloadProject()
                .downloadSupportedLanguages()
                .downloadDirectories()
                .downloadFiles()
                .downloadBranches();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }

        PlaceholderUtil placeholderUtil =
            new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        Optional<Map<String, Map<String, String>>> projectLanguageMapping = project.getLanguageMapping();

        if (dryrun) {
            (new DryrunTranslations(pb, projectLanguageMapping, placeholderUtil, Optional.empty(), true)).run(treeView);
            return;
        }


        StorageClient storageClient = new StorageClient(settings);
        TranslationsClient translationsClient = new TranslationsClient(settings, pb.getProjectId());

        Map<String, FileEntity> filePathsToFileId =
            ProjectFilesUtils.buildFilePaths(project.getMapDirectories(), project.getMapBranches(), project.getFiles());

        List<Language> languages = (languageId != null)
            ? project.getLanguageById(languageId)
                .map(Collections::singletonList)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.not_found_language"), languageId)))
            : project.getProjectLanguages();
        project.getPseudoLanguage().ifPresent(languages::remove);

        for (FileBean file : pb.getFiles()) {
            List<String> fileSourcesWithoutIgnores = SourcesUtils
                .getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                .map(File::getAbsolutePath)
                .collect(Collectors.toList());

            String commonPath = (pb.getPreserveHierarchy())
                ? ""
                : SourcesUtils.getCommonPath(fileSourcesWithoutIgnores, pb.getBasePath());

            if (fileSourcesWithoutIgnores.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
            }

            Map<File, Pair<List<Language>, TranslationPayload>> preparedRequests = new HashMap<>();
            String branchPath = (StringUtils.isNotEmpty(this.branch) ? branch + Utils.PATH_SEPARATOR : "");
            fileSourcesWithoutIgnores.forEach(source -> {
                String filePath = branchPath + (StringUtils.isNotEmpty(file.getDest())
                    ? file.getDest()
                    : StringUtils.removeStart(source, pb.getBasePath() + commonPath));

                if (!filePathsToFileId.containsKey(filePath)) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("error.source_not_exists_in_project"), StringUtils.removeStart(source, pb.getBasePath()), filePath));
                    return;
                }
                Long fileId = filePathsToFileId.get(filePath).getId();

//                build filePath to each source and project language
                String fileSource = Utils.replaceBasePath(source, pb.getBasePath());
                String translation = TranslationsUtils.replaceDoubleAsterisk(file.getSource(), file.getTranslation(), fileSource);
                translation = placeholderUtil.replaceFileDependentPlaceholders(translation, new File(source));
                if (file.getScheme() != null) {
                    File transFile = new File(pb.getBasePath() + Utils.PATH_SEPARATOR + translation);
                    if (!transFile.exists()) {
                        System.out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("error.translation_not_exists"), Utils.replaceBasePath(transFile.getAbsolutePath(), pb.getBasePath()))));
                        return;
                    }
                    TranslationPayload translationPayload = new TranslationPayloadWrapper(
                        fileId,
                        this.importDuplicates,
                        this.importEqSuggestions,
                        this.autoApproveImported);
                    preparedRequests.put(transFile, Pair.of(languages, translationPayload));
                } else {
                    for (Language language : languages) {
                        Map<String, Map<String, String>> languageMapping = file.getLanguagesMapping() != null ? file.getLanguagesMapping() : new HashMap<>();
                        if (projectLanguageMapping.isPresent()) {
                            TranslationsUtils.populateLanguageMappingFromServer(languageMapping, projectLanguageMapping.get());
                        }

                        String transFileName = placeholderUtil.replaceLanguageDependentPlaceholders(translation, languageMapping, language);
                        if (file.getTranslationReplace() != null) {
                            for (String key : file.getTranslationReplace().keySet()) {
                                transFileName = StringUtils.replace(
                                        transFileName,
                                        key.replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX),
                                        file.getTranslationReplace().get(key));
                            }
                        }
                        File transFile = new File(pb.getBasePath() + Utils.PATH_SEPARATOR + transFileName);
                        if (!transFile.exists()) {
                            System.out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("error.translation_not_exists"), Utils.replaceBasePath(transFile.getAbsolutePath(), pb.getBasePath()))));
                            continue;
                        }
                        TranslationPayload translationPayload = new TranslationPayloadWrapper(
                            fileId,
                            this.importDuplicates,
                            this.importEqSuggestions,
                            this.autoApproveImported);
                        preparedRequests.put(transFile, Pair.of(Collections.singletonList(language), translationPayload));
                    }
                }
            });

            List<Runnable> tasks = preparedRequests.entrySet()
                .stream()
                .map(entry -> (Runnable) () -> {
                    File translationFile = entry.getKey();
                    List<Language> langs = entry.getValue().getLeft();
                    TranslationPayload payload = entry.getValue().getRight();
                    try {
                        Long storageId = storageClient.uploadStorage(translationFile, translationFile.getName());
                        payload.setStorageId(storageId);
                    } catch (Exception e) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_translation_to_storage"), e);
                    }
                    try {
                        for (Language lang : langs) {
                            translationsClient.uploadTranslations(lang.getId(), payload);
                        }
                    } catch (Exception e) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_translation"), e);
                    }
                    System.out.println(
                        OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.translation_uploaded"), Utils.replaceBasePath(translationFile.getAbsolutePath(), pb.getBasePath()))));
                })
                .collect(Collectors.toList());
            ConcurrencyUtil.executeAndWait(tasks);
        }
    }
}
