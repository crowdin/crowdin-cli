package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.commands.functionality.TranslationsUtils;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.concurrency.ConcurrencyUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.BuildReviewedSourceFilesRequest;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcefiles.model.ReviewedStringsBuild;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class DownloadSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private FilesInterface files;
    private boolean noProgress;
    private boolean plainView;
    private String branchName;
    private boolean debug;
    private boolean reviewedOnly;
    private boolean dryrun;

    private Outputter out;

    public DownloadSourcesAction(
        FilesInterface files,
        boolean noProgress,
        boolean plainView,
        String branchName,
        boolean debug,
        boolean reviewedOnly,
        boolean dryrun
    ) {
        this.files = files;
        this.noProgress = noProgress;
        this.plainView = plainView;
        this.branchName = branchName;
        this.debug = debug;
        this.reviewedOnly = reviewedOnly;
        this.dryrun = dryrun;
    }


    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        this.out = out;
        boolean isOrganization = PropertiesBeanUtils.isOrganization(properties.getBaseUrl());
        if (!isOrganization && this.reviewedOnly) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.only_enterprise")));
            return;
        }

        if (!plainView && !properties.getPreserveHierarchy()) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.download_sources.preserve_hierarchy_warning")));
        }

        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));

        Long branchId = Optional.ofNullable(project.getBranch())
            .map(Branch::getId)
            .orElse(null);

        String reviewedFilesTempDir = StringUtils.removeEnd(properties.getBasePath(), Utils.PATH_SEPARATOR) +
                Utils.PATH_SEPARATOR +
                "CrowdinReviewedSources_" +
                RandomStringUtils.random(11, false, true);

        Map<String, java.io.File> reviewedFiles = this.reviewedOnly
                ? this.getReviewedSourceFiles(reviewedFilesTempDir, client, project)
                : Collections.emptyMap();

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
                            String exportPattern = Utils.normalizePath(ProjectFilesUtils.getExportPattern(((File) filePaths.get(filePathKey)).getExportOptions()));
                            String translationPattern = TranslationsUtils.replaceDoubleAsterisk(fileBean.getSource(), fileBean.getTranslation(), filePathKey);
                            if (exportPattern == null || translationPattern.endsWith(exportPattern)) {
                                String sourceName = new java.io.File(fileBean.getSource()).getName();
                                if(sourceName.equals(new java.io.File(filePathKey).getName()) || SourcesUtils.containsPattern(sourceName) || searchPattern.contains(filePathKey)) {
                                    filePaths2.add(filePathKey);
                                }
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
                            out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.no_sources"), searchPattern)));
                        }
                    });
                }
                return foundSources
                    .stream()
                    .sorted()
                    .map(filePath -> () -> {
                        String fileDestination;
                        if (fileBean.getDest() != null) {
                            fileDestination = SourcesUtils.replaceUnaryAsterisk(fileBean.getSource(), filePath);
                            fileDestination = placeholderUtil.replaceFileDependentPlaceholders(fileDestination, new java.io.File(filePath));
                        } else {
                            fileDestination = filePath;
                        }
                        boolean downloaded = false;
                        if (!reviewedOnly && !dryrun) {
                            Long fileId = filePaths.get(filePath).getId();
                            this.downloadFile(client, fileId, Utils.joinPaths(properties.getBasePath(), fileDestination));
                            isAnyFileDownloaded.set(true);
                            downloaded = true;
                        } else {
                            FileInfo fileInfo = filePaths.get(filePath);
                            if (Objects.equals(fileInfo.getBranchId(), branchId) && reviewedFiles.containsKey(fileInfo.getPath()) && !dryrun) {
                                java.io.File file = reviewedFiles.get(fileInfo.getPath());
                                String fileTargetPath = Utils.joinPaths(properties.getBasePath(), fileDestination);
                                this.extractFile(file, fileTargetPath);
                                isAnyFileDownloaded.set(true);
                                downloaded = true;
                            }
                        }

                        if (downloaded || dryrun) {
                            if (!plainView) {
                                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.downloaded_file"), filePath)));
                            } else {
                                out.println(filePath);
                            }
                        }
                    });
                }
            ).collect(Collectors.toList());
        ConcurrencyUtil.executeAndWait(tasks, debug);

        if (this.reviewedOnly) {
            this.deleteTempReviewedSources(reviewedFilesTempDir);
        }
    }


    private Map<String, java.io.File> getReviewedSourceFiles(String baseTemp, ProjectClient client, CrowdinProjectFull project) {
        BuildReviewedSourceFilesRequest request = new BuildReviewedSourceFilesRequest();
        //branch id does not work properly
//        request.setBranchId(branchId);
        ReviewedStringsBuild build = this.buildReviewedSources(client, request);
        java.io.File baseTempDir = new java.io.File(baseTemp + Utils.PATH_SEPARATOR);
        String downloadedZipArchivePath = baseTemp + ".zip";
        java.io.File downloadedZipArchive = new java.io.File(downloadedZipArchivePath);

        this.downloadReviewedSources(client, build.getId(), downloadedZipArchivePath);

        List<java.io.File> downloadedFiles = this.extractArchive(downloadedZipArchive, baseTempDir);

        return downloadedFiles.stream()
                .collect(Collectors.toMap(
                        file -> {
                            String path = StringUtils.removeStart(
                                    file.getAbsolutePath(),
                                    baseTempDir.getAbsolutePath() +
                                            Utils.PATH_SEPARATOR +
                                            project.getSourceLanguageId() + "-REV"
                            );
                            return Utils.unixPath(path);
                        },
                        Function.identity()
                ));
    }

    private void downloadFile(ProjectClient client, Long fileId, String filePath) {
        URL url = client.downloadFile(fileId);
        try (InputStream data = url.openStream()) {
            files.writeToFile(filePath, data);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), filePath), e);
        }
    }

    private void extractFile(java.io.File file, String fileTargetPath) {
        try (InputStream data = new FileInputStream(file)) {
            files.writeToFile(fileTargetPath, data);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), fileTargetPath), e);
        }
    }

    private ReviewedStringsBuild buildReviewedSources(ProjectClient client, BuildReviewedSourceFilesRequest request) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.building_reviewed_sources",
                "error.spinner.reviewed_sources",
                this.noProgress,
                this.plainView,
                () -> {
                    ReviewedStringsBuild build = client.startBuildingReviewedSources(request);

                    while (!build.getStatus().equalsIgnoreCase("finished")) {
                        ConsoleSpinner.update(
                                String.format(RESOURCE_BUNDLE.getString("message.building_reviewed_sources"),
                                        Math.toIntExact(build.getProgress())));

                        Thread.sleep(1000);

                        build = client.checkBuildingReviewedSources(build.getId());

                        if (build.getStatus().equalsIgnoreCase("failed")) {
                            throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                        }
                    }

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.building_reviewed_sources"), 100));
                    return build;
                }
        );
    }

    private void deleteTempReviewedSources(String baseTemp) {
        try {
            List<Path> files = Files.walk(new java.io.File(baseTemp + Utils.PATH_SEPARATOR).toPath())
                    .sorted(Comparator.reverseOrder())
                    .collect(Collectors.toList());
            for (Path file : files) {
                this.files.deleteFile(file.toFile());
            }
            this.files.deleteFile(new java.io.File(baseTemp + ".zip"));
        } catch (IOException e) {
            out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("error.deleting_archive"), baseTemp)));
        }
    }

    private void downloadReviewedSources(ProjectClient client, Long buildId, String archivePath) {
        ConsoleSpinner.execute(
                out,
                "message.spinner.downloading_reviewed_sources",
                "error.downloading_file",
                this.noProgress,
                this.plainView,
                () -> {
                    URL url = client.downloadReviewedSourcesBuild(buildId);
                    try (InputStream data = url.openStream()) {
                        files.writeToFile(archivePath, data);
                    } catch (IOException e) {
                        throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), archivePath), e);
                    }
                    return url;
                }
        );
    }

    private List<java.io.File> extractArchive(java.io.File zipArchive, java.io.File dir) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.extracting_archive",
                "error.extracting_files",
                this.noProgress,
                this.plainView,
                () -> files.extractZipArchive(zipArchive, dir)
        );
    }
}
