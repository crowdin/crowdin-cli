package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.actions.subactions.DeleteObsoleteProjectFilesSubAction;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.sourcestrings.model.UploadStringsProgress;
import com.crowdin.client.sourcestrings.model.UploadStringsRequest;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;
import static com.crowdin.client.sourcefiles.model.ExportQuotes.DOUBLE;
import static com.crowdin.client.sourcefiles.model.ExportQuotes.SINGLE;

class UploadSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private String branchName;
    private boolean deleteObsolete;
    private boolean noProgress;
    private boolean autoUpdate;
    private boolean debug;
    private boolean plainView;

    public UploadSourcesAction(String branchName, boolean deleteObsolete, boolean noProgress, boolean autoUpdate, boolean debug, boolean plainView) {
        this.branchName = branchName;
        this.deleteObsolete = deleteObsolete;
        this.noProgress = noProgress || plainView;
        this.autoUpdate = autoUpdate;
        this.debug = debug;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, client::downloadFullProject);
        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);

        boolean containsExcludedLanguages = pb.getFiles().stream()
            .map(FileBean::getExcludedTargetLanguages).filter(Objects::nonNull).anyMatch(l -> !l.isEmpty());
        if (!project.isManagerAccess() && (containsExcludedLanguages || deleteObsolete)) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access_in_upload_sources")));
                return;
            } else {
                throw new ExitCodeExceptionMapper.ForbiddenException(RESOURCE_BUNDLE.getString("message.no_manager_access_in_upload_sources"));
            }
        }

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), pb.getBasePath());

        Branch branch = (branchName != null) ? BranchUtils.getOrCreateBranch(out, branchName, client, project, plainView) : null;
        Long branchId = (branch != null) ? branch.getId() : null;

        Map<String, Long> directoryPaths = null;
        Map<String, FileInfo> paths = null;
        DeleteObsoleteProjectFilesSubAction deleteObsoleteProjectFilesSubAction = new DeleteObsoleteProjectFilesSubAction(out, client);

        if (!isStringsBasedProject) {
            directoryPaths = ProjectFilesUtils.buildDirectoryPaths(project.getDirectories(), project.getBranches())
                .entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
            paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
            if (deleteObsolete) {
                Map<String, Long> directories = ProjectFilesUtils.buildDirectoryPaths(project.getDirectories(branchId))
                    .entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
                Map<String, com.crowdin.client.sourcefiles.model.File> projectFiles = ProjectFilesUtils.buildFilePaths(project.getDirectories(branchId), project.getFiles(branchId));
                deleteObsoleteProjectFilesSubAction.setData(projectFiles, directories, pb.getPreserveHierarchy(), this.plainView);
            }
        }

        Map<String, Long> finalDirectoryPaths = directoryPaths;
        Map<String, FileInfo> finalPaths = paths;

        List<String> uploadedSources = new ArrayList<>();

        Map<String, Long> labels = client.listLabels().stream()
            .collect(Collectors.toMap(Label::getTitle, Label::getId));

        pb.getFiles().stream()
            .filter(fb -> fb.getLabels() != null)
            .flatMap(fb -> fb.getLabels().stream())
            .distinct()
            .forEach(labelTitle -> labels.computeIfAbsent(labelTitle, (title) -> client.addLabel(RequestBuilder.addLabel(title)).getId()));

        AtomicBoolean errorsPresented = new AtomicBoolean(false);
        List<Runnable> tasks = pb.getFiles().stream()
            .map(file -> (Runnable) () -> {

                try {
                    this.checkExcludedTargetLanguages(file.getExcludedTargetLanguages(),
                        project.getSupportedLanguages(), project.getProjectLanguages(false));
                } catch (Exception e) {
                    errorsPresented.set(true);
                    throw e;
                }

                LanguageMapping localLanguageMapping = LanguageMapping.fromConfigFileLanguageMapping(file.getLanguagesMapping());
                LanguageMapping serverLanguageMapping = project.getLanguageMapping();
                LanguageMapping languageMapping = LanguageMapping.populate(localLanguageMapping, serverLanguageMapping);
                List<String> sources = SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil, languageMapping)
                    .map(File::getAbsolutePath)
                    .collect(Collectors.toList());
                String commonPath =
                    (pb.getPreserveHierarchy()) ? "" : SourcesUtils.getCommonPath(sources, pb.getBasePath());
                if (deleteObsolete) {
                    List<String> filesToUpdate = sources.stream().map(source -> (file.getDest() != null)
                            ? PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(source, pb.getBasePath()), placeholderUtil)
                            : StringUtils.removeStart(source, pb.getBasePath() + commonPath))
                        .collect(Collectors.toList());
                    if (file.getDest() != null) {
                        String sourcePattern = PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(file.getSource(), pb.getBasePath()), placeholderUtil);
                        deleteObsoleteProjectFilesSubAction.act(sourcePattern, file.getTranslation(), filesToUpdate);
                    } else {
                        deleteObsoleteProjectFilesSubAction.act(file.getSource(), file.getIgnore(), file.getTranslation(), filesToUpdate);
                    }
                }
                if (sources.isEmpty()) {
                    if (!plainView) {
                        errorsPresented.set(true);
                        throw new ExitCodeExceptionMapper.NotFoundException(String.format(RESOURCE_BUNDLE.getString("error.no_sources"), file.getSource()));
                    } else {
                        return;
                    }
                }
                Long customSegmentationFileId = null;
                if (file.getCustomSegmentation() != null) {
                    File customSegmentation = new File(Utils.normalizePath(Utils.joinPaths(pb.getBasePath(), file.getCustomSegmentation())));
                    try (InputStream customSegmentationFileStream = new FileInputStream(customSegmentation)) {
                        customSegmentationFileId = client.uploadStorage(customSegmentation.getName(), customSegmentationFileStream);
                    } catch (Exception e) {
                        errorsPresented.set(true);
                        throw ExitCodeExceptionMapper.remap(e,
                            String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), customSegmentation.getAbsolutePath()));
                    }
                }
                Long srxStorageId = customSegmentationFileId;

                List<Runnable> taskss = sources.stream()
                    .map(source -> {
                        final File sourceFile = new File(source);
                        final String filePath = (file.getDest() != null)
                                ? PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(source, pb.getBasePath()), placeholderUtil)
                                : StringUtils.removeStart(source, pb.getBasePath() + commonPath);
                        final String fileFullPath = (branchName != null ? BranchUtils.normalizeBranchName(branchName) + Utils.PATH_SEPARATOR : "") + filePath;
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

                        FileInfo projectFile = !isStringsBasedProject ? ProjectFilesUtils.fileLookup(fileFullPath, finalPaths) : null;
                        if (!isStringsBasedProject && autoUpdate && projectFile != null) {
                            final UpdateFileRequest request = new UpdateFileRequest();
                            request.setExportOptions(buildExportOptions(sourceFile, file, pb.getBasePath()));
                            request.setImportOptions(buildImportOptions(sourceFile, file, srxStorageId));
                            PropertiesBeanUtils.getUpdateOption(file.getUpdateOption()).ifPresent(request::setUpdateOption);

                            if (file.getLabels() != null) {
                                List<Long> labelsIds = file.getLabels().stream().map(labels::get).collect(Collectors.toList());
                                request.setAttachLabelIds(labelsIds);
                            }

                            final Long sourceId = projectFile.getId();

                            return (Runnable) () -> {
                                try (InputStream fileStream = new FileInputStream(sourceFile)) {
                                    request.setStorageId(client.uploadStorage(source.substring(source.lastIndexOf(Utils.PATH_SEPARATOR) + 1), fileStream));
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e,
                                        String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), sourceFile.getAbsolutePath()));
                                }

                                try {
                                    client.updateSource(sourceId, request);
                                    if (file.getExcludedTargetLanguages() != null && !file.getExcludedTargetLanguages().isEmpty()) {
                                        List<String> projectFileExcludedTargetLanguages = ((com.crowdin.client.sourcefiles.model.File) projectFile).getExcludedTargetLanguages();
                                        if (!file.getExcludedTargetLanguages().equals(projectFileExcludedTargetLanguages)) {
                                            List<PatchRequest> editRequest = RequestBuilder.updateExcludedTargetLanguages(file.getExcludedTargetLanguages());
                                            client.editSource(sourceId, editRequest);
                                        }
                                    }
                                    if (!plainView) {
                                        out.println(
                                            OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
                                    } else {
                                        out.println(fileFullPath);
                                    }
                                } catch (FileInUpdateException e) {
                                    if (!plainView) {
                                        out.println(
                                            SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.file_being_updated"), fileFullPath)));
                                    } else {
                                        out.println(RESOURCE_BUNDLE.getString("message.file_being_updated"));
                                    }
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.uploading_file"), fileFullPath));
                                }
                            };
                        } else if (projectFile == null && !isStringsBasedProject) {
                            final AddFileRequest request = new AddFileRequest();
                            request.setName(fileName);
                            request.setExportOptions(buildExportOptions(sourceFile, file, pb.getBasePath()));
                            request.setImportOptions(buildImportOptions(sourceFile, file, srxStorageId));
                            if (file.getExcludedTargetLanguages() != null && !file.getExcludedTargetLanguages().isEmpty()) {
                                request.setExcludedTargetLanguages(file.getExcludedTargetLanguages());
                            }
                            if (file.getType() != null) {
                                request.setType(file.getType());
                            }
                            if (file.getLabels() != null) {
                                List<Long> labelsIds = file.getLabels().stream().map(labels::get).collect(Collectors.toList());
                                request.setAttachLabelIds(labelsIds);
                            }

                            return (Runnable) () -> {
                                Long directoryId;
                                try {
                                    directoryId = ProjectUtils.createPath(out, client, finalDirectoryPaths, filePath, branch, plainView);
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e, RESOURCE_BUNDLE.getString("error.creating_directories"));
                                }

                                if (directoryId != null) {
                                    request.setDirectoryId(directoryId);
                                } else if (branch != null) {
                                    request.setBranchId(branch.getId());
                                }

                                try (InputStream fileStream = new FileInputStream(sourceFile)) {
                                    request.setStorageId(client.uploadStorage(source.substring(source.lastIndexOf(Utils.PATH_SEPARATOR) + 1), fileStream));
                                } catch (EmptyFileException e) {
                                    errorsPresented.set(false);
                                    out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file_skipped"), fileFullPath)));
                                    return;
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e,
                                        String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), sourceFile.getAbsolutePath()));
                                }
                                try {
                                    client.addSource(request);
                                } catch (ExistsResponseException e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.file_already_exists"), fileFullPath));
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.uploading_file"), fileFullPath));
                                }
                                if (!plainView) {
                                    out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
                                } else {
                                    out.println(fileFullPath);
                                }
                            };
                        } else if (isStringsBasedProject) {
                            final UploadStringsRequest request = new UploadStringsRequest();
                            request.setImportOptions(buildImportOptionsStringsBased(sourceFile, file, srxStorageId));
                            if (file.getType() != null) {
                                request.setType(file.getType());
                            }
                            if (file.getLabels() != null) {
                                List<Long> labelsIds = file.getLabels().stream().map(labels::get)
                                    .collect(Collectors.toList());
                                request.setLabelIds(labelsIds);
                            }

                            return (Runnable) () -> {
                                if (branch == null) {
                                    throw new ExitCodeExceptionMapper.ValidationException(RESOURCE_BUNDLE.getString("error.branch_required_string_project"));
                                }
                                request.setBranchId(branch.getId());

                                try (InputStream fileStream = new FileInputStream(sourceFile)) {
                                    request.setStorageId(client.uploadStorage(source.substring(source.lastIndexOf(Utils.PATH_SEPARATOR) + 1), fileStream));
                                } catch (EmptyFileException e) {
                                    errorsPresented.set(false);
                                    out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file_skipped"), fileFullPath)));
                                    return;
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e,
                                        String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), sourceFile.getAbsolutePath()));
                                }
                                try {
                                    ConsoleSpinner.execute(
                                        out,
                                        "message.spinner.uploading_strings",
                                        "message.spinner.upload_strings_failed",
                                        this.plainView,
                                        this.plainView,
                                        () -> {
                                            UploadStringsProgress uploadStrings = client.addSourceStringsBased(request);
                                            String uploadId = uploadStrings.getIdentifier();

                                            while (!"finished".equalsIgnoreCase(uploadStrings.getStatus())) {
                                                ConsoleSpinner.update(
                                                        String.format(RESOURCE_BUNDLE.getString("message.spinner.uploading_strings_percents"),
                                                                uploadStrings.getProgress()));
                                                Thread.sleep(1000);

                                                uploadStrings = client.getUploadStringsStatus(uploadId);

                                                if ("failed".equalsIgnoreCase(uploadStrings.getStatus())) {
                                                    throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.upload_strings_failed"));
                                                }
                                            }
                                            ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.uploading_strings_percents"), 100));
                                            return uploadStrings;
                                        });
                                } catch (Exception e) {
                                    errorsPresented.set(true);
                                    throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.uploading_file"), fileFullPath));
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
                if (isStringsBasedProject) {
                    ConcurrencyUtil.executeAndWaitSingleThread(taskss, debug);
                } else {
                    ConcurrencyUtil.executeAndWait(taskss, debug);
                }
            })
            .collect(Collectors.toList());
        ConcurrencyUtil.executeAndWaitSingleThread(tasks, debug);
        if (deleteObsolete) {
            deleteObsoleteProjectFilesSubAction.postAct();
        }
        if (errorsPresented.get()) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.execution_contains_errors"));
        }
    }

    private ImportOptions buildImportOptions(java.io.File sourceFile, FileBean fileBean, Long srxStorageId) {
        if (isSpreadsheet(sourceFile, fileBean)) {
            SpreadsheetFileImportOptions importOptions = new SpreadsheetFileImportOptions();
            importOptions.setFirstLineContainsHeader(fileBean.getFirstLineContainsHeader());
            importOptions.setScheme(PropertiesBeanUtils.getSchemeObject(fileBean.getScheme()));
            importOptions.setImportTranslations(fileBean.getImportTranslations());
            return importOptions;
        } else if (isXml(sourceFile)) {
            XmlFileImportOptions importOptions = new XmlFileImportOptions();
            importOptions.setTranslateContent(fileBean.getTranslateContent());
            importOptions.setTranslateAttributes(fileBean.getTranslateAttributes());
            importOptions.setContentSegmentation(fileBean.getContentSegmentation());
            importOptions.setTranslatableElements(fileBean.getTranslatableElements());
            importOptions.setSrxStorageId(srxStorageId);
            return importOptions;
        } else {
            OtherFileImportOptions importOptions = new OtherFileImportOptions();
            importOptions.setContentSegmentation(fileBean.getContentSegmentation());
            importOptions.setSrxStorageId(srxStorageId);
            return importOptions;
        }
    }

    private com.crowdin.client.sourcestrings.model.ImportOptions buildImportOptionsStringsBased(java.io.File sourceFile, FileBean fileBean, Long srxStorageId) {
        com.crowdin.client.sourcestrings.model.ImportOptions importOptions = new com.crowdin.client.sourcestrings.model.ImportOptions();
        if (isSpreadsheet(sourceFile, fileBean)) {
            importOptions.setFirstLineContainsHeader(fileBean.getFirstLineContainsHeader());
            importOptions.setScheme(PropertiesBeanUtils.getSchemeObject(fileBean.getScheme()));
            importOptions.setImportTranslations(fileBean.getImportTranslations());
        }
        return importOptions;
    }

    private boolean isSpreadsheet(java.io.File file, FileBean fileBean) {
        return (fileBean.getDest() != null)
            ? FilenameUtils.isExtension(fileBean.getDest(), "csv", "xls", "xlsx")
            : FilenameUtils.isExtension(file.getName(), "csv", "xls", "xlsx");
    }

    private boolean isXml(java.io.File file) {
        return FilenameUtils.isExtension(file.getName(), "xml");
    }

    private ExportOptions buildExportOptions(java.io.File sourceFile, FileBean fileBean, String basePath) {
        String exportPattern = TranslationsUtils.replaceDoubleAsterisk(
            fileBean.getSource(),
            fileBean.getTranslation(),
            StringUtils.removeStart(sourceFile.getAbsolutePath(), basePath)
        );

        exportPattern = StringUtils.replacePattern(exportPattern, "[\\\\/]+", "/");

        if (SourcesUtils.isFileProperties(sourceFile)) {
            PropertyFileExportOptions exportOptions = new PropertyFileExportOptions();
            exportOptions.setExportPattern(exportPattern);
            exportOptions.setEscapeQuotes(fileBean.getEscapeQuotes());
            exportOptions.setEscapeSpecialCharacters(1);

            if (fileBean.getEscapeSpecialCharacters() != null) {
                exportOptions.setEscapeSpecialCharacters(fileBean.getEscapeSpecialCharacters());
            }

            return exportOptions;
        } else if (SourcesUtils.isFileJavaScript(sourceFile)) {
            JavaScriptFileExportOptions exportOptions = new JavaScriptFileExportOptions();
            exportOptions.setExportPattern(exportPattern);

            if (fileBean.getExportQuotes() != null) {
                exportOptions.setExportQuotes(fileBean.getExportQuotes().equals("double") ? DOUBLE : SINGLE);
            }

            return exportOptions;
        } else {
            GeneralFileExportOptions exportOptions = new GeneralFileExportOptions();
            exportOptions.setExportPattern(exportPattern);

            return exportOptions;
        }
    }

    private void checkExcludedTargetLanguages(List<String> excludedTargetLanguages, List<Language> supportedLanguages, List<Language> projectLanguages) {
        if (excludedTargetLanguages != null && !excludedTargetLanguages.isEmpty()) {
            List<String> supportedLanguageIds = supportedLanguages.stream()
                .map(Language::getId)
                .collect(Collectors.toList());
            List<String> projectLanguageIds = projectLanguages.stream()
                .map(Language::getId)
                .collect(Collectors.toList());
            String notSupportedLangs = excludedTargetLanguages.stream()
                .filter(lang -> !supportedLanguageIds.contains(lang))
                .map(lang -> "'" + lang + "'")
                .collect(Collectors.joining(", "));
            if (notSupportedLangs.length() > 0) {
                throw new ExitCodeExceptionMapper.ValidationException(String.format("Crowdin doesn't support %s language code(s)", notSupportedLangs));
            }
            String notInProjectLangs = excludedTargetLanguages.stream()
                .filter(lang -> !projectLanguageIds.contains(lang))
                .map(lang -> "'" + lang + "'")
                .collect(Collectors.joining(", "));
            if (notInProjectLangs.length() > 0) {
                throw new ExitCodeExceptionMapper.NotFoundException(String.format("Project doesn't have %s language(s)", notInProjectLangs));
            }
        }
    }
}
