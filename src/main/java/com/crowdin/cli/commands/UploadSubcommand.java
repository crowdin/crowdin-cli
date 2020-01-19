package com.crowdin.cli.commands;

import com.crowdin.cli.client.*;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.request.PropertyFileExportOptionsWrapper;
import com.crowdin.cli.client.request.SpreadsheetFileImportOptionsWrapper;
import com.crowdin.cli.client.request.UpdateFilePayloadWrapper;
import com.crowdin.cli.client.request.XmlFileImportOptionsWrapper;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.*;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.cli.utils.file.FileReader;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.request.*;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import javax.ws.rs.core.Response;
import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.FETCHING_PROJECT_INFO;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "upload", aliases = "push", description = "Upload source files and existing translations to the Crowdin project")
public class UploadSubcommand extends GeneralCommand {

    @CommandLine.Option(names = {"--dryrun"}, description = "Runs command without API connection")
    protected boolean dryrun;

    @CommandLine.Option(names = {"-b", "--branch"}, description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @CommandLine.Option(names = {"--auto-update"}, negatable = true, description = "" +
            "Defines whether to update the source files in Crowdin project. " +
            "Use --no-auto-update when you want to upload new files without updating those that already exist.")
    protected boolean autoUpdate;

    @CommandLine.ArgGroup(exclusive = false, heading = "@|bold config params|@:%n")
    protected Params params;

    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_CONF = "update_as_unapproved";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF = "update_without_changes";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS = "keep_translations";
    protected static final String UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS = "keep_translations_and_approvals";

    @Override
    public Integer call() throws Exception {
        CommandUtils commandUtils = new CommandUtils();

        CliProperties cliProperties = new CliProperties();
        PropertiesBean pb = (params != null)
                ? cliProperties.getFromParams(params)
                : cliProperties.loadProperties((new FileReader()).readCliConfig(configFilePath.toFile()));
        cliProperties.validateProperties(pb);
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectWrapper projectInfo = getProjectInfo(pb, settings);

        FileClient fileClient = new FileClient(settings);
        StorageClient storageClient = new StorageClient(settings);
        DirectoriesClient directoriesClient = new DirectoriesClient(settings, projectInfo.getProjectId());
        BranchClient branchClient = new BranchClient(settings);

        Boolean preserveHierarchy = pb.getPreserveHierarchy();
        List<FileBean> files = pb.getFiles();
        Optional<Long> branchId = getOrCreateBranchId(settings, pb.getProjectId());

        for (FileBean file : files) {
            if (StringUtils.isAnyEmpty(file.getSource(), file.getTranslation())) {
                throw new RuntimeException("No sources and/or translations in config are included");
            }
            List<String> sources = commandUtils.getSourcesWithoutIgnores(
                file,
                pb.getBasePath(),
                new PlaceholderUtil(projectInfo.getSupportedLanguages(), projectInfo.getProjectLanguages(), pb.getBasePath()));
            String commonPath =
                (preserveHierarchy) ? "" : commandUtils.getCommonPath(sources, pb.getBasePath());

            boolean isDest = StringUtils.isNotEmpty(file.getDest());

            if (sources.isEmpty()) {
                throw new RuntimeException("No sources found");
            }
            if (isDest && commandUtils.isSourceContainsPattern(file.getSource())) {
                throw new RuntimeException("Config contains 'dest' and have pattern in source. There can be only one file with 'dest'.");
            } else if (isDest && !preserveHierarchy) {
                throw new RuntimeException("The 'dest' parameter only works for single files, and if you use it, the configuration file should also include the 'preserve_hierarchy' parameter with true value.");
            }

            try {
                Map<Long, String> branchNames = branchClient.getBranchesMapIdName(projectInfo.getProjectId());
                Map<Long, Directory> directories = directoriesClient.getProjectDirectoriesMapPathId();
                Map<String, Long> mapDirectoryPathId = buildDirectoryPaths(directories, branchNames);
                commandUtils.addDirectoryIdMap(mapDirectoryPathId, branchNames);
            } catch (ResponseException e) {
                throw new RuntimeException("Couldn't get list of directories", e);
            }

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
                                true,
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
                            if (file.getEscapeQuotes() == null) {
                                exportOptions = new PropertyFileExportOptionsWrapper(exportPattern);
                            } else {
                                exportOptions = new PropertyFileExportOptionsWrapper(file.getEscapeQuotes(), exportPattern);
                            }
                        }

                        Long storageId;
                        try {
                            storageId = storageClient.uploadStorage(sourceFile, fName);
                        } catch (Exception e) {
                            throw new RuntimeException("Couldn't upload file '" + sourceFile.getAbsolutePath() + "' to storage");
                        }

                        FilePayload filePayload = new FilePayload();
                        filePayload.setName(fName);
                        filePayload.setType(file.getType());
                        filePayload.setImportOptions(importOptions);
                        filePayload.setExportOptions(exportOptions);
                        filePayload.setStorageId(storageId);
                        if (directoryId == null) {
                            branchId.ifPresent(filePayload::setBranchId);
                        } else {
                            filePayload.setDirectoryId(directoryId);
                        }


                        Response response = null;
                        try {
                            if (autoUpdate) {
                                response = EntityUtils.find(
                                        projectInfo.getFiles(),
                                        filePayload.getName(),
                                        filePayload.getDirectoryId(),
                                        FileEntity::getName,
                                        FileEntity::getDirectoryId)
                                        .map(fileEntity -> {
                                            String fileId = fileEntity.getId().toString();
                                            String projectId = projectInfo.getProjectId();

                                            UpdateFilePayload updateFilePayload = new UpdateFilePayloadWrapper(
                                                    filePayload.getStorageId(),
                                                    filePayload.getExportOptions(),
                                                    filePayload.getImportOptions()
                                            );
                                            getUpdateOption(file.getUpdateOption())
                                                    .ifPresent(updateFilePayload::setUpdateOption);

                                            return fileClient.updateFile(projectId, fileId, updateFilePayload);
                                        }).orElseGet(() -> fileClient.uploadFile(projectInfo.getProject().getId().toString(), filePayload));
                            } else {
                                response = fileClient.uploadFile(projectInfo.getProject().getId().toString(), filePayload);
                            }
                            String fileName = ((this.branch == null) ? "" : this.branch + Utils.PATH_SEPARATOR) + filePath;
                            System.out.println(OK.withIcon(RESOURCE_BUNDLE.getString("uploading_file") + " '" + fileName + "'"));
                        } catch (Exception e) {
                            String fileName = ((this.branch == null) ? "" : this.branch + Utils.PATH_SEPARATOR) + filePath;
                            System.out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("uploading_file") + " '" + fileName + "'"));
//                            if (this.isDebug) {
//                                e.printStackTrace();
//                            }
                        }
                        if (this.isVerbose && response != null) {
                            System.out.println(response.getHeaders());
                            System.out.println(ResponseUtil.getResponceBody(response));
                        }
                    })
                    .collect(Collectors.toList());
            ConcurrencyUtil.executeAndWait(tasks);
        }
        return null;
    }

    private ProjectWrapper getProjectInfo(PropertiesBean pb, Settings settings) {
        ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
        ProjectWrapper projectInfo = new ProjectClient(settings).getProjectInfo(pb.getProjectId(), false);
        ConsoleSpinner.stop(OK);
        return projectInfo;
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

    private Optional<Long> getOrCreateBranchId(Settings settings, String projectId) {
        if (this.branch == null || this.branch.isEmpty()) {
            return Optional.empty();
        }

        Optional<Long> existBranch = new BranchClient(settings).getProjectBranchByName(Long.parseLong(projectId), branch)
                .map(Branch::getId);
        if (existBranch.isPresent()) {
            return existBranch;
        } else {
            return Optional.ofNullable(this.createBranch(branch, settings, projectId)).map(Branch::getId);
        }
    }

    private Branch createBranch(String name, Settings settings, String projectId) {
        try {
            Response createBranchResponse = new BranchesApi(settings)
                .createBranch(projectId, new BranchPayload(name))
                .execute();
            Branch branch = ResponseUtil.getResponceBody(createBranchResponse, new TypeReference<SimpleResponse<Branch>>() {
            }).getEntity();
            if (this.isVerbose) {
                System.out.println(createBranchResponse.getHeaders());
                System.out.println(ResponseUtil.getResponceBody(createBranchResponse));
            }

            System.out.println(OK.withIcon(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "'"));
            return branch;
        } catch (Exception e) {
            System.out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "'"));
            System.out.println(e.getMessage());
            if (false) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }
        return null;
    }

    private Map<String, Long> buildDirectoryPaths(Map<Long, Directory> directories, Map<Long, String> branchNames) {
        Map<String, Long> directoryPaths = new HashMap<>();
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
