package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.TranslationsClient;
import com.crowdin.cli.commands.functionality.DryrunTranslations;
import com.crowdin.cli.commands.functionality.ProjectProxy;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.file.FileUtil;
import com.crowdin.common.Settings;
import com.crowdin.common.models.*;
import com.crowdin.common.request.BuildTranslationPayload;
import com.crowdin.util.CrowdinHttpClient;
import net.lingala.zip4j.core.ZipFile;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import picocli.CommandLine;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.Messages.*;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;

@CommandLine.Command(
    name = "download",
    sortOptions = false,
    aliases = "pull")
public class DownloadSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branchName;

    @CommandLine.Option(names = {"--ignore-match"})
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @Override
    public void run() {

        PropertiesBean pb = this.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectProxy project = new ProjectProxy(pb.getProjectId(), settings);
        try {
            ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
            project.downloadProject()
                .downloadFiles()
                .downloadDirectories()
                .downloadBranches()
                .downloadSupportedLanguages();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        if (dryrun) {
            (new DryrunTranslations(pb, placeholderUtil, false)).run(treeView);
            return;
        }

        Optional<Map<String, Map<String, String>>> projectLanguageMapping = project.getLanguageMapping();

        Optional<Language> language = Optional.ofNullable(languageId)
            .map(lang -> project.getLanguageById(lang)
                .orElseThrow(() -> new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.language_not_exist"), lang))));
        Optional<Branch> branch = Optional.ofNullable(this.branchName)
            .map(br -> project.getBranchByName(br)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch"))));

        TranslationsClient translationsClient = new TranslationsClient(settings, pb.getProjectId());

        BuildTranslationPayload buildTranslationPayload = new BuildTranslationPayload();
        language
            .map(Language::getId)
            .map(Collections::singletonList)
            .ifPresent(buildTranslationPayload::setTargetLanguageIds);
        branch
            .map(Branch::getId)
            .ifPresent(buildTranslationPayload::setBranchId);

        System.out.println((languageId != null)
                ? OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.build_language_archive"), languageId))
                : OK.withIcon(RESOURCE_BUNDLE.getString("message.build_archive")));
        Translation translationBuild = buildTranslation(translationsClient, buildTranslationPayload);

        String currentTimeMillis = Long.toString(System.currentTimeMillis());
        String baseTempDir =
                StringUtils.removeEnd(pb.getBasePath(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR + currentTimeMillis + Utils.PATH_SEPARATOR;
        String downloadedZipArchivePath =
                StringUtils.removeEnd(pb.getBasePath(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR + "translations" + currentTimeMillis + ".zip";
        File downloadedZipArchive = new File(downloadedZipArchivePath);

        this.downloadTranslations(translationsClient, translationBuild.getId().toString(), downloadedZipArchivePath);

        List<String> downloadedFilesProc = this.getListOfFileFromArchive(downloadedZipArchive);

        List<Language> forLanguages = language
            .map(Collections::singletonList)
            .orElse(project.getProjectLanguages());

        Map<String, String> filesWithMapping = pb.getFiles().stream()
            .map(file -> {
                List<String> sources = CommandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil);
                Map<String, Map<String, String>> languageMapping = file.getLanguagesMapping() != null ? file.getLanguagesMapping() : new HashMap<>();
                Map<String, Map<String, String>> projLanguageMapping = new HashMap<>();
                if (projectLanguageMapping.isPresent()) {
                    populateLanguageMapping(languageMapping, projectLanguageMapping.get(), BaseCli.placeholderMappingForServer);
                    populateLanguageMapping(projLanguageMapping, projectLanguageMapping.get(), BaseCli.placeholderMappingForServer);
                }
                Map<String, String> translationReplace = file.getTranslationReplace() != null ? file.getTranslationReplace() : new HashMap<>();
                return this.doTranslationMapping(forLanguages, file.getTranslation(), projLanguageMapping, languageMapping, translationReplace, sources, file.getSource(), pb.getBasePath(), placeholderUtil);
            })
            .flatMap(map -> map.entrySet().stream())
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        Map<String, List<String>> allProjectTranslations =
            this.buildAllProjectTranslations(project.getFiles(), project.getMapDirectories(), project.getMapBranches(), branch.map(Branch::getId), placeholderUtil, pb.getBasePath());

        this.extractFiles(baseTempDir, downloadedZipArchive);
        this.unpackFiles(downloadedFilesProc, filesWithMapping, allProjectTranslations, pb.getBasePath(), baseTempDir);

        try {
            FileUtils.deleteDirectory(new File(baseTempDir));
            Files.delete(downloadedZipArchive.toPath());
        } catch (IOException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.clearing_temp"), e);
        }
    }

    private Translation buildTranslation(TranslationsClient translationsClient, BuildTranslationPayload buildTranslationPayload) {
        Translation translationBuild;
        try {
            ConsoleSpinner.start(BUILDING_TRANSLATION.getString(), this.noProgress);
            translationBuild = translationsClient.startBuildingTranslation(buildTranslationPayload);

            while (!translationBuild.getStatus().equalsIgnoreCase("finished")) {
                ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.building_translation"), Math.toIntExact(translationBuild.getProgress())));
                Thread.sleep(100);
                translationBuild = translationsClient.checkBuildingStatus(translationBuild.getId().toString());
            }

            ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.building_translation"), 100));
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.building_translation"), e);
        }
        return translationBuild;
    }

    private List<String> getListOfFileFromArchive(File downloadedZipArchive) {
        try (java.util.zip.ZipFile zipFile = new java.util.zip.ZipFile(downloadedZipArchive.getAbsolutePath())) {
            return zipFile
                .stream()
                .filter(ze -> !ze.isDirectory())
                .map(ze -> ze.getName().replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX))
                .collect(Collectors.toList());
        } catch (IOException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.extracting_files"));
        }
    }

    private void extractFiles(String baseTempDir, File downloadedZipArchive) {
        ZipFile zFile;
        try {
            zFile = new ZipFile(downloadedZipArchive.getAbsolutePath());
        } catch (net.lingala.zip4j.exception.ZipException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.archive_not_exist"), downloadedZipArchive.getAbsolutePath()));
        }
        File tmpDir = new File(baseTempDir);
        if (!tmpDir.exists()) {
            try {
                Files.createDirectory(tmpDir.toPath());
            } catch (IOException ex) {
                System.out.println(RESOURCE_BUNDLE.getString("error.creatingDirectory"));
            }
        }
        try {
            zFile.extractAll(tmpDir.getAbsolutePath());
        } catch (net.lingala.zip4j.exception.ZipException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.extract_archive"), downloadedZipArchive.getAbsolutePath()));
        }
    }

    private Map<String, List<String>> buildAllProjectTranslations(
        List<FileEntity> projectFiles,
        Map<Long, Directory> projectDirectories,
        Map<Long, Branch> projectBranches,
        Optional<Long> branchId,
        PlaceholderUtil placeholderUtil,
        String basePath
    ) {
        Map<String, List<String>> allProjectTranslations = new HashMap<>();
        for (FileEntity fe : projectFiles) {
            if (branchId.isPresent() && !branchId.get().equals(fe.getBranchId())) {
                continue;
            }

            String path = (branchId.isPresent())
                ? this.buildFilePath(fe, projectDirectories)
                : this.buildFilePath(fe, projectDirectories, projectBranches);
            List<String> translations = (fe.getExportOptions() == null || fe.getExportOptions().getExportPattern() == null)
                ? Collections.singletonList((Utils.PATH_SEPARATOR + fe.getName()).replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX))
                : placeholderUtil.format(
                Collections.singletonList(
                    new File(basePath + path)),
                fe.getExportOptions().getExportPattern().replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX),
                false);
            if (!branchId.isPresent() && fe.getBranchId() != null) {
                translations = translations.stream()
                    .map(translation -> Utils.PATH_SEPARATOR + projectBranches.get(fe.getBranchId()).getName() + translation)
                    .collect(Collectors.toList());
            }
            allProjectTranslations.put(path, translations);
        }
        return allProjectTranslations;
    }

    private Pair<Map<File, File>, List<String>> sortFiles(
        List<String> downloadedFiles,
        Map<String, String> filesWithMapping,
        String basePath,
        String baseTempDir
    ) {
        Map<File, File> fileMapping = downloadedFiles
            .stream()
            .filter(filesWithMapping::containsKey)
            .collect(Collectors.toMap(
                downloadedFile -> new File(baseTempDir + downloadedFile),
                downloadedFile -> new File(basePath + filesWithMapping.get(downloadedFile))));
        List<String> omittedFiles = downloadedFiles
            .stream()
            .filter(downloadedFile -> !filesWithMapping.containsKey(downloadedFile))
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
            for (String projectFile : allProjectTranslations.keySet()) {
                if (allProjectTranslations.get(projectFile).contains(omittedFile)) {
                    isFound = true;
                    allOmittedFiles.putIfAbsent(projectFile, new ArrayList<>());
                    allOmittedFiles.get(projectFile).add(StringUtils.removeStart(omittedFile, Utils.PATH_SEPARATOR));
                }
            }
            if (!isFound) {
                allOmittedFilesNoSources.add(StringUtils.removeStart(omittedFile, Utils.PATH_SEPARATOR));
            }
        }
        return new ImmutablePair<>(allOmittedFiles, allOmittedFilesNoSources);
    }

    private void unpackFiles(
        List<String> downloadedFilesProc,
        Map<String, String> filesWithMapping,
        Map<String, List<String>> allProjectTranslations,
        String basePath,
        String baseTempDirPath
    ) {
        Pair<Map<File, File>, List<String>> result = sortFiles(downloadedFilesProc, filesWithMapping, basePath, baseTempDirPath);
        new TreeMap<>(result.getLeft()).forEach((fromFile, toFile) -> { //files to extract
            this.moveFile(fromFile, toFile);
            System.out.println(String.format(RESOURCE_BUNDLE.getString("message.extracted_file"), StringUtils.removeStart(toFile.getAbsolutePath(), basePath)));
        });
        if (!ignoreMatch && !result.getRight().isEmpty()) {
            Pair<Map<String, List<String>>, List<String>> omittedFiles = this.sortOmittedFiles(result.getRight(), allProjectTranslations);
            Map<String, List<String>> allOmittedFiles = new TreeMap<>(omittedFiles.getLeft());
            List<String> allOmittedFilesNoSources = omittedFiles.getRight();
            if (!allOmittedFiles.isEmpty()) {
                System.out.println(RESOURCE_BUNDLE.getString("message.downloaded_files_omitted"));
                allOmittedFiles.forEach((file, translations) -> {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list_with_count"), file, translations.size()));
                    if (isVerbose) {
                        translations.forEach(trans -> System.out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list"), trans)));
                    }
                });
            }
            if (!allOmittedFilesNoSources.isEmpty()) {
                System.out.println(RESOURCE_BUNDLE.getString("message.downloaded_files_omitted_without_sources"));
                allOmittedFilesNoSources.forEach(file -> System.out.println(String.format(RESOURCE_BUNDLE.getString("message.item_list"), file)));
            }
        }
    }

    private void moveFile(File fromFile, File toFile) {
        toFile.getParentFile().mkdirs();
        if (!fromFile.renameTo(toFile)) {
            if (toFile.delete()) {
                if (!fromFile.renameTo(toFile)) {
                    System.out.println(String.format(RESOURCE_BUNDLE.getString("error.replacing_file"), toFile.getAbsolutePath()));
                }
            }
        }
    }

    private String buildFilePath(FileEntity fe, Map<Long, Directory> directories) {
        StringBuilder sb = new StringBuilder(fe.getName());
        if (fe.getDirectoryId() != null) {
            Directory dir = directories.get(fe.getDirectoryId());
            while (dir != null) {
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
                dir = directories.get(dir.getDirectoryId());
            }
        }
        return sb.toString();
    }

    private String buildFilePath(FileEntity fe, Map<Long, Directory> directories, Map<Long, Branch> branchNames) {
        return
            ((fe.getBranchId() != null)
                ? branchNames.get(fe.getBranchId()).getName() + Utils.PATH_SEPARATOR
                : "")
            + this.buildFilePath(fe, directories);
    }

    private Map<String, String> doTranslationMapping(
        List<Language> languages,
        String translation,
        Map<String, Map<String, String>> projLanguageMapping,
        Map<String, Map<String, String>> languageMapping,
        Map<String, String> translationReplace,
        List<String> sources,
        String source,
        String basePath,
        PlaceholderUtil placeholderUtil
    ) {
        Map<String, String> mapping = new HashMap<>();

        for (Language language : languages) {

            if (!StringUtils.startsWith(translation, Utils.PATH_SEPARATOR)) {
                translation = Utils.PATH_SEPARATOR + translation;
            }
            String translationProject1 = placeholderUtil.replaceLanguageDependentPlaceholders(translation, projLanguageMapping, language);
            String translationFile1 = placeholderUtil.replaceLanguageDependentPlaceholders(translation, languageMapping, language);

            for (String projectFile : sources) {
                String translationProject2 = CommandUtils.replaceDoubleAsteriskInTranslation(translationProject1, projectFile, source, basePath);
                String translationFile2 = CommandUtils.replaceDoubleAsteriskInTranslation(translationFile1, projectFile, source, basePath);

                translationProject2 = placeholderUtil.replaceFileDependentPlaceholders(translationProject2, new File(projectFile));
                translationFile2 = placeholderUtil.replaceFileDependentPlaceholders(translationFile2, new File(projectFile));
                translationFile2 = translationReplace.keySet().stream()
                    .reduce(translationFile2, (trans, key) -> StringUtils.replace(
                        trans,
                        key.replaceAll("[\\\\/]+", Utils.PATH_SEPARATOR_REGEX), translationReplace.get(key)));
                mapping.put(translationProject2, translationFile2);
            }
        }
        return mapping;
    }

    private void downloadTranslations(TranslationsClient translationsClient, String buildId, String archivePath) {
        try {
            ConsoleSpinner.start(DOWNLOADING_TRANSLATION.getString(), this.noProgress);
            FileRaw fileRaw = translationsClient.getFileRaw(buildId);
            InputStream download = CrowdinHttpClient.download(fileRaw.getUrl());

            FileUtil.writeToFile(download, archivePath);
            ConsoleSpinner.stop(OK);
        } catch (IOException e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(ERROR_DURING_FILE_WRITE.getString(), e);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.downloading_file"), e);
        }
    }

    private void populateLanguageMapping (Map<String, Map<String, String>> toPopulate, Map<String, Map<String, String>> from, Map<String, String> placeholderMapping) {
        for (String langCode : from.keySet()) {
            for (String fromPlaceholder : from.get(langCode).keySet()) {
                String toPlaceholder = placeholderMapping.getOrDefault(fromPlaceholder, fromPlaceholder);
                toPopulate.putIfAbsent(toPlaceholder, new HashMap<>());
                toPopulate.get(toPlaceholder).putIfAbsent(langCode, from.get(langCode).get(fromPlaceholder));
            }
        }
    }
}
