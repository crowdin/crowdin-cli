package com.crowdin.cli.commands;

import com.crowdin.cli.client.*;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.request.TranslationPayloadWrapper;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.ConcurrencyUtil;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Language;
import com.crowdin.common.request.TranslationPayload;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import picocli.CommandLine;

import java.io.File;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name ="translations")
public class UploadTranslationsSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"--no-auto-approve-imported"}, negatable = true,
        description = "Approves uploaded translations automatically")
    protected boolean autoApproveImported = false;

    @CommandLine.Option(names = {"--no-import-duplicates"}, negatable = true,
        description = "Defines whether to add translation if the same translation already exists in Crowdin project")
    protected boolean importDuplicates = false;

    @CommandLine.Option(names = {"--no-import-eq-suggestions"}, negatable = true,
            description = "Defines whether to add translation if it is the same as the source string in Crowdin project")
    protected boolean importEqSuggestions = false;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", description = "If the option is defined the translations will be downloaded for a single specified language. (default: all)")
    protected String languageId;

    @Override
    public void run() {
        CommandUtils commandUtils = new CommandUtils();

        PropertiesBean pb = this.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectWrapper projectInfo = getProjectInfo(pb.getProjectId(), settings);
        PlaceholderUtil placeholderUtil =
            new PlaceholderUtil(projectInfo.getSupportedLanguages(), projectInfo.getProjectLanguages(), pb.getBasePath());

        StorageClient storageClient = new StorageClient(settings);
        BranchClient branchClient = new BranchClient(settings);
        TranslationsClient translationsClient = new TranslationsClient(settings, pb.getProjectId());

        Map<String, Long> filePathsToFileId;
        try {
            Map<Long, String> branchNames = branchClient.getBranchesMapIdName(pb.getProjectId());
            Map<Long, Directory> directories = projectInfo
                    .getDirectories()
                    .stream()
                    .collect(Collectors.toMap(Directory::getId, Function.identity()));
            filePathsToFileId = buildFilePaths(buildDirectoryPaths(directories, branchNames), projectInfo.getFiles());
        } catch (ResponseException e) {
            throw new RuntimeException("Couldn't get list of directories", e);
        }

        List<Language> languages = (languageId != null)
            ? projectInfo.getProjectLanguageByCrowdinCode(languageId)
            .map(Collections::singletonList)
            .orElseThrow(() -> new RuntimeException("Couldn't find language by language id: " + languageId))
            : projectInfo.getProjectLanguages();

        for (FileBean file : pb.getFiles()) {
            List<File> fileSourcesWithoutIgnores =
                    commandUtils.getFileSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil);

            String commonPath =
                (pb.getPreserveHierarchy())
                    ? ""
                    : commandUtils.getCommonPath(
                        fileSourcesWithoutIgnores.stream().map(File::getAbsolutePath).collect(Collectors.toList()),
                        pb.getBasePath());

            boolean isDest = StringUtils.isNotEmpty(file.getDest());

            if (fileSourcesWithoutIgnores.isEmpty()) {
                throw new RuntimeException("No sources found");
            }
            if (isDest && commandUtils.isSourceContainsPattern(file.getSource())) {
                throw new RuntimeException("Config contains 'dest' and have pattern in source. There can be only one file with 'dest'.");
            } else if (isDest && !pb.getPreserveHierarchy()) {
                throw new RuntimeException("The 'dest' parameter only works for single files, and if you use it, the configuration file should also include the 'preserve_hierarchy' parameter with true value.");
            }

            Map<File, Pair<Language, TranslationPayload>> preparedRequests = new HashMap<>();
            String branchPath = (StringUtils.isNotEmpty(this.branch) ? branch + Utils.PATH_SEPARATOR : "");
            for (File source : fileSourcesWithoutIgnores) {
                String filePath = branchPath + (isDest
                    ? file.getDest()
                    : StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath() + commonPath));

                Long fileId = filePathsToFileId.get(filePath);
                if (fileId == null) {
                    System.out.println(
                        "Source '" + filePath + "' from file '"
                        + StringUtils.removeStart(source.getAbsolutePath(), pb.getBasePath())
                        + "' does not exist in the project");
                    continue;
                }

//                build filePath to each source and project language
                String translation = placeholderUtil.replaceFileDependentPlaceholders(file.getTranslation(), source);
                for (Language language : languages) {
                    String transFileName = placeholderUtil.replaceLanguageDependentPlaceholders(translation, language);
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
                        System.out.println("Translation file '" + Utils.replaceBasePath(transFile.getAbsolutePath(), pb.getBasePath()) + "' does not exist");
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
                        throw new RuntimeException("Exception while uploading translation file to storage", e);
                    }
                    try {
                        translationsClient.uploadTranslations(lang.getId(), payload);
                    } catch (Exception e) {
                        throw new RuntimeException("Exception while uploading translation file", e);
                    }
                    System.out.println(
                        OK.withIcon(
                            "translation file '"
                            + Utils.replaceBasePath(translationFile.getAbsolutePath(), pb.getBasePath())
                            + "' is uploaded"));
                })
                .collect(Collectors.toList());
            ConcurrencyUtil.executeAndWait(tasks);
        }
    }

    private ProjectWrapper getProjectInfo(String projectId, Settings settings) {
        ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
        ProjectWrapper projectInfo = new ProjectClient(settings).getProjectInfo(projectId, false);
        ConsoleSpinner.stop(OK);
        return projectInfo;
    }

    private Map<Long, String> buildDirectoryPaths(Map<Long, Directory> directories, Map<Long, String> branchNames) {
        Map<Long, String> directoryPaths = new HashMap<>();
        for (Long id : directories.keySet()) {
            Directory dir = directories.get(id);
            StringBuilder sb = new StringBuilder(dir.getName()).append(Utils.PATH_SEPARATOR);
            while (dir.getDirectoryId() != null) {
                dir = directories.get(dir.getDirectoryId());
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
            }
            if (dir.getBranchId() != null) {
                sb.insert(0, branchNames.get(dir.getBranchId()) + Utils.PATH_SEPARATOR);
            }
            directoryPaths.put(id, sb.toString());
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
}
