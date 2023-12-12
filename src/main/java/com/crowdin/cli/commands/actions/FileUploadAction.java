package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcestrings.model.UploadStringsRequest;
import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class FileUploadAction implements NewAction<ProjectProperties, ProjectClient> {

    private final File file;
    private final String branchName;
    private final boolean autoUpdate;
    private final boolean preserveHierarchy;
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

        Optional<Branch> branch = Optional.empty();
        if (StringUtils.isNotEmpty(branchName)) {
            branch = Optional.ofNullable(BranchUtils.getOrCreateBranch(out, branchName, client, project, plainView));
        }

        Long storageId;
        try {
            storageId = client.uploadStorage(file.getName(), new FileInputStream(file));
        } catch (ResponseException e) {
            throw new RuntimeException(e);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(e);
        }

        Optional<List<Long>> attachLabelIds = Optional.empty();
        if (nonNull(labels) && !labels.isEmpty()) {
            attachLabelIds = Optional.of(labels.stream().map(l -> getOrCreateLabel(l, client)).collect(Collectors.toList()));
        }

        Optional<List<String>> excludedLanguageNames = Optional.empty();
//        if (nonNull(excludedLanguages) && !excludedLanguages.isEmpty()) {
//            //attachLabelIds = Optional.of(labels.stream().map(l -> getOrCreateLabel()).collect(Collectors.toList()));
//            excludedLanguageNames = filterExcludedLanguages(excludedLanguages);
//        }

//        Map<String, Long> directoryPaths = ProjectFilesUtils.buildDirectoryPaths(project.getDirectories(), project.getBranches())
//            .entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
//        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
        String commonPath = SourcesUtils.getCommonPath(Collections.singletonList(this.file.getAbsolutePath()), properties.getBasePath());
        final String filePath = (nonNull(dest))
            ? PropertiesBeanUtils.prepareDest(dest, StringUtils.removeStart(file.getAbsolutePath(), properties.getBasePath()), placeholderUtil)
            : StringUtils.removeStart(file.getAbsolutePath(), properties.getBasePath() + commonPath);
        final String fileFullPath = (branchName != null ? branchName + Utils.PATH_SEPARATOR : "") + filePath;

        Map<String, FileInfo> paths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFileInfos());
        FileInfo projectFile = paths.get(fileFullPath);




        if (Type.FILES_BASED.equals(project.getType())) {
            AddFileRequest request = new AddFileRequest();
            request.setName(file.getName());
            request.setStorageId(storageId);

            if (preserveHierarchy) {
                Optional<Long> directoryId = getOrCreateDirectoryId(out, client, project, properties, branch.orElse(null));
                directoryId.ifPresent(request::setDirectoryId);
            }
            attachLabelIds.ifPresent(request::setAttachLabelIds);
            branch.ifPresent(b -> request.setBranchId(b.getId()));
            excludedLanguageNames.ifPresent(request::setExcludedTargetLanguages);
            try {
                client.addSource(request);
            } catch (ResponseException e) {

            }

        }
        if (Type.STRINGS_BASED.equals(project.getType())) {
            UploadStringsRequest request = new UploadStringsRequest();
            request.setBranchId(branch.orElseThrow(() -> new RuntimeException("fjf")).getId());
            request.setCleanupMode(cleanupMode);
            attachLabelIds.ifPresent(request::setLabelIds);
            request.setUpdateStrings(updateStrings);
            request.setStorageId(storageId);
            client.addSourceStringsBased(request);
        }

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
//                    errorsPresented.set(true);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.creating_directories"), e);
        }
        return directoryId;
    }
}
