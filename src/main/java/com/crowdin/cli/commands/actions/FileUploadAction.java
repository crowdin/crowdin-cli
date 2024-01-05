package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.*;
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
import com.crowdin.client.sourcestrings.model.ImportOptions;
import com.crowdin.client.sourcestrings.model.UploadStringsRequest;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.SKIPPED;
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
            this.plainView, this.plainView, () -> client.downloadFullProject(branchName));
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), properties.getBasePath());

        Optional<List<Long>> attachLabelIds = Optional.empty();
        if (nonNull(labels) && !labels.isEmpty()) {
            attachLabelIds = Optional.of(labels.stream().map(l -> getOrCreateLabel(l, client)).collect(Collectors.toList()));
        }

        String fileFullPath = file.getPath();
        if (Objects.equals(Type.FILES_BASED, project.getType())) {
            String commonPath = SourcesUtils.getCommonPath(Collections.singletonList(this.file.getAbsolutePath()), properties.getBasePath());
            final String filePath = (nonNull(dest))
                ? PropertiesBeanUtils.prepareDest(dest, StringUtils.removeStart(file.getAbsolutePath(), properties.getBasePath()), placeholderUtil)
                : StringUtils.removeStart(file.getAbsolutePath(), properties.getBasePath() + commonPath);
            fileFullPath = (branchName != null ? branchName + Utils.PATH_SEPARATOR : "") + filePath;
            Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
            FileInfo projectFile = paths.get(fileFullPath);

            if (nonNull(projectFile) && autoUpdate) {
                final UpdateFileRequest request = new UpdateFileRequest();
                final Long sourceId = projectFile.getId();
                attachLabelIds.ifPresent(request::setAttachLabelIds);

                Optional<Long> storageIdOptional = getStorageId(out, client);
                if (!storageIdOptional.isPresent()) return;
                Long storageId = storageIdOptional.get();
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
            }
            return;
        }

        Optional<Branch> branch = Optional.empty();
        if (StringUtils.isNotEmpty(branchName)) {
            branch = Optional.ofNullable(BranchUtils.getOrCreateBranch(out, branchName, client, project, plainView));
        }

        Optional<Long> storageIdOptional = getStorageId(out, client);
        if (!storageIdOptional.isPresent()) return;
        Long storageId = storageIdOptional.get();

        Optional<List<String>> excludedLanguageNames = Optional.empty();
        if (nonNull(excludedLanguages) && !excludedLanguages.isEmpty()) {
            excludedLanguageNames = Optional.of(filterExcludedLanguages(excludedLanguages, project));
        }

        if (Objects.equals(Type.FILES_BASED, project.getType())) {
            AddFileRequest request = new AddFileRequest();
            request.setName(file.getName());
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
            //todo create error message
            request.setBranchId(branch.orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.branch_required"))).getId());
            request.setCleanupMode(cleanupMode);
            attachLabelIds.ifPresent(request::setLabelIds);
            request.setUpdateStrings(updateStrings);
            request.setStorageId(storageId);
//            ImportOptions importOptions = new ImportOptions();
//            request.setImportOptions(importOptions);
            client.addSourceStringsBased(request);
        }

        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), fileFullPath)));
        } else {
            out.println(fileFullPath);
        }
    }

    private List<String> filterExcludedLanguages(List<String> excludedLanguages, CrowdinProjectFull project) {
        List<String> projectLanguageNames = project.getProjectLanguages(false)
            .stream()
            .map(Language::getName)
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
            Label createdLabel = new Label();
            try {
                AddLabelRequest request = new AddLabelRequest();
                request.setTitle(labelName);
                createdLabel = client.addLabel(request);
            } catch (Exception e) {
                System.out.println(e);
            }
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

    private Optional<Long> getStorageId(Outputter out, ProjectClient client) {
        try (InputStream fileStream = Files.newInputStream(file.toPath())) {
            return Optional.of(client.uploadStorage(file.getName(), fileStream));
        } catch (EmptyFileException e){
            out.println(SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file_skipped"), file.getAbsolutePath())));
            return Optional.empty();
        } catch (Exception e) {
            throw new RuntimeException(
                String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), file.getAbsolutePath()), e);
        }
    }

}
