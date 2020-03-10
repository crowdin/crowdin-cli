package com.crowdin.cli.commands.parts;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.FileClient;
import com.crowdin.cli.client.StorageClient;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.request.SpreadsheetFileImportOptionsWrapper;
import com.crowdin.cli.client.request.UpdateFilePayloadWrapper;
import com.crowdin.cli.client.request.XmlFileImportOptionsWrapper;
import com.crowdin.cli.commands.functionality.DryrunSources;
import com.crowdin.cli.commands.functionality.ProjectProxy;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.*;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.request.*;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;

public class UploadSourcesCommand extends PropertiesBuilderCommandPart {


    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true)
    protected boolean autoUpdate = true;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_CONF = "update_as_unapproved";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF = "update_without_changes";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS = "keep_translations";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS = "keep_translations_and_approvals";

    @Override
    public void run() {
        CommandUtils commandUtils = new CommandUtils();

        PropertiesBean pb = this.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectProxy project = new ProjectProxy(pb.getProjectId(), settings);
        Optional<Long> branchId;
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
            (new DryrunSources(pb, placeholderUtil)).run(treeView);
            return;
        }

        FileClient fileClient = new FileClient(settings);
        StorageClient storageClient = new StorageClient(settings);
        DirectoriesClient directoriesClient = new DirectoriesClient(settings, pb.getProjectId());
        BranchClient branchClient = new BranchClient(settings);

        if (branch != null) {
            Optional<Branch> branchOpt = project.getBranchByName(branch);
            if (branchOpt.isPresent()) {
                branchId = branchOpt.map(Branch::getId);
            } else {
                try {
                    Branch newBranch = branchClient.createBranch(pb.getProjectId(), new BranchPayload(branch));
                    project.addBranchToList(newBranch);
                    branchId = Optional.of(newBranch.getId());
                    System.out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), branch)));
                } catch (ResponseException e) {
                    throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.create_branch"), branch), e);
                }
            }
        } else {
            branchId = Optional.empty();
        }

        List<Runnable> fileTasks = pb.getFiles().stream()
            .map(file -> (Runnable) () -> {
                if (StringUtils.isAnyEmpty(file.getSource(), file.getTranslation())) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources_or_translations"));
                }
                List<String> sources = CommandUtils.getSourcesWithoutIgnores(
                    file,
                    pb.getBasePath(),
                    placeholderUtil);
                String commonPath =
                    (pb.getPreserveHierarchy()) ? "" : CommandUtils.getCommonPath(sources, pb.getBasePath());

                boolean isDest = StringUtils.isNotEmpty(file.getDest());

                if (sources.isEmpty()) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
                }
                if (isDest && commandUtils.isSourceContainsPattern(file.getSource())) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_pattern_in_source"));
                } else if (isDest && !pb.getPreserveHierarchy()) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
                }

                commandUtils.addDirectoryIdMap(
                    buildDirectoryPaths(project.getMapDirectories(), project.getMapBranches()),
                    project.getMapBranches());

                List<Runnable> tasks = sources.stream()
                    .map(File::new)
                    .filter(File::isFile)
                    .map(sourceFile -> (Runnable) () -> {
                        String filePath;

                        if (isDest) {
                            filePath = file.getDest();
                        } else {
                            filePath = Utils.replaceBasePath(sourceFile.getAbsolutePath(), pb.getBasePath());
                            filePath = StringUtils.removeStart(filePath, Utils.PATH_SEPARATOR);
                            filePath = StringUtils.removeStart(filePath, commonPath);
                        }
                        Long directoryId = commandUtils.createPath(filePath, branchId, directoriesClient);
                        String fName = ((isDest) ? new File(file.getDest()) : sourceFile).getName();

                        ImportOptions importOptions = (sourceFile.getName().endsWith(".xml"))
                            ? new XmlFileImportOptionsWrapper(
                                getOr(file.getContentSegmentation(), false),
                                getOr(file.getTranslateAttributes(), false),
                                getOr(file.getTranslateContent(), false),
                                file.getTranslatableElements())
                            : new SpreadsheetFileImportOptionsWrapper(
                                getOr(file.getFirstLineContainsHeader(), false),
                                getSchemeObject(file.getScheme()));

                        ExportOptions exportOptions = null;
                        if (StringUtils.isNoneEmpty(sourceFile.getAbsolutePath(), file.getTranslation())) {
                            String exportPattern = commandUtils.replaceDoubleAsteriskInTranslation(
                                file.getTranslation(),
                                sourceFile.getAbsolutePath(),
                                file.getSource(),
                                pb.getBasePath()
                            );
                            exportPattern = StringUtils.replacePattern(exportPattern, "[\\\\/]+", "/");
                            PropertyFileExportOptions pfExportOptions = new PropertyFileExportOptions();
                            pfExportOptions.setExportPattern(exportPattern);
                            if (file.getEscapeQuotes() != null) {
                                pfExportOptions.setEscapeQuotes(file.getEscapeQuotes());
                            }
                            if (file.getEscapeSpecialCharacters() != null) {
                                pfExportOptions.setEscapeSpecialCharacters(file.getEscapeSpecialCharacters());
                            }
                            exportOptions = pfExportOptions;
                        }

                        Long storageId;
                        try {
                            storageId = storageClient.uploadStorage(sourceFile, fName);
                        } catch (Exception e) {
                            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), sourceFile.getAbsolutePath()));
                        }

                        FilePayload filePayload = new FilePayload();
                        filePayload.setName(fName);
                        filePayload.setType(file.getType());
                        filePayload.setImportOptions(importOptions);
                        filePayload.setExportOptions(exportOptions);
                        filePayload.setStorageId(storageId);
                        if (directoryId != null) {
                            filePayload.setDirectoryId(directoryId);
                        } else branchId.ifPresent(filePayload::setBranchId);

                        FileEntity response = null;
                        try {
                            String fileName = ((this.branch == null) ? "" : this.branch + Utils.PATH_SEPARATOR) + filePath;
                            Optional<FileEntity> fileEntity =
                                project.getFileEntity(filePayload.getName(), filePayload.getDirectoryId(), branchId.orElse(null));
                            boolean fileExists = fileEntity.isPresent();
                            if (fileExists && autoUpdate) {
                                UpdateFilePayload updateFilePayload = new UpdateFilePayloadWrapper(
                                    filePayload.getStorageId(),
                                    filePayload.getExportOptions(),
                                    filePayload.getImportOptions());
                                getUpdateOption(file.getUpdateOption()).ifPresent(updateFilePayload::setUpdateOption);

                                fileClient.updateFile(pb.getProjectId(), fileEntity.map(fe -> fe.getId().toString()).get(), updateFilePayload);
                                System.out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileName)));
                            } else if (fileExists && !autoUpdate) {
                                System.out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileName)));
                            } else {
                                fileClient.uploadFile(pb.getProjectId(), filePayload);
                                System.out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileName)));
                            }
                        } catch (Exception e) {
                            String fileName = ((this.branch == null) ? "" : this.branch + Utils.PATH_SEPARATOR) + filePath;
                            System.out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileName)));
                            System.out.println(e.getMessage());
                        }
                    })
                    .collect(Collectors.toList());
                ConcurrencyUtil.executeAndWait(tasks);
            })
            .collect(Collectors.toList());
        ConcurrencyUtil.executeAndWaitSingleThread(fileTasks);
    }

    private Optional<String> getUpdateOption(String fileUpdateOption) {
        if (fileUpdateOption == null) {
            return Optional.empty();
        }
        switch(fileUpdateOption) {
            case UPDATE_OPTION_KEEP_TRANSLATIONS_CONF:
                return Optional.of(UPDATE_OPTION_KEEP_TRANSLATIONS);
            case UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF:
                return Optional.of(UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS);
            default:
                return Optional.empty();
        }
    }

    private Map<String, Long> buildDirectoryPaths(Map<Long, Directory> directories, Map<Long, Branch> branchNames) {
        Map<String, Long> directoryPaths = new HashMap<>();
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
            directoryPaths.put(sb.toString(), id);
        }
        return directoryPaths;
    }

    private <T> T getOr(T get, T or) {
        return (get != null) ? get : or;
    }

    private Map<String, Integer> getSchemeObject(String fileScheme) {
        if (StringUtils.isEmpty(fileScheme)) {
            return null;
        }

        String[] schemePart = fileScheme.split(",");
        Map<String, Integer> scheme = new HashMap<>();
        for (int i = 0; i < schemePart.length; i++) {
            scheme.put(schemePart[i], i);
        }
        return scheme;
    }
}
