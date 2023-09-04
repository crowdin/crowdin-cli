package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.AutoTagInProgressException;
import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
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
import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.util.Objects.nonNull;

@AllArgsConstructor
class ScreenshotAddAction implements NewAction<ProjectProperties, ClientScreenshot> {

    private final File file;
    private final String branchName;
    private final String pathToSourceFile;
    private final String directoryPath;
    private final boolean autoTag;
    private final boolean plainView;
    private final boolean noProgress;

    private ProjectClient projectClient;

    @Override
    public void act(Outputter out, ProjectProperties properties, ClientScreenshot client) {
        Screenshot screenshot;
        List<Screenshot> screenshotList = client.listScreenshots(null);
        Optional<Screenshot> existingScreenshot = screenshotList.stream()
            .filter((s) -> file.getName().equals(s.getName())).findFirst();
        if (existingScreenshot.isPresent()) {
            UpdateScreenshotRequest request = new UpdateScreenshotRequest();
            request.setStorageId(uploadToStorage(file));
            request.setName(file.getName());
            try {
                screenshot = client.updateScreenshot(existingScreenshot.get().getId(), request);
            } catch (Exception e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_updated"), request), e);
            }
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.updated"), screenshot.getName())));
            } else {
                out.println(String.valueOf(screenshot.getName()));
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
            FileInfo fileInfo = project.getFileInfos().stream()
                .filter(f -> pathToSourceFile.equals(f.getPath())).findFirst()
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.file_not_exists"), pathToSourceFile)));
            request.setFileId(fileInfo.getId());
        }
        if (nonNull(directoryPath)) {
            Directory directory = project.getDirectories().values().stream()
                .filter(d -> directoryPath.equals(d.getPath())).findFirst()
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.dir_not_exists"), directoryPath)));
            request.setDirectoryId(directory.getId());
        }
        request.setStorageId(uploadToStorage(file));
        request.setName(file.getName());
        request.setAutoTag(autoTag);

        try {
            client.addScreenshot(request);
        } catch (AutoTagInProgressException e) {
            if (!plainView) {
                out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.not_auto-tagged"), file.getName())));
            } else {
                out.println(String.format(RESOURCE_BUNDLE.getString("message.screenshot.not_auto-tagged"), file.getName()));
            }
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.screenshot.not_added"), request), e);
        }
        if (!plainView) {
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.screenshot.added"), file.getName())));
        } else {
            out.println(file.getName());
        }
    }

    private Long uploadToStorage(File fileToUpload) {
        Long storageId;
        try (InputStream fileStream = Files.newInputStream(fileToUpload.toPath())) {
            storageId = this.projectClient.uploadStorage(fileToUpload.getName(), fileStream);
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.upload_to_storage"), e);
        }
        return storageId;
    }
}
