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
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.BuildReviewedSourceFilesRequest;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.sourcefiles.model.ReviewedStringsBuild;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class DownloadReviewedSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private FilesInterface files;
    private boolean noProgress;
    private boolean plainView;
    private String branchName;

    private Outputter out;

    public DownloadReviewedSourcesAction(
            FilesInterface files, boolean noProgress, boolean plainView, String branchName
    ) {
        this.files = files;
        this.noProgress = noProgress;
        this.plainView = plainView;
        this.branchName = branchName;
    }


    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        this.out = out;
        boolean isOrganization = PropertiesBeanUtils.isOrganization(properties.getBaseUrl());
        if (!isOrganization) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.only_enterprise")));
            return;
        }
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

        BuildReviewedSourceFilesRequest request = new BuildReviewedSourceFilesRequest();
        //branch id does not work properly
//        request.setBranchId(branchId);
        ReviewedStringsBuild build = this.buildReviewedSources(client, request);

        String randomHash = RandomStringUtils.random(11, false, true);

        String baseTemp = StringUtils.removeEnd(properties.getBasePath(), Utils.PATH_SEPARATOR) +
                Utils.PATH_SEPARATOR +
                "CrowdinReviewedSources_" +
                randomHash;
        File baseTempDir = new File(baseTemp + Utils.PATH_SEPARATOR);
        String downloadedZipArchivePath = baseTemp + ".zip";
        File downloadedZipArchive = new File(downloadedZipArchivePath);

        this.downloadReviewedSources(client, build.getId(), downloadedZipArchivePath);

        List<File> downloadedFiles = this.extractArchive(downloadedZipArchive, baseTempDir);

        Map<String, File> downloadedReviewedFilesMap = downloadedFiles.stream()
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

        //code below is a copy/paste from DownloadSourcesAction
        List<FileInfo> fileInfos = project.getFileInfos().stream()
                .filter(f -> Objects.equals(f.getBranchId(), branchId))
                .collect(Collectors.toList());

        Map<String, FileInfo> filePaths = ProjectFilesUtils.buildFilePaths(project.getDirectories(), fileInfos);

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(true), properties.getBasePath());

        properties
                .getFiles()
                .forEach(fileBean -> {
                    String searchPattern = fileBean.getDest() != null ? fileBean.getDest() : fileBean.getSource();
                    List<String> filePaths2;

                    if (project.isManagerAccess()) {
                        filePaths2 = new ArrayList<>();
                        if (properties.getPreserveHierarchy()) {
                            for (String filePathKey : filePaths.keySet()) {
                                String exportPattern = Utils.normalizePath(ProjectFilesUtils.getExportPattern(((com.crowdin.client.sourcefiles.model.File) filePaths.get(filePathKey)).getExportOptions()));
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
                                String exportPattern = ProjectFilesUtils.getExportPattern(((com.crowdin.client.sourcefiles.model.File) filePaths.get(filePathKey)).getExportOptions());
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
                        out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.no_sources"), searchPattern)));
                        return;
                    }

                    foundSources
                            .stream()
                            .sorted()
                            .forEach(filePath -> {
                                FileInfo fileInfo = filePaths.get(filePath);
                                if (!Objects.equals(fileInfo.getBranchId(), branchId)) {
                                    return;
                                }
                                String fileDestination;
                                if (fileBean.getDest() != null) {
                                    fileDestination = SourcesUtils.replaceUnaryAsterisk(fileBean.getSource(), filePath);
                                    fileDestination = placeholderUtil.replaceFileDependentPlaceholders(fileDestination, new java.io.File(filePath));
                                } else {
                                    fileDestination = filePath;
                                }
                                if (!downloadedReviewedFilesMap.containsKey(fileInfo.getPath())) {
                                    return;
                                }
                                File file = downloadedReviewedFilesMap.get(fileInfo.getPath());
                                String fileTargetPath = Utils.joinPaths(properties.getBasePath(), fileDestination);
                                try (InputStream data = new FileInputStream(file)) {
                                    files.writeToFile(fileTargetPath, data);
                                } catch (IOException e) {
                                    throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), fileTargetPath), e);
                                }
                            });
                });

        //cleanup
        try {
            this.files.deleteFile(downloadedZipArchive);
            this.files.deleteDirectory(baseTempDir);
        } catch (IOException e) {
            out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("error.deleting_archive"), downloadedZipArchive)));
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
                        Thread.sleep(100);
                        build = client.checkBuildingReviewedSources(build.getId());
                    }
                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.building_reviewed_sources"), 100));
                    return build;
                }
        );
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

    private List<File> extractArchive(File zipArchive, File dir) {
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
