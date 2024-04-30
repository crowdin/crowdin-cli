package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.AutoTagInProgressException;
import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.screenshots.model.AddScreenshotRequest;
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

    private ProjectClient projectClient;

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientScreenshot client) {
        List<Screenshot> screenshotList = client.listScreenshots(null);
        Optional<Screenshot> existingScreenshot = screenshotList.stream()
                .filter((s) -> file.getName().equals(s.getName())).findFirst();
        if (existingScreenshot.isPresent()) {
            UpdateScreenshotRequest request = new UpdateScreenshotRequest();
            request.setStorageId(uploadToStorage(file));
            request.setName(file.getName());
            try {
                Screenshot screenshot = client.updateScreenshot(existingScreenshot.get().getId(), request);
                if (!plainView) {
                    out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.list"),
                            screenshot.getId(), screenshot.getTagsCount(), screenshot.getName())));
                } else {
                    out.println(file.getName());
                }
            } catch (Exception e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_updated"), request), e);
            }
            return;
        }

        AddScreenshotRequest request = new AddScreenshotRequest();
        CrowdinProjectFull project = ConsoleSpinner.execute(
                out,
                "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress,
                this.plainView,
                () -> this.projectClient.downloadFullProject());
        if (nonNull(branchName)) {
            Branch branch = project.findBranchByName(branchName)
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.branch_not_exists"), branchName)));
            request.setBranchId(branch.getId());
        }
        if (nonNull(pathToSourceFile)) {
            final String normalizedPath = Utils.toUnixPath(Utils.sepAtStart(pathToSourceFile));
            FileInfo fileInfo = project.getFileInfos().stream()
                    .filter(f -> normalizedPath.equals(f.getPath())).findFirst()
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), pathToSourceFile)));
            request.setFileId(fileInfo.getId());
        }
        if (nonNull(directoryPath)) {
            final String normalizedPath = Utils.toUnixPath(Utils.sepAtStart(directoryPath));
            Directory directory = project.getDirectories().values().stream()
                    .filter(d -> normalizedPath.equals(d.getPath())).findFirst()
                    .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.dir_not_exists"), directoryPath)));
            request.setDirectoryId(directory.getId());
        }
        if (nonNull(labelNames) && !labelNames.isEmpty()) {
            request.setLabelIds(prepareLabelIds());
        }

        request.setStorageId(uploadToStorage(file));
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
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_uploaded"), request), e);
        }
    }

    private Long uploadToStorage(File fileToUpload) {
        Long storageId;
        try (InputStream fileStream = Files.newInputStream(fileToUpload.toPath())) {
            storageId = this.projectClient.uploadStorage(fileToUpload.getName(), fileStream);
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.upload_to_storage"), fileToUpload.getName()), e);
        }
        return storageId;
    }

    private Long[] prepareLabelIds() {
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
