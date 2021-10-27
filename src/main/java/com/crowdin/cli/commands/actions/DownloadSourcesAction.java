package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.commands.functionality.TranslationsUtils;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.File;
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
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
            .flatMap(fileBean -> {
                String searchPattern = fileBean.getDest() != null ? fileBean.getDest() : fileBean.getSource();
                List<String> filePaths2;
                if (project.isManagerAccess()) {
                    filePaths2 = new ArrayList<>();
                    if (properties.getPreserveHierarchy()) {
                        for (String filePathKey : filePaths.keySet()) {
                            String exportPattern = ProjectFilesUtils.getExportPattern(((File) filePaths.get(filePathKey)).getExportOptions());
                            String translationPattern = TranslationsUtils.replaceDoubleAsterisk(fileBean.getSource(), fileBean.getTranslation(), filePathKey);
                            if (exportPattern == null || translationPattern.equals(exportPattern)) {
                                filePaths2.add(filePathKey);
                            }
                        }
                    } else {
                        String translationPrepared = fileBean.getTranslation()
                            .replaceAll(Utils.PATH_SEPARATOR_REGEX + "\\*\\*", "(" + Utils.PATH_SEPARATOR_REGEX + ".+)?")
                            .replaceAll("\\\\", "\\\\\\\\");
                        Predicate<String> translationPred = Pattern.compile(translationPrepared).asPredicate();
                        for (String filePathKey : filePaths.keySet()) {
                            String exportPattern = ProjectFilesUtils.getExportPattern(((File) filePaths.get(filePathKey)).getExportOptions());
                            if (exportPattern == null || translationPred.test(exportPattern)) {
                                filePaths2.add(filePathKey);
                            }
                        }
                    }
                } else {
                    filePaths2 = new ArrayList<>(filePaths.keySet());
                }
                List<String> foundSources = SourcesUtils
                    .filterProjectFiles(
                        filePaths2, searchPattern,
                        fileBean.getIgnore(), properties.getPreserveHierarchy(), placeholderUtil);
                if (foundSources.isEmpty()) {
                    return Stream.of((Runnable) () -> {
                        if (!plainView) {
                            out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.no_sources"), fileBean.getSource())));
                        }
                    });
                }
                return foundSources
                    .stream()
                    .sorted()
                    .map(filePath -> (Runnable) () -> {
                        Long fileId = filePaths.get(filePath).getId();
                        String fileDestination;
                        if (fileBean.getDest() != null) {
                            fileDestination = SourcesUtils.replaceUnaryAsterisk(fileBean.getSource(), filePath);
                            fileDestination = placeholderUtil.replaceFileDependentPlaceholders(fileDestination, new java.io.File(filePath));
                        } else {
                            fileDestination = filePath;
                        }
                        this.downloadFile(client, fileId, Utils.joinPaths(properties.getBasePath(), fileDestination));
                        isAnyFileDownloaded.set(true);
                        if (!plainView) {
                            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.downloaded_file"), filePath)));
                        } else {
                            out.println(filePath);
                        }
                    });
                }
            ).collect(Collectors.toList());
        ConcurrencyUtil.executeAndWait(tasks, debug);
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