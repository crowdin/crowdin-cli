package com.crowdin.cli.commands.parts;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.FileClient;
import com.crowdin.cli.client.StorageClient;
import com.crowdin.cli.client.request.SpreadsheetFileImportOptionsWrapper;
import com.crowdin.cli.client.request.UpdateFilePayloadWrapper;
import com.crowdin.cli.client.request.XmlFileImportOptionsWrapper;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.request.*;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.console.ExecutionStatus.*;

public class UploadSourcesCommand extends Command {


    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true)
    protected boolean autoUpdate = true;

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
            ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
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
        BranchClient branchClient = new BranchClient(settings, pb.getProjectId());

        Optional<Branch> branchId =
            Optional.ofNullable(branch).map(brName -> ProjectUtils.getOrCreateBranch(branchClient, project, brName));

        Map<String, Long> directoryPaths = ProjectFilesUtils.buildDirectoryPaths(project.getMapDirectories(), project.getMapBranches())
            .entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));

        List<Runnable> fileTasks = pb.getFiles().stream()
            .map(file -> (Runnable) () -> {
                if (StringUtils.isAnyEmpty(file.getSource(), file.getTranslation())) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources_or_translations"));
                }
                List<String> sources = SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                    .map(File::getAbsolutePath)
                    .collect(Collectors.toList());
                String commonPath =
                    (pb.getPreserveHierarchy()) ? "" : SourcesUtils.getCommonPath(sources, pb.getBasePath());

                boolean isDest = StringUtils.isNotEmpty(file.getDest());

                List<Runnable> tasks = sources.stream()
                    .map(File::new)
                    .filter(File::isFile)
                    .map(sourceFile -> (Runnable) () -> {
                        String filePath;

                        if (isDest) {
                            filePath = file.getDest();
                        } else {
                            filePath = StringUtils.removeStart(sourceFile.getAbsolutePath(), pb.getBasePath());
                            filePath = StringUtils.removeStart(filePath, Utils.PATH_SEPARATOR);
                            filePath = StringUtils.removeStart(filePath, commonPath);
                        }
                        Long directoryId = ProjectUtils.createPath(directoriesClient, directoryPaths, filePath, branchId);
                        String fName = ((isDest) ? new File(file.getDest()) : sourceFile).getName();

                        ImportOptions importOptions = (sourceFile.getName().endsWith(".xml"))
                            ? new XmlFileImportOptionsWrapper(
                                file.getContentSegmentation(),
                                file.getTranslateAttributes(),
                                file.getTranslateContent(),
                                file.getTranslatableElements())
                            : new SpreadsheetFileImportOptionsWrapper(
                                file.getFirstLineContainsHeader(),
                                PropertiesBeanUtils.getSchemeObject(file.getScheme()));

                        ExportOptions exportOptions = null;
                        if (StringUtils.isNoneEmpty(file.getTranslation())) {
                            String exportPattern = TranslationsUtils.replaceDoubleAsterisk(
                                file.getSource(),
                                file.getTranslation(),
                                    StringUtils.removeStart(sourceFile.getAbsolutePath(), pb.getBasePath())
                            );
                            exportPattern = StringUtils.replacePattern(exportPattern, "[\\\\/]+", "/");
                            PropertyFileExportOptions pfExportOptions = new PropertyFileExportOptions();
                            pfExportOptions.setExportPattern(exportPattern);
                            if (file.getEscapeQuotes() != null) {
                                pfExportOptions.setEscapeQuotes(file.getEscapeQuotes());
                            }
                            if (file.getEscapeSpecialCharacters() != null) {
                                pfExportOptions.setEscapeSpecialCharacters(file.getEscapeSpecialCharacters());
                            } else if (SourcesUtils.isFileProperties(sourceFile)) {
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

                if (tasks.isEmpty()) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
                }

                ConcurrencyUtil.executeAndWait(tasks);
            })
            .collect(Collectors.toList());
        ConcurrencyUtil.executeAndWaitSingleThread(fileTasks);
    }

}
