package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.StorageClient;
import com.crowdin.cli.client.TranslationsClient;
import com.crowdin.cli.client.request.TranslationPayloadWrapper;
import com.crowdin.cli.commands.functionality.DryrunTranslations;
import com.crowdin.cli.commands.functionality.ProjectProxy;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.ConcurrencyUtil;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
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
        CommandUtils commandUtils = new CommandUtils();

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

        if (dryrun) {
            (new DryrunTranslations(pb, placeholderUtil, true)).run(treeView);
            return;
        }

        Optional<Map<String, Map<String, String>>> projectLanguageMapping = project.getLanguageMapping();

        StorageClient storageClient = new StorageClient(settings);
        TranslationsClient translationsClient = new TranslationsClient(settings, pb.getProjectId());

        Map<String, Long> filePathsToFileId =
            buildFilePaths(
                buildDirectoryPaths(project.getMapDirectories(), project.getMapBranches()),
                project.getFiles());

        List<Language> languages = (languageId != null)
            ? project.getLanguageById(languageId)
                .map(Collections::singletonList)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.not_found_language"), languageId)))
            : project.getProjectLanguages();
        project.getPseudoLanguage().ifPresent(languages::remove);

        for (FileBean file : pb.getFiles()) {
            List<File> fileSourcesWithoutIgnores =
                    CommandUtils.getFileSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil);

            String commonPath =
                (pb.getPreserveHierarchy())
                    ? ""
                    : CommandUtils.getCommonPath(
                        fileSourcesWithoutIgnores.stream().map(File::getAbsolutePath).collect(Collectors.toList()),
                        pb.getBasePath());

            boolean isDest = StringUtils.isNotEmpty(file.getDest());

            if (fileSourcesWithoutIgnores.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
            }
            if (isDest && commandUtils.isSourceContainsPattern(file.getSource())) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_pattern_in_source"));
            } else if (isDest && !pb.getPreserveHierarchy()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
            }

            Map<File, Pair<Language, TranslationPayload>> preparedRequests = new HashMap<>();
            String branchPath = (StringUtils.isNotEmpty(this.branch) ? branch + Utils.PATH_SEPARATOR : "");
            for (File source : fileSourcesWithoutIgnores) {
                String filePath = branchPath + (isDest
                    ? file.getDest()
                    : StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath() + commonPath));

                Long fileId = filePathsToFileId.get(filePath);
                if (fileId == null) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("error.source_not_exists_in_project"), StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath()), filePath));
                    continue;
                }

//                build filePath to each source and project language
                String translation = CommandUtils.replaceDoubleAsteriskInTranslation(file.getTranslation(), source.getAbsolutePath(), file.getSource(), pb.getBasePath());
                translation = placeholderUtil.replaceFileDependentPlaceholders(translation, source);
                for (Language language : languages) {
                    Map<String, Map<String, String>> languageMapping = file.getLanguagesMapping() != null ? file.getLanguagesMapping() : new HashMap<>();
                    if (projectLanguageMapping.isPresent()) {
                        populateLanguageMapping(languageMapping, projectLanguageMapping.get(), BaseCli.placeholderMappingForServer);
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
                    preparedRequests.put(transFile, Pair.of(language, translationPayload));
                }
            }

            List<Runnable> tasks = preparedRequests.entrySet()
                .stream()
                .map(entry -> (Runnable) () -> {
                    File translationFile = entry.getKey();
                    Language lang = entry.getValue().getLeft();
                    TranslationPayload payload = entry.getValue().getRight();
                    try {
                        Long storageId = storageClient.uploadStorage(translationFile, translationFile.getName());
                        payload.setStorageId(storageId);
                    } catch (Exception e) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_translation_to_storage"), e);
                    }
                    try {
                        translationsClient.uploadTranslations(lang.getId(), payload);
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

    private Map<Long, String> buildDirectoryPaths(Map<Long, Directory> directories, Map<Long, Branch> branchNames) {
        Map<Long, String> directoryPaths = new HashMap<>();
        for (Long id : directories.keySet()) {
            Directory dir = directories.get(id);
            StringBuilder sb = new StringBuilder(dir.getName()).append(Utils.PATH_SEPARATOR);
            while (dir.getDirectoryId() != null) {
                dir = directories.get(dir.getDirectoryId());
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
            }
            if (dir.getBranchId() != null) {
                sb.insert(0, branchNames.get(dir.getBranchId()).getName() + Utils.PATH_SEPARATOR);
            }
            directoryPaths.put(id, sb.toString());
        }
        for (Long id : branchNames.keySet()) {
            directoryPaths.put(id, branchNames.get(id).getName() + Utils.PATH_SEPARATOR);
        }
        return directoryPaths;
    }

    private Map<String, Long> buildFilePaths(Map<Long, String> directoryPaths, List<FileEntity> files) {
        Map<String, Long> filePathsToId = new HashMap<>();
        for (FileEntity fileEntity : files) {
            Long parentId = (fileEntity.getDirectoryId() != null) ? fileEntity.getDirectoryId() : fileEntity.getBranchId();
            filePathsToId.put(((parentId != null) ? directoryPaths.get(parentId) : "") + fileEntity.getName(), fileEntity.getId());
        }
        return filePathsToId;
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
