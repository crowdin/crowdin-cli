package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.FileInfo;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class DownloadSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private FilesInterface files;
    private boolean noProgress;
    private boolean plainView;
    private String branchName;
    private boolean debug;

    public DownloadSourcesAction(
        FilesInterface files, boolean noProgress, boolean plainView, String branchName, boolean debug
    ) {
        this.files = files;
        this.noProgress = noProgress;
        this.plainView = plainView;
        this.branchName = branchName;
        this.debug = debug;
    }


    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        if (!plainView && !properties.getPreserveHierarchy()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.download_sources.preserve_hierarchy_warning")));
        }

        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        Long branchId = Optional.ofNullable(this.branchName)
            .map(br -> project.findBranchByName(br)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch"))))
            .map(Branch::getId)
            .orElse(null);
        List<FileInfo> fileInfos = project.getFileInfos().stream()
            .filter(f -> Objects.equals(f.getBranchId(), branchId))
            .collect(Collectors.toList());

        Map<String, FileInfo> filePaths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), fileInfos);

        PlaceholderUtil placeholderUtil =
            new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(true), properties.getBasePath());

        AtomicBoolean isAnyFileDownloaded = new AtomicBoolean(false);

        List<Runnable> tasks = properties
            .getFiles()
            .stream()
            .flatMap(fileBean -> SourcesUtils
                .filterProjectFiles(
                    new ArrayList<>(filePaths.keySet()), fileBean.getSource(),
                    fileBean.getIgnore(), properties.getPreserveHierarchy(), placeholderUtil)
                .stream()
                .sorted()
                .map(filePath -> (Runnable) () -> {
                    Long fileId = filePaths.get(filePath).getId();
                    this.downloadFile(client, fileId, Utils.joinPaths(properties.getBasePath(), filePath));
                    isAnyFileDownloaded.set(true);
                    if (!plainView) {
                        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.downloaded_file"), filePath)));
                    } else {
                        out.println(filePath);
                    }
                })
            ).collect(Collectors.toList());
        ConcurrencyUtil.executeAndWait(tasks, debug);

        if (!isAnyFileDownloaded.get()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.no_sources")));
        }
    }

    private void downloadFile(ProjectClient client, Long fileId, String filePath) {
        URL url = client.downloadFile(fileId);
        try (InputStream data = url.openStream()) {
            files.writeToFile(filePath, data);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), filePath), e);
        }
    }
}