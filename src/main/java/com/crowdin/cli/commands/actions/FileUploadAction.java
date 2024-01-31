package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.sourcestrings.model.UploadStringsProgress;
import com.crowdin.client.sourcestrings.model.UploadStringsRequest;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class FileUploadAction implements NewAction<ProjectProperties, ProjectClient> {

    private final File file;
    private final String branchName;
    private final boolean autoUpdate;
    private final List<String> labels;
    private final String dest;
    private final boolean cleanupMode;
    private final boolean updateStrings;
    private final List<String> excludedLanguages;
    private final boolean plainView;

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.plainView, this.plainView, client::downloadFullProject);

        if (!project.isManagerAccess()) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), properties.getBasePath());

        Optional<List<Long>> attachLabelIds = Optional.empty();
        if (nonNull(labels) && !labels.isEmpty()) {
            attachLabelIds = Optional.of(labels.stream().map(l -> getOrCreateLabel(l, client)).collect(Collectors.toList()));
        }

        String fileFullPath = file.getPath();
        String fileDestName = file.getName();
        if (Objects.equals(Type.FILES_BASED, project.getType())) {
            String commonPath = SourcesUtils.getCommonPath(Collections.singletonList(this.file.getAbsolutePath()), properties.getBasePath());
            final String filePath = (nonNull(dest))
                ? PropertiesBeanUtils.prepareDest(dest, StringUtils.removeStart(file.getAbsolutePath(), properties.getBasePath()), placeholderUtil)
                : StringUtils.removeStart(file.getAbsolutePath(), properties.getBasePath() + commonPath);
            fileFullPath = (nonNull(branchName) ? branchName + Utils.PATH_SEPARATOR : "") + filePath;
            fileDestName = fileFullPath.substring(fileFullPath.lastIndexOf(Utils.PATH_SEPARATOR) + 1);
            Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
            FileInfo projectFile = paths.get(fileFullPath);

            if (nonNull(projectFile)) {
                if (!autoUpdate) {
                    out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("error.file_already_exists"), fileFullPath)));
                    return;
                }
                final UpdateFileRequest request = new UpdateFileRequest();
                final Long sourceId = projectFile.getId();
                attachLabelIds.ifPresent(request::setAttachLabelIds);

                Long storageId = getStorageId(client, fileDestName);
                request.setStorageId(storageId);

                try {
                    client.updateSource(sourceId, request);
                    if (nonNull(excludedLanguages) && !excludedLanguages.isEmpty()) {
                        List<String> projectFileExcludedTargetLanguages = ((com.crowdin.client.sourcefiles.model.File) projectFile).getExcludedTargetLanguages();
                        if (!Objects.equals(excludedLanguages, projectFileExcludedTargetLanguages)) {
                            List<PatchRequest> editRequest = RequestBuilder.updateExcludedTargetLanguages(excludedLanguages);
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
                    throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.uploading_file"), fileFullPath), e);
                }
                return;
            }
        }

        Optional<Branch> branch = Optional.empty();
        if (StringUtils.isNotEmpty(branchName)) {
            branch = Optional.ofNullable(BranchUtils.getOrCreateBranch(out, branchName, client, project, plainView));
        } else if (Objects.equals(Type.STRINGS_BASED, project.getType())) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project"));
        }

        Long storageId = getStorageId(client, fileDestName);

        Optional<List<String>> excludedLanguageNames = Optional.empty();
        if (nonNull(excludedLanguages) && !excludedLanguages.isEmpty()) {
            excludedLanguageNames = Optional.of(filterExcludedLanguages(excludedLanguages, project));
        }

        if (Objects.equals(Type.FILES_BASED, project.getType())) {
            AddFileRequest request = new AddFileRequest();
            request.setName(fileDestName);
            request.setStorageId(storageId);

            Optional<Long> directoryId = getOrCreateDirectoryId(out, client, project, properties, branch.orElse(null));
            directoryId.ifPresent(request::setDirectoryId);

            attachLabelIds.ifPresent(request::setAttachLabelIds);
            branch.ifPresent(b -> request.setBranchId(b.getId()));
            excludedLanguageNames.ifPresent(request::setExcludedTargetLanguages);
            try {
                client.addSource(request);
            } catch (ExistsResponseException e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_already_exists"), fileFullPath));
            } catch (Exception e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.uploading_file"), fileFullPath), e);
            }

        }
        if (Objects.equals(Type.STRINGS_BASED, project.getType())) {
            UploadStringsRequest request = new UploadStringsRequest();
            request.setBranchId(branch.orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required_string_project"))).getId());
            request.setCleanupMode(cleanupMode);
            attachLabelIds.ifPresent(request::setLabelIds);
            request.setUpdateStrings(updateStrings);
            request.setStorageId(storageId);
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
        }
        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
        } else {
            out.println(fileFullPath);
        }
        out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.experimental_command")));
    }

    private List<String> filterExcludedLanguages(List<String> excludedLanguages, CrowdinProjectFull project) {
        List<String> projectLanguageNames = project.getProjectLanguages(false)
            .stream()
            .map(Language::getId)
            .collect(Collectors.toList());

        return excludedLanguages
            .stream()
            .filter(projectLanguageNames::contains)
            .collect(Collectors.toList());
    }

    private Long getOrCreateLabel(String labelName, ProjectClient client) {
        Map<String, Long> labelList = client.listLabels().stream()
            .collect(Collectors.toMap(Label::getTitle, Label::getId));
        if (labelList.containsKey(labelName)) return labelList.get(labelName);
        else {
            AddLabelRequest request = new AddLabelRequest();
            request.setTitle(labelName);
            Label createdLabel = client.addLabel(request);
            return createdLabel.getId();
        }
    }

    private Optional<Long> getOrCreateDirectoryId(Outputter out, ProjectClient client, CrowdinProjectFull project, ProjectProperties properties, Branch branch) {
        Optional<Long> directoryId;
        Map<String, Long> directoryPaths = ProjectFilesUtils.buildDirectoryPaths(project.getDirectories(), project.getBranches())
            .entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
        String commonPath = SourcesUtils.getCommonPath(Collections.singletonList(this.file.getAbsolutePath()), properties.getBasePath());
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), properties.getBasePath());
        String filePath = (nonNull(dest))
            ? PropertiesBeanUtils.prepareDest(dest, StringUtils.removeStart(this.file.getAbsolutePath(), properties.getBasePath()), placeholderUtil)
            : StringUtils.removeStart(this.file.getAbsolutePath(), properties.getBasePath() + commonPath);
        try {
            directoryId = Optional.ofNullable(ProjectUtils.createPath(out, client, directoryPaths, filePath, branch, this.plainView));
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.creating_directories"), e);
        }
        return directoryId;
    }

    private Long getStorageId(ProjectClient client, String fileName) {
        try (InputStream fileStream = Files.newInputStream(file.toPath())) {
            return client.uploadStorage(fileName, fileStream);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.local_file_not_found"), file.getAbsolutePath()));
        } catch (EmptyFileException e){
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("message.uploading_file_skipped"), file.getAbsolutePath()));
        } catch (Exception e) {
            throw new RuntimeException(
                String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), file.getAbsolutePath()), e);
        }
    }
}
