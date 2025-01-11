package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.AutoTagInProgressException;
import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.commands.picocli.GenericActCommand;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.screenshots.model.AddScreenshotRequest;
import com.crowdin.client.screenshots.model.AutoTagReplaceTagsRequest;
import com.crowdin.client.screenshots.model.Screenshot;
import com.crowdin.client.screenshots.model.UpdateScreenshotRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.FileInfo;
import lombok.AllArgsConstructor;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class ScreenshotUploadAction implements NewAction<ProjectProperties, ClientScreenshot> {

    private final File file;
    private final String branchName;
    private final List<String> labelNames;
    private final String pathToSourceFile;
    private final String directoryPath;
    private final boolean autoTag;
    private final boolean plainView;
    private final boolean noProgress;

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientScreenshot client) {
        var projectClient = GenericActCommand.getProjectClient(properties);
        CrowdinProjectFull project = ConsoleSpinner.execute(
                out,
                "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress,
                this.plainView,
                projectClient::downloadFullProject);

        Long branchId = null;
        if (nonNull(branchName)) {
            Branch branch = project.findBranchByName(branchName)
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.branch_not_exists"), branchName)));
            branchId = branch.getId();
        }
        Long fileId = null;
        if (nonNull(pathToSourceFile)) {
            final String normalizedPath = Utils.toUnixPath(Utils.sepAtStart(pathToSourceFile));
            FileInfo fileInfo = project.getFileInfos().stream()
                    .filter(f -> normalizedPath.equals(f.getPath())).findFirst()
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), pathToSourceFile)));
            fileId = fileInfo.getId();
        }
        Long directoryId = null;
        if (nonNull(directoryPath)) {
            final String normalizedPath = Utils.toUnixPath(Utils.sepAtStart(directoryPath));
            Directory directory = project.getDirectories().values().stream()
                    .filter(d -> normalizedPath.equals(d.getPath())).findFirst()
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.dir_not_exists"), directoryPath)));
            directoryId = directory.getId();
        }

        List<Screenshot> screenshotList = client.listScreenshotsByName(file.getName());
        Optional<Screenshot> existingScreenshot = screenshotList.stream().findFirst();
        if (existingScreenshot.isPresent()) {
            UpdateScreenshotRequest request = new UpdateScreenshotRequest();
            request.setStorageId(uploadToStorage(projectClient, file));
            request.setName(file.getName());
            request.setUsePreviousTags(!autoTag);
            try {
                Screenshot screenshot = client.updateScreenshot(existingScreenshot.get().getId(), request);
                if (autoTag) {
                    AutoTagReplaceTagsRequest autoTagReplaceTagsRequest = new AutoTagReplaceTagsRequest();
                    autoTagReplaceTagsRequest.setAutoTag(true);
                    autoTagReplaceTagsRequest.setBranchId(branchId);
                    autoTagReplaceTagsRequest.setDirectoryId(directoryId);
                    autoTagReplaceTagsRequest.setFileId(fileId);
                    client.replaceTags(existingScreenshot.get().getId(), autoTagReplaceTagsRequest);
                }
                if (!plainView) {
                    out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.list"),
                            screenshot.getId(), screenshot.getTagsCount(), screenshot.getName())));
                } else {
                    out.println(file.getName());
                }
            } catch (Exception e) {
                throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_updated"), request));
            }
            return;
        }

        AddScreenshotRequest request = new AddScreenshotRequest();
        if (nonNull(labelNames) && !labelNames.isEmpty()) {
            request.setLabelIds(prepareLabelIds(projectClient));
        }

        request.setBranchId(branchId);
        request.setDirectoryId(directoryId);
        request.setFileId(fileId);
        request.setStorageId(uploadToStorage(projectClient, file));
        request.setName(file.getName());
        request.setAutoTag(autoTag);

        try {
            Screenshot screenshot = client.uploadScreenshot(request);
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.list"),
                        screenshot.getId(), screenshot.getTagsCount(), screenshot.getName())));
            } else {
                out.println(file.getName());
            }
        } catch (AutoTagInProgressException e) {
            if (!plainView) {
                out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.not_auto-tagged"), file.getName())));
            } else {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.screenshot.not_auto-tagged"), file.getName()));
            }
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_uploaded"), request));
        }
    }

    private Long uploadToStorage(ProjectClient projectClient, File fileToUpload) {
        Long storageId;
        try (InputStream fileStream = Files.newInputStream(fileToUpload.toPath())) {
            storageId = projectClient.uploadStorage(fileToUpload.getName(), fileStream);
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), fileToUpload.getName()));
        }
        return storageId;
    }

    private Long[] prepareLabelIds(ProjectClient projectClient) {
        Map<String, Long> labels = projectClient.listLabels().stream()
                .collect(Collectors.toMap(Label::getTitle, Label::getId));
        labelNames.stream()
                .distinct()
                .forEach(labelName -> labels.computeIfAbsent(labelName, (title) -> projectClient.addLabel(RequestBuilder.addLabel(title)).getId()));
        return labelNames.stream()
                .map(labels::get)
                .toArray(Long[]::new);
    }
}
