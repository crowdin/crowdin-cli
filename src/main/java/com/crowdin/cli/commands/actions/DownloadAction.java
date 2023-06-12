package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.functionality.SourcesUtils;
import com.crowdin.cli.commands.functionality.TranslationsUtils;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.PseudoLocalization;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.CrowdinTranslationCreateProjectBuildForm;
import com.crowdin.client.translations.model.ProjectBuild;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.CHECK_WAITING_TIME_FIRST;
import static com.crowdin.cli.BaseCli.CHECK_WAITING_TIME_INCREMENT;
import static com.crowdin.cli.BaseCli.CHECK_WAITING_TIME_MAX;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class DownloadAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private FilesInterface files;
    private boolean noProgress;
    private List<String> languageIds;
    private List<String> excludeLanguageIds;
    private boolean pseudo;
    private String branchName;
    private boolean ignoreMatch;
    private boolean isVerbose;
    private boolean plainView;
    private boolean useServerSources;
    private boolean keepArchive;

    private Outputter out;

    public DownloadAction(
            FilesInterface files, boolean noProgress, List<String> languageIds, List<String> excludeLanguageIds, boolean pseudo, String branchName,
            boolean ignoreMatch, boolean isVerbose, boolean plainView, boolean useServerSources, boolean keepArchive
    ) {
        this.files = files;
        this.noProgress = noProgress || plainView;
        this.languageIds = languageIds;
        this.excludeLanguageIds = excludeLanguageIds;
        this.pseudo = pseudo;
        this.branchName = branchName;
        this.ignoreMatch = ignoreMatch;
        this.isVerbose = isVerbose;
        this.plainView = plainView;
        this.useServerSources = useServerSources;
        this.keepArchive = keepArchive;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        this.out = out;
        boolean isOrganization = PropertiesBeanUtils.isOrganization(pb.getBaseUrl());

        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));

        if (!project.isManagerAccess()) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        if (useServerSources && !pb.getPreserveHierarchy() && !plainView) {
            out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.download_translations.preserve_hierarchy_warning")));
        }

        PlaceholderUtil placeholderUtil =
            new PlaceholderUtil(
                project.getSupportedLanguages(), project.getProjectLanguages(true), pb.getBasePath());

        List<Language> languages = languageIds == null ? null : languageIds.stream()
            .map(lang -> project.findLanguageById(lang, true)
                .orElseThrow(() -> new RuntimeException(
                    String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), lang))))
            .collect(Collectors.toList());
        List<Language> excludeLanguages = excludeLanguageIds == null ? new ArrayList<>() : excludeLanguageIds.stream()
            .map(lang -> project.findLanguageById(lang, true)
                .orElseThrow(() -> new RuntimeException(
                    String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), lang))))
            .collect(Collectors.toList());

        Optional<Branch> branch = Optional.ofNullable(project.getBranch());

        Map<String, com.crowdin.client.sourcefiles.model.File> serverSources = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getFiles());

        LanguageMapping serverLanguageMapping = project.getLanguageMapping();

        AtomicBoolean skipUntranslatedFiles = new AtomicBoolean(false);

        Map<File, List<Map<String, String>>> fileBeansWithDownloadedFiles = new TreeMap<>();
        Map<File, List<String>> tempDirs = new HashMap<>();
        try {
            if (pseudo) {
                List<Language> forLanguages = project.getSupportedLanguages();
                if (!plainView) {
                    out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.build_archive_pseudo")));
                }
                PseudoLocalization pl = pb.getPseudoLocalization();
                BuildProjectTranslationRequest request = null;

                if (branchName != null) {
                    request = (pl != null)
                        ? RequestBuilder.crowdinTranslationCreateProjectPseudoBuildForm(
                        branch.get().getId(), true, pl.getLengthCorrection(), pl.getPrefix(), pl.getSuffix(), pl.getCharTransformation())
                    : RequestBuilder.crowdinTranslationCreateProjectPseudoBuildForm(1L, true, null, null, null, null);
                } else {
                    request = (pl != null)
                        ? RequestBuilder.crowdinTranslationCreateProjectPseudoBuildForm(
                        true, pl.getLengthCorrection(), pl.getPrefix(), pl.getSuffix(), pl.getCharTransformation())
                    : RequestBuilder.crowdinTranslationCreateProjectPseudoBuildForm(true, null, null, null, null);
                }

                Pair<File, List<String>> downloadedFiles = this.download(request, client, pb.getBasePath(), keepArchive);
                for (FileBean fb : pb.getFiles()) {
                    Map<String, String> filesWithMapping = this.getFiles(fb, pb.getBasePath(), serverLanguageMapping, forLanguages, placeholderUtil, new ArrayList<>(serverSources.keySet()), pb.getPreserveHierarchy());
                    fileBeansWithDownloadedFiles.putIfAbsent(downloadedFiles.getLeft(), new ArrayList<>());
                    fileBeansWithDownloadedFiles.get(downloadedFiles.getLeft()).add(filesWithMapping);
                }
                tempDirs.put(downloadedFiles.getLeft(), downloadedFiles.getRight());
            } else {
                List<Language> forLanguages = languages != null ? languages :
                        project.getProjectLanguages(true).stream()
                               .filter(language -> !excludeLanguages.contains(language))
                               .collect(Collectors.toList());

                if (!plainView) {
                    out.println((languageIds != null)
                        ? OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.build_language_archive"), String.join(", ", languageIds)))
                        : OK.withIcon(RESOURCE_BUNDLE.getString("message.build_archive")));
                }
                CrowdinTranslationCreateProjectBuildForm templateRequest = new CrowdinTranslationCreateProjectBuildForm();

                if (languages != null) {
                    templateRequest.setTargetLanguageIds(languages.stream().map(Language::getId).collect(Collectors.toList()));
                } else if (!excludeLanguages.isEmpty()) {
                    templateRequest.setTargetLanguageIds(forLanguages.stream().map(Language::getId).collect(Collectors.toList()));
                }

                branch
                    .map(Branch::getId)
                    .ifPresent(templateRequest::setBranchId);
                pb.getFiles().stream()
                    .map(fb -> Pair.of(Pair.of(fb.getSkipTranslatedOnly(), fb.getSkipUntranslatedFiles()), Pair.of(fb.getExportApprovedOnly(), fb.getExportStringsThatPassedWorkflow())))
                    .distinct()
                    .forEach(downloadConfiguration -> {
                        CrowdinTranslationCreateProjectBuildForm buildRequest = RequestBuilder.crowdinTranslationCreateProjectBuildForm(templateRequest);
                        buildRequest.setSkipUntranslatedStrings(downloadConfiguration.getLeft().getLeft());
                        buildRequest.setSkipUntranslatedFiles(downloadConfiguration.getLeft().getRight());

                        if (buildRequest.getSkipUntranslatedFiles() != null && buildRequest.getSkipUntranslatedFiles()) {
                            skipUntranslatedFiles.set(buildRequest.getSkipUntranslatedFiles());
                        }

                        if (isOrganization) {
                            if (downloadConfiguration.getRight().getLeft() != null && downloadConfiguration.getRight().getLeft()) {
                                buildRequest.setExportWithMinApprovalsCount(1);
                            }
                            if (downloadConfiguration.getRight().getRight() != null && downloadConfiguration.getRight().getRight()) {
                                buildRequest.setExportStringsThatPassedWorkflow(true);
                            }
                        } else {
                            buildRequest.setExportApprovedOnly(downloadConfiguration.getRight().getLeft());
                            if (downloadConfiguration.getRight().getRight() != null && downloadConfiguration.getRight().getRight()) {
                                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.export_strings_that_passed_workflow_not_supported")));
                            }
                        }
                        Pair<File, List<String>> downloadedFiles = this.download(buildRequest, client, pb.getBasePath(), keepArchive);
                        for (FileBean fb : pb.getFiles()) {
                            if (fb.getSkipTranslatedOnly() == downloadConfiguration.getLeft().getLeft()
                                && fb.getSkipUntranslatedFiles() == downloadConfiguration.getLeft().getRight()
                                && fb.getExportApprovedOnly() == downloadConfiguration.getRight().getLeft()
                                && fb.getExportStringsThatPassedWorkflow() == downloadConfiguration.getRight().getRight()) {

                                Map<String, String> filesWithMapping =
                                    this.getFiles(fb, pb.getBasePath(), serverLanguageMapping, forLanguages, placeholderUtil, new ArrayList<>(serverSources.keySet()), pb.getPreserveHierarchy());
                                fileBeansWithDownloadedFiles.putIfAbsent(downloadedFiles.getLeft(), new ArrayList<>());
                                fileBeansWithDownloadedFiles.get(downloadedFiles.getLeft()).add(filesWithMapping);
                            }
                        }
                        tempDirs.put(downloadedFiles.getLeft(), downloadedFiles.getRight());
                    });
            }

            Map<File, Set<Pair<String, String>>> fileBeansWithDownloadedFilesNoRepetitions = new TreeMap<>();
            for (File tempDir : fileBeansWithDownloadedFiles.keySet()) {
                fileBeansWithDownloadedFilesNoRepetitions.put(tempDir, this.flattenInnerMap(fileBeansWithDownloadedFiles.get(tempDir)));
            }

            Map<Long, String> directoryPaths = (branch.isPresent())
                ? ProjectFilesUtils.buildDirectoryPaths(project.getDirectories())
                : ProjectFilesUtils.buildDirectoryPaths(project.getDirectories(), project.getBranches());
            Map<String, List<String>> allProjectTranslations = ProjectFilesUtils
                .buildAllProjectTranslations(
                    project.getFiles(), directoryPaths, branch.map(Branch::getId),
                    placeholderUtil, serverLanguageMapping, pb.getBasePath());

            Map<String, List<String>> totalOmittedFiles = null;
            List<List<String>> omittedFilesNoSources = new ArrayList<>();

            AtomicBoolean anyFileDownloaded = new AtomicBoolean(false);
            for (File tempDir : fileBeansWithDownloadedFilesNoRepetitions.keySet()) {
                Set<Pair<String, String>> filesWithMapping = fileBeansWithDownloadedFilesNoRepetitions.get(tempDir);
                List<String> downloadedFiles = tempDirs.get(tempDir);

                Pair<Map<File, File>, List<String>> result =
                    sortFiles(downloadedFiles, filesWithMapping, pb.getBasePath(), tempDir.getAbsolutePath() + Utils.PATH_SEPARATOR);
                new TreeMap<>(result.getLeft()).forEach((fromFile, toFile) -> { //files to extract
                    files.copyFile(fromFile, toFile);
                    anyFileDownloaded.set(true);
                    if (!plainView) {
                        out.println(OK.withIcon(
                            String.format(
                                RESOURCE_BUNDLE.getString("message.extracted_file"),
                                StringUtils.removeStart(toFile.getAbsolutePath(), pb.getBasePath()))));
                    } else {
                        out.println(StringUtils.removeStart(toFile.getAbsolutePath(), pb.getBasePath()));
                    }
                });

                Pair<Map<String, List<String>>, List<String>> omittedFiles =
                    this.sortOmittedFiles(result.getRight(), allProjectTranslations);
                Map<String, List<String>> allOmittedFiles = new TreeMap<>(omittedFiles.getLeft());
                List<String> allOmittedFilesNoSources = omittedFiles.getRight();
                if (totalOmittedFiles == null) {
                    totalOmittedFiles = new TreeMap<>();
                    for (String sourceKey : allOmittedFiles.keySet()) {
                        totalOmittedFiles.put(sourceKey, allOmittedFiles.get(sourceKey));
                    }
                } else {
                    for (String sourceKey : allOmittedFiles.keySet()) {
                        if (totalOmittedFiles.containsKey(sourceKey)) {
                            totalOmittedFiles.get(sourceKey).retainAll(allOmittedFiles.get(sourceKey));
                        }
                    }
                    for (String sourceKey : totalOmittedFiles.keySet()) {
                        if (!allOmittedFiles.containsKey(sourceKey)) {
                            totalOmittedFiles.put(sourceKey, new ArrayList<>());
                        }
                    }
                }
                omittedFilesNoSources.add(allOmittedFilesNoSources);
            }

            if (!anyFileDownloaded.get()) {
                if (project.getSkipUntranslatedFiles() || skipUntranslatedFiles.get()) {
                    out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.warning.no_file_to_download_skipuntranslated")));
                } else {
                    out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.warning.no_file_to_download")));
                }
            }

            if (!ignoreMatch && !plainView) {
                totalOmittedFiles = totalOmittedFiles.entrySet().stream()
                    .filter(entry -> !entry.getValue().isEmpty())
                    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

                if (!totalOmittedFiles.isEmpty()) {
                    out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.downloaded_files_omitted")));
                    totalOmittedFiles.forEach((file, translations) -> {
                        out.println(String.format(
                            RESOURCE_BUNDLE.getString("message.item_list_with_count"), file, translations.size()));
                        if (isVerbose) {
                            translations.forEach(trans -> out.println(
                                String.format(RESOURCE_BUNDLE.getString("message.inner_item_list"), trans)));
                        }
                    });
                }

                List<String> totalOmittedFilesNoSources = omittedFilesNoSources.isEmpty() ? new ArrayList<>() : omittedFilesNoSources.get(0);
                for (List<String> eachOmittedFilesNoSources : omittedFilesNoSources) {
                    totalOmittedFilesNoSources.retainAll(eachOmittedFilesNoSources);
                }
                if (!totalOmittedFilesNoSources.isEmpty()) {
                    out.println(
                        WARNING.withIcon(
                            RESOURCE_BUNDLE.getString("message.downloaded_files_omitted_without_sources")));
                    totalOmittedFilesNoSources.forEach(file ->
                        out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list"), file)));
                }
            }
        } finally {
            try {
                for (File tempDir : tempDirs.keySet()) {
                    files.deleteDirectory(tempDir);
                }
            } catch (IOException e) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.clearing_temp"), e);
            }
        }
    }

    /**
     * Download archive, extract it and return information about that temporary directory
     *
     * @param request  request body to download archive
     * @param client   api to Crowdin
     * @param basePath base path
     * @return pair of temporary directory and list of files in it(relative paths to that directory)
     */
    private Pair<File, List<String>> download(BuildProjectTranslationRequest request, ProjectClient client, String basePath, Boolean keepArchive) {
        ProjectBuild projectBuild = buildTranslation(client, request);
        String randomHash = RandomStringUtils.random(11, false, true);
        File baseTempDir =
            new File(StringUtils.removeEnd(
                basePath,
                Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR + "CrowdinTranslations_" + randomHash + Utils.PATH_SEPARATOR);
        String downloadedZipArchivePath =
            StringUtils.removeEnd(basePath, Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR + "CrowdinTranslations_" + randomHash + ".zip";
        File downloadedZipArchive = new File(downloadedZipArchivePath);

        this.downloadTranslations(client, projectBuild.getId(), downloadedZipArchivePath);

        List<String> downloadedFilesProc = this.extractArchive(downloadedZipArchive, baseTempDir)
            .stream()
            .map(f -> StringUtils
                .removeStart(f.getAbsolutePath(), baseTempDir.getAbsolutePath() + Utils.PATH_SEPARATOR))
            .collect(Collectors.toList());

        if (!keepArchive) {
            try {
                files.deleteFile(downloadedZipArchive);
            } catch (IOException e) {
                out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("error.deleting_archive"), downloadedZipArchive)));
            }
        } else {
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.archive"), downloadedZipArchivePath)));
            } else {
                out.println(downloadedZipArchivePath);
            }
        }

        return Pair.of(baseTempDir, downloadedFilesProc);
    }

    private Map<String, String> getFiles(
        FileBean fb, String basePath, LanguageMapping serverLanguageMapping, List<Language> forLanguages, PlaceholderUtil placeholderUtil, List<String> allServerSources, boolean preserveHierarchy
    ) {
        List<String> sources =
            SourcesUtils.getFiles(basePath, fb.getSource(), fb.getIgnore(), placeholderUtil)
                .map(File::getAbsolutePath)
                .collect(Collectors.toList());
        if (useServerSources) {
            String searchPattern = fb.getDest() != null ? fb.getDest() : fb.getSource();
            List<String> serverSources = SourcesUtils.filterProjectFiles(allServerSources, searchPattern, fb.getIgnore(), preserveHierarchy, placeholderUtil)
                .stream()
                .map(s -> Utils.joinPaths(basePath, s))
                .filter(s -> !sources.contains(s))
                .collect(Collectors.toList());
            sources.addAll(serverSources);
        }
        LanguageMapping localLanguageMapping = LanguageMapping.fromConfigFileLanguageMapping(fb.getLanguagesMapping());
        LanguageMapping languageMapping = LanguageMapping.populate(localLanguageMapping, serverLanguageMapping);
        Map<String, String> translationReplace =
            fb.getTranslationReplace() != null ? fb.getTranslationReplace() : new HashMap<>();

        return this.doTranslationMapping(
            forLanguages, fb.getDest(), fb.getTranslation(), serverLanguageMapping, languageMapping,
            translationReplace, sources, fb.getSource(), basePath, placeholderUtil);
    }

    private ProjectBuild buildTranslation(ProjectClient client, BuildProjectTranslationRequest request) {
        AtomicInteger sleepTime = new AtomicInteger(CHECK_WAITING_TIME_FIRST);

        return ConsoleSpinner.execute(
            out,
            "message.spinner.building_translation",
            "error.building_translation",
            this.noProgress,
            this.plainView,
            () -> {
                ProjectBuild build = client.startBuildingTranslation(request);

                while (!build.getStatus().equalsIgnoreCase("finished")) {
                    ConsoleSpinner.update(
                        String.format(RESOURCE_BUNDLE.getString("message.building_translation"),
                            Math.toIntExact(build.getProgress())));

                    Thread.sleep(sleepTime.getAndUpdate(val -> val < CHECK_WAITING_TIME_MAX ? val + CHECK_WAITING_TIME_INCREMENT : CHECK_WAITING_TIME_MAX));

                    build = client.checkBuildingTranslation(build.getId());

                    if (build.getStatus().equalsIgnoreCase("failed")) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                    }
                }

                ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.building_translation"), 100));
                return build;
            }
        );
    }

    private Pair<Map<File, File>, List<String>> sortFiles(
        List<String> downloadedFiles,
        Set<Pair<String, String>> filesWithMapping,
        String basePath,
        String baseTempDir
    ) {
        Set<String> downloadedFilesSet = new HashSet<>(downloadedFiles);
        Map<File, File> fileMapping = filesWithMapping.stream()
            .filter(pair -> downloadedFilesSet.contains(pair.getLeft()))
            .collect(Collectors.toMap(
                pair -> new File(Utils.joinPaths(baseTempDir, pair.getLeft())),
                pair -> new File(Utils.joinPaths(basePath, pair.getRight()))
            ));
        Set<String> filesWithMappingFrom = filesWithMapping.stream()
            .map(Pair::getLeft)
            .collect(Collectors.toSet());
        List<String> omittedFiles = downloadedFiles
            .stream()
            .filter(downloadedFile -> !filesWithMappingFrom.contains(downloadedFile))
            .collect(Collectors.toList());
        return new ImmutablePair<>(fileMapping, omittedFiles);
    }

    private Pair<Map<String, List<String>>, List<String>> sortOmittedFiles(
        List<String> omittedFiles,
        Map<String, List<String>> allProjectTranslations
    ) {
        Map<String, List<String>> allOmittedFiles = new HashMap<>();
        List<String> allOmittedFilesNoSources = new ArrayList<>();
        for (String omittedFile : omittedFiles) {
            boolean isFound = false;
            for (Map.Entry<String, List<String>> entry : allProjectTranslations.entrySet()) {
                if (entry.getValue().contains(omittedFile)) {
                    isFound = true;
                    allOmittedFiles.putIfAbsent(entry.getKey(), new ArrayList<>());
                    allOmittedFiles.get(entry.getKey()).add(StringUtils.removeStart(omittedFile, Utils.PATH_SEPARATOR));
                }
            }
            if (!isFound) {
                allOmittedFilesNoSources.add(StringUtils.removeStart(omittedFile, Utils.PATH_SEPARATOR));
            }
        }
        return new ImmutablePair<>(allOmittedFiles, allOmittedFilesNoSources);
    }

    private Map<String, String> doTranslationMapping(
        List<Language> languages,
        String dest,
        String translation,
        LanguageMapping projLanguageMapping,
        LanguageMapping languageMapping,
        Map<String, String> translationReplace,
        List<String> sources,
        String source,
        String basePath,
        PlaceholderUtil placeholderUtil
    ) {
        Map<String, String> mapping = new HashMap<>();

        for (Language language : languages) {

            translation = Utils.sepAtStart(translation);

            String translationProject1 = placeholderUtil.replaceLanguageDependentPlaceholders(translation, projLanguageMapping, language);
            String translationFile1 = placeholderUtil.replaceLanguageDependentPlaceholders(translation, languageMapping, language);

            for (String projectFile : sources) {
                String file = StringUtils.removeStart(projectFile, basePath);

                String translationProject2 = TranslationsUtils.replaceDoubleAsterisk(source, translationProject1, file);
                String translationFile2 = TranslationsUtils.replaceDoubleAsterisk(source, translationFile1, file);

                translationProject2 = (dest == null)
                    ? placeholderUtil.replaceFileDependentPlaceholders(translationProject2, new File(projectFile))
                    : placeholderUtil.replaceFileDependentPlaceholders(translationProject2, new File(PropertiesBeanUtils.prepareDest(dest, file, placeholderUtil)));
                translationFile2 = placeholderUtil.replaceFileDependentPlaceholders(translationFile2, new File(projectFile));

                translationFile2 = PropertiesBeanUtils.useTranslationReplace(translationFile2, translationReplace);

                mapping.put(translationProject2, translationFile2);
            }
        }
        return mapping;
    }

    private void downloadTranslations(ProjectClient client, Long buildId, String archivePath) {
        ConsoleSpinner.execute(out, "message.spinner.downloading_translation", "error.downloading_file", this.noProgress, this.plainView, () -> {
            URL url = client.downloadBuild(buildId);
            try (InputStream data = url.openStream()) {
                files.writeToFile(archivePath, data);
            } catch (IOException e) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), archivePath), e);
            }
            return url;
        });
    }

    private List<File> extractArchive(File zipArchive, File dir) {
        return ConsoleSpinner.execute(out, "message.spinner.extracting_archive", "error.extracting_files", this.noProgress, this.plainView,
            () -> files.extractZipArchive(zipArchive, dir));
    }

    private Set<Pair<String, String>> flattenInnerMap(Collection<Map<String, String>> toFlatten) {
        Set<Pair<String, String>> result = new TreeSet<>();
        for (Map<String, String> map : toFlatten) {
            for (String key : map.keySet()) {
                result.add(Pair.of(key, map.get(key)));
            }
        }
        return result;
    }
}
