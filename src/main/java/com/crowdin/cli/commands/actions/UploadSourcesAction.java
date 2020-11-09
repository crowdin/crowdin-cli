package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.ProjectUtils;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.commands.functionality.TranslationsUtils;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.ExportOptions;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcefiles.model.ImportOptions;
import com.crowdin.client.sourcefiles.model.OtherFileImportOptions;
import com.crowdin.client.sourcefiles.model.PropertyFileExportOptions;
import com.crowdin.client.sourcefiles.model.SpreadsheetFileImportOptions;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcefiles.model.XmlFileImportOptions;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class UploadSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private String branchName;
    private boolean noProgress;
    private boolean autoUpdate;
    private boolean debug;
    private boolean plainView;

    public UploadSourcesAction(String branchName, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView) {
        this.branchName = branchName;
        this.noProgress = noProgress || plainView;
        this.autoUpdate = autoUpdate;
        this.debug = debug;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, client::downloadFullProject);

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), pb.getBasePath());

        Branch branchId = (branchName != null) ? this.getOrCreateBranch(out, branchName, client, project) : null;

        Map<String, Long> directoryPaths = ProjectFilesUtils.buildDirectoryPaths(project.getDirectories(), project.getBranches())
                .entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());

        List<String> uploadedSources = new ArrayList<>();

        AtomicBoolean errorsPresented = new AtomicBoolean(false);
        List<Runnable> tasks = pb.getFiles().stream()
            .map(file -> (Runnable) () -> {
                List<String> sources = SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                    .map(File::getAbsolutePath)
                    .collect(Collectors.toList());
                if (sources.isEmpty()) {
                    if (!plainView) {
                        errorsPresented.set(true);
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("error.no_sources"));
                    } else {
                        return;
                    }
                }
                String commonPath =
                    (pb.getPreserveHierarchy()) ? "" : SourcesUtils.getCommonPath(sources, pb.getBasePath());
                List<Runnable> taskss = sources.stream()
                    .map(source -> {
                        final File sourceFile = new File(source);
                        final String filePath = (file.getDest() != null)
                                ? StringUtils.removePattern(file.getDest(), "^[\\\\/]")
                                : StringUtils.removeStart(source, pb.getBasePath() + commonPath);
                        final String fileFullPath = (branchName != null ? branchName + Utils.PATH_SEPARATOR : "") + filePath;
                        final String fileName = fileFullPath.substring(fileFullPath.lastIndexOf(Utils.PATH_SEPARATOR) + 1);

                        synchronized (uploadedSources) {
                            if (uploadedSources.contains(fileFullPath)) {
                                return (plainView)
                                    ? (Runnable) () -> { } // print nothing
                                    : (Runnable) () -> out.println(WARNING.withIcon(
                                        String.format(RESOURCE_BUNDLE.getString("message.already_uploaded"),
                                            fileFullPath)));
                            }
                            uploadedSources.add(fileFullPath);
                        }

                        FileInfo projectFile = paths.get(fileFullPath);
                        if (autoUpdate && projectFile != null) {
                            final UpdateFileRequest request = new UpdateFileRequest();
                            request.setExportOptions(buildExportOptions(sourceFile, file, pb.getBasePath()));
                            request.setImportOptions(buildImportOptions(sourceFile, file));
                            PropertiesBeanUtils.getUpdateOption(file.getUpdateOption()).ifPresent(request::setUpdateOption);

                            final Long sourceId = projectFile.getId();

                            return (Runnable) () -> {
                                try (InputStream fileStream = new FileInputStream(sourceFile)) {
                                    request.setStorageId(client.uploadStorage(fileName, fileStream));
                                } catch (IOException e) {
                                    errorsPresented.set(true);
                                    throw new RuntimeException(
                                        String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), sourceFile.getAbsolutePath()));
                                }

                                try {
                                    client.updateSource(sourceId, request);
                                    if (!plainView) {
                                        out.println(
                                            OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
                                    } else {
                                        out.println(fileFullPath);
                                    }
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath), e);
                                }
                            };
                        } else if (projectFile == null) {
                            final AddFileRequest request = new AddFileRequest();
                            request.setName(fileName);
                            request.setExportOptions(buildExportOptions(sourceFile, file, pb.getBasePath()));
                            request.setImportOptions(buildImportOptions(sourceFile, file));
                            if (file.getType() != null) {
                                request.setType(file.getType());
                            }

                            return (Runnable) () -> {
                                Long directoryId = null;
                                try {
                                    directoryId = ProjectUtils.createPath(out, client, directoryPaths, filePath, branchId, plainView);
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.creating_directories"), e);
                                }

                                if (directoryId != null) {
                                    request.setDirectoryId(directoryId);
                                } else if (branchId != null) {
                                    request.setBranchId(branchId.getId());
                                }

                                try (InputStream fileStream = new FileInputStream(sourceFile)) {
                                    request.setStorageId(client.uploadStorage(fileName, fileStream));
                                } catch (IOException e) {
                                    errorsPresented.set(true);
                                    throw new RuntimeException(
                                        String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), sourceFile.getAbsolutePath()));
                                }
                                try {
                                    client.addSource(request);
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath), e);
                                }
                                if (!plainView) {
                                    out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
                                } else {
                                    out.println(fileFullPath);
                                }
                            };
                        } else {
                            return (Runnable) () -> {
                                if (!plainView) {
                                    out.println(SKIPPED.withIcon(String.format(
                                        RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
                                }
                            };
                        }

                    })
                    .collect(Collectors.toList());
                ConcurrencyUtil.executeAndWait(taskss, debug);
            })
            .collect(Collectors.toList());
        ConcurrencyUtil.executeAndWaitSingleThread(tasks, debug);
        if (errorsPresented.get()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.errors_presented"));
        }
    }

    private ImportOptions buildImportOptions(java.io.File sourceFile, FileBean fileBean) {
        if (FilenameUtils.isExtension(sourceFile.getName(), "csv")) {
            SpreadsheetFileImportOptions importOptions = new SpreadsheetFileImportOptions();
            importOptions.setFirstLineContainsHeader(fileBean.getFirstLineContainsHeader());
            importOptions.setScheme(PropertiesBeanUtils.getSchemeObject(fileBean.getScheme()));
            return importOptions;
        } else if (FilenameUtils.isExtension(sourceFile.getName(), "xml")) {
            XmlFileImportOptions importOptions = new XmlFileImportOptions();
            importOptions.setTranslateContent(fileBean.getTranslateContent());
            importOptions.setTranslateAttributes(fileBean.getTranslateAttributes());
            importOptions.setContentSegmentation(fileBean.getContentSegmentation());
            importOptions.setTranslatableElements(fileBean.getTranslatableElements());
            return importOptions;
        } else {
            OtherFileImportOptions importOptions = new OtherFileImportOptions();
            importOptions.setContentSegmentation(fileBean.getContentSegmentation());
            return importOptions;
        }
    }

    private ExportOptions buildExportOptions(java.io.File sourceFile, FileBean fileBean, String basePath) {
        PropertyFileExportOptions exportOptions = new PropertyFileExportOptions();
        String exportPattern = TranslationsUtils.replaceDoubleAsterisk(
            fileBean.getSource(),
            fileBean.getTranslation(),
            StringUtils.removeStart(sourceFile.getAbsolutePath(), basePath)
        );
        exportPattern = StringUtils.replacePattern(exportPattern, "[\\\\/]+", "/");
        exportOptions.setExportPattern(exportPattern);
        exportOptions.setEscapeQuotes(fileBean.getEscapeQuotes());
        if (fileBean.getEscapeSpecialCharacters() != null) {
            exportOptions.setEscapeSpecialCharacters(fileBean.getEscapeSpecialCharacters());
        } else if (SourcesUtils.isFileProperties(sourceFile)) {
            exportOptions.setEscapeSpecialCharacters(1);
        }
        return exportOptions;
    }

    private Branch getOrCreateBranch(Outputter out, String branchName, ProjectClient client, CrowdinProjectFull project) {
        if (StringUtils.isEmpty(branchName)) {
            return null;
        }
        Optional<Branch> branchOpt = project.findBranchByName(branchName);
        if (branchOpt.isPresent()) {
            return branchOpt.get();
        } else {
            AddBranchRequest request = new AddBranchRequest();
            request.setName(branchName);
            Branch newBranch = client.addBranch(request);
            if (!plainView) {
                out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), branchName)));
            }
            project.addBranchToLocalList(newBranch);
            return newBranch;
        }
    }
}
