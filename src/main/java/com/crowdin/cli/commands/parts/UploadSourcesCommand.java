package com.crowdin.cli.commands.parts;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.FileClient;
import com.crowdin.cli.client.StorageClient;
import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.cli.client.request.SpreadsheetFileImportOptionsWrapper;
import com.crowdin.cli.client.request.UpdateFilePayloadWrapper;
import com.crowdin.cli.client.request.XmlFileImportOptionsWrapper;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.*;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.request.*;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
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

    @Override
    public void run() {
        PropertiesBean pb = this.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectProxy project = new ProjectProxy(pb.getProjectId(), settings);
        Optional<Branch> branchId;
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
                branchId = branchOpt;
            } else {
                try {
                    Branch newBranch = branchClient.createBranch(pb.getProjectId(), new BranchPayload(branch));
                    project.addBranchToList(newBranch);
                    branchId = Optional.of(newBranch);
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
                List<String> sources = SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                    .map(File::getAbsolutePath)
                    .collect(Collectors.toList());
                String commonPath =
                    (pb.getPreserveHierarchy()) ? "" : CommandUtils.getCommonPath(sources, pb.getBasePath());

                boolean isDest = StringUtils.isNotEmpty(file.getDest());

                if (sources.isEmpty()) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
                }
                if (isDest && SourcesUtils.containsPattern(file.getSource())) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_pattern_in_source"));
                } else if (isDest && !pb.getPreserveHierarchy()) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.dest_and_preserve_hierarchy"));
                }

                Map<String, Long> directoryPaths = StreamUtils.reverseMap(ProjectFilesUtils.buildDirectoryPaths(project.getMapDirectories(), project.getMapBranches()));
                Map<Long, Branch> mapBranches = project.getMapBranches();

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
                        Long directoryId = createPath(directoryPaths, mapBranches, filePath, branchId, directoriesClient);
                        String fName = ((isDest) ? new File(file.getDest()) : sourceFile).getName();

                        ImportOptions importOptions = (sourceFile.getName().endsWith(".xml"))
                            ? new XmlFileImportOptionsWrapper(
                                getOr(file.getContentSegmentation(), false),
                                getOr(file.getTranslateAttributes(), false),
                                getOr(file.getTranslateContent(), false),
                                file.getTranslatableElements())
                            : new SpreadsheetFileImportOptionsWrapper(
                                getOr(file.getFirstLineContainsHeader(), false),
                                PropertiesBeanUtils.getSchemeObject(file.getScheme()));

                        ExportOptions exportOptions = null;
                        if (StringUtils.isNoneEmpty(sourceFile.getAbsolutePath(), file.getTranslation())) {
                            String fileSource = Utils.replaceBasePath(sourceFile.getAbsolutePath(), pb.getBasePath());
                            String exportPattern = TranslationsUtils.replaceDoubleAsterisk(
                                file.getSource(),
                                file.getTranslation(),
                                fileSource
                            );
                            exportPattern = StringUtils.replacePattern(exportPattern, "[\\\\/]+", "/");
                            PropertyFileExportOptions pfExportOptions = new PropertyFileExportOptions();
                            pfExportOptions.setExportPattern(exportPattern);
                            if (file.getEscapeQuotes() != null) {
                                pfExportOptions.setEscapeQuotes(file.getEscapeQuotes());
                            }
                            if (file.getEscapeSpecialCharacters() != null) {
                                pfExportOptions.setEscapeSpecialCharacters(file.getEscapeSpecialCharacters());
                            } else if (FilenameUtils.isExtension(sourceFile.getName(), "properties")) {
                                pfExportOptions.setEscapeSpecialCharacters(1);
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
                        } else branchId.map(Branch::getId).ifPresent(filePayload::setBranchId);

                        FileEntity response = null;
                        try {
                            String fileName = ((this.branch == null) ? "" : this.branch + Utils.PATH_SEPARATOR) + filePath;
                            Optional<FileEntity> fileEntity =
                                project.getFileEntity(filePayload.getName(), filePayload.getDirectoryId(), branchId.map(Branch::getId).orElse(null));
                            boolean fileExists = fileEntity.isPresent();
                            if (fileExists && autoUpdate) {
                                UpdateFilePayload updateFilePayload = new UpdateFilePayloadWrapper(
                                    filePayload.getStorageId(),
                                    filePayload.getExportOptions(),
                                    filePayload.getImportOptions());
                                PropertiesBeanUtils.getUpdateOption(file.getUpdateOption()).ifPresent(updateFilePayload::setUpdateOption);

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

    private <T> T getOr(T get, T or) {
        return (get != null) ? get : or;
    }

    /**
     * return deepest directory id
     */
    private Long createPath(Map<String, Long> directoryIdMap, Map<Long, Branch> branchNameMap, String filePath, Optional<Branch> branchId, DirectoriesClient directoriesClient) {
        String[] nodes = filePath.split(Utils.PATH_SEPARATOR_REGEX);

        Long directoryId = null;
        StringBuilder parentPath = new StringBuilder();
        String branchPath = (branchId.map(branch -> branch.getName() + Utils.PATH_SEPARATOR).orElse(""));
        for (String node : nodes) {
            if (StringUtils.isEmpty(node) || node.equals(nodes[nodes.length - 1])) {
                continue;
            }
            parentPath.append(node).append(Utils.PATH_SEPARATOR);
            String parentPathString = branchPath + parentPath.toString();
            if (directoryIdMap.containsKey(parentPathString)) {
                directoryId = directoryIdMap.get(parentPathString);
            } else {
                DirectoryPayload directoryPayload = new DirectoryPayload();
                directoryPayload.setName(node);

                if (directoryId == null) {
                    branchId.map(Branch::getId).ifPresent(directoryPayload::setBranchId);
                } else {
                    directoryPayload.setDirectoryId(directoryId);
                }
                directoryId = createDirectory(directoryIdMap, directoriesClient, directoryPayload, parentPathString);
            }
        }
        return directoryId;
    }

    private final Map<String, Lock> pathLocks = new ConcurrentHashMap<>();

    private Long createDirectory(Map<String, Long> directoryIdMap, DirectoriesClient directoriesClient, DirectoryPayload directoryPayload, String path) {
        Lock lock;
        synchronized (pathLocks) {
            if (!pathLocks.containsKey(path)) {
                pathLocks.put(path, new ReentrantLock());
            }
            lock = pathLocks.get(path);
        }
        Long directoryId;
        try {
            lock.lock();
            if (directoryIdMap.containsKey(path)) {
                return directoryIdMap.get(path);
            }
            Directory directory = directoriesClient.createDirectory(directoryPayload);
            directoryId = directory.getId();
            directoryIdMap.put(path, directoryId);
            System.out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(path.toString(), "[\\\\/]$"))));
        } catch (ExistsResponseException e) {
            System.out.println(ExecutionStatus.SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(path.toString(), "[\\\\/]$"))));
            if (directoryIdMap.containsKey(path)) {
                return directoryIdMap.get(path);
            } else {
                throw new RuntimeException("Couldn't create directory '" + path + "' because it's already here");
            }
        } catch (WaitResponseException e) {
            try {
                Thread.sleep(500);
            } catch (InterruptedException ignored) {
            }
            return createDirectory(directoryIdMap, directoriesClient, directoryPayload, path);
        } catch (ResponseException e) {
            throw new RuntimeException("Unhandled exception", e);
        } finally {
            lock.unlock();
        }
        return directoryId;
    }
}
