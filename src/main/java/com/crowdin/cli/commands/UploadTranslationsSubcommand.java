package com.crowdin.cli.commands;

import com.crowdin.cli.client.StorageClient;
import com.crowdin.cli.client.TranslationsClient;
import com.crowdin.cli.client.request.TranslationPayloadWrapper;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
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
import java.util.stream.Stream;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;

@CommandLine.Command(
    name ="translations",
    sortOptions = false
)
public class UploadTranslationsSubcommand extends PropertiesBuilderCommandPart {

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

    @Override
    public void run() {
        PropertiesBean pb = this.buildPropertiesBean();
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
            (new DryrunTranslations(pb, projectLanguageMapping, placeholderUtil, true)).run(treeView);
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
            Stream<File> fileSourcesWithoutIgnores = SourcesUtils
                .getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil);

            String commonPath =
                (pb.getPreserveHierarchy())
                    ? ""
                    : CommandUtils.getCommonPath(
                        fileSourcesWithoutIgnores.map(File::getAbsolutePath).collect(Collectors.toList()),
                        pb.getBasePath());

            boolean isDest = StringUtils.isNotEmpty(file.getDest());

            if (fileSourcesWithoutIgnores.count() == 0) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
            }
            if (isDest && SourcesUtils.containsPattern(file.getSource())) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_pattern_in_source"));
            } else if (isDest && !pb.getPreserveHierarchy()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
            }

            Map<File, Pair<List<Language>, TranslationPayload>> preparedRequests = new HashMap<>();
            String branchPath = (StringUtils.isNotEmpty(this.branch) ? branch + Utils.PATH_SEPARATOR : "");
            fileSourcesWithoutIgnores.forEach(source -> {
                String filePath = branchPath + (isDest
                    ? file.getDest()
                    : StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath() + commonPath));

                Long fileId = filePathsToFileId.get(filePath).getId();
                if (fileId == null) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("error.source_not_exists_in_project"), StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath()), filePath));
                    return;
                }

//                build filePath to each source and project language
                String fileSource = Utils.replaceBasePath(source.getAbsolutePath(), pb.getBasePath());
                String translation = TranslationsUtils.replaceDoubleAsterisk(file.getSource(), file.getTranslation(), fileSource);
                translation = placeholderUtil.replaceFileDependentPlaceholders(translation, source);
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
