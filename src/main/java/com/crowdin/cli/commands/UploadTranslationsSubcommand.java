package com.crowdin.cli.commands;

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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(
    name ="translations",
    customSynopsis = "@|fg(yellow) crowdin |@(@|fg(yellow) upload|@|@|fg(yellow) push|@) @|fg(yellow) translations|@ [CONFIG OPTIONS] [OPTIONS]",
    description = "Upload existing translations to a Crowdin project"
)
public class UploadTranslationsSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"--no-auto-approve-imported"}, negatable = true,
        description = "Approve added translations automatically")
    protected boolean autoApproveImported = false;

    @CommandLine.Option(names = {"--no-import-duplicates"}, negatable = true,
        description = "Add translations even if the same translations already exist in your Crowdin project")
    protected boolean importDuplicates = false;

    @CommandLine.Option(names = {"--no-import-eq-suggestions"}, negatable = true,
            description = "Add translations even if they’re the same as the source strings in your Crowdin project")
    protected boolean importEqSuggestions = false;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", description = "Specify branch name. Default: none")
    protected String branch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", description = "Use this option to download translations for a single specified language. Default: all")
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"}, description = "Run command without API connection")
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
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
            throw new RuntimeException("Exception while gathering project info", e);
        }

        PlaceholderUtil placeholderUtil =
            new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        if (dryrun) {
            (new DryrunTranslations(pb, placeholderUtil, true)).run(treeView);
            return;
        }

        StorageClient storageClient = new StorageClient(settings);
        TranslationsClient translationsClient = new TranslationsClient(settings, pb.getProjectId());

        Map<String, Long> filePathsToFileId =
            buildFilePaths(
                buildDirectoryPaths(project.getMapDirectories(), project.getMapBranches()),
                project.getFiles());

        List<Language> languages = (languageId != null)
            ? project.getLanguageById(languageId)
                .map(Collections::singletonList)
                .orElseThrow(() -> new RuntimeException("Couldn't find language by language id: " + languageId))
            : project.getProjectLanguages();

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
                    String transFileName = (file.getLanguagesMapping() != null)
                        ? placeholderUtil.replaceLanguageDependentPlaceholders(translation, file.getLanguagesMapping(), language)
                        : placeholderUtil.replaceLanguageDependentPlaceholders(translation, language);
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
}
