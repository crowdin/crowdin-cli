package com.crowdin.cli.commands;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectWrapper;
import com.crowdin.cli.client.TranslationsClient;
import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.cli.utils.file.FileUtil;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.FileRaw;
import com.crowdin.common.models.Language;
import com.crowdin.common.models.Translation;
import com.crowdin.util.CrowdinHttpClient;
import com.crowdin.util.ObjectMapperUtil;
import net.lingala.zip4j.core.ZipFile;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;

import static com.crowdin.cli.utils.MessageSource.Messages.*;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "download", aliases = "pull", description = "Download latest translations from Crowdin and puts them to the specified place")
public class DownloadSubcommand extends PropertiesBuilderCommandPart {

    @CommandLine.Option(names = {"--dryrun"}, description = "Runs command without API connection")
    protected boolean dryrun;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @CommandLine.Option(names = {"--ignore--match"}, description = "Ignores warning message about configuration change")
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", description = "If the option is defined the translations will be downloaded for a single specified language. (default: all)")
    protected String languageId;

    @Override
    public Integer call() {

        PropertiesBean pb = this.buildPropertiesBean();
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectWrapper project = getProjectInfo(pb.getProjectId(), settings);
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        if (dryrun) {
            dryrunTranslation(pb, placeholderUtil, treeView);
            return 0;
        }

        if (languageId != null) {
            this.download(pb, project, languageId, placeholderUtil, settings, ignoreMatch);
        } else {
            List<Language> projectLanguages = project.getProjectLanguages();
            for (Language projectLanguage : projectLanguages) {
                if (projectLanguage != null && projectLanguage.getId() != null) {
                    this.download(pb, project, projectLanguage.getId(), placeholderUtil, settings, ignoreMatch);
                }
            }
        }
        return 0;
    }

    private void download(
        PropertiesBean pb,
        ProjectWrapper projectWrapper,
        String languageCode,
        PlaceholderUtil placeholderUtil,
        Settings settings,
        boolean ignoreMatch
    ) {
        CommandUtils commandUtils = new CommandUtils();

        Language languageEntity = projectWrapper.getProjectLanguages()
            .stream()
            .filter(language -> language.getId().equals(languageCode))
            .findAny()
            .orElseThrow(() -> new RuntimeException("language '" + languageCode + "' does not exist in the project"));

        Optional<Branch> branchOrNull = Optional.ofNullable(this.branch)
            .flatMap(branchName -> new BranchClient(settings).getProjectBranchByName(pb.getProjectId(), branchName));

        TranslationsClient translationsClient = new TranslationsClient(settings, pb.getProjectId());

        System.out.println(RESOURCE_BUNDLE.getString("build_archive") + " for '" + languageCode + "'");
        Translation translationBuild = null;
        try {
            ConsoleSpinner.start(BUILDING_TRANSLATION.getString(), this.noProgress);
            translationBuild = translationsClient.startBuildingTranslation(branchOrNull.map(Branch::getId), languageEntity.getId());
            while (!translationBuild.getStatus().equalsIgnoreCase("finished")) {
                Thread.sleep(100);
                translationBuild = translationsClient.checkBuildingStatus(translationBuild.getId().toString());
            }

            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ExecutionStatus.ERROR);
            System.out.println(e.getMessage());
            ConsoleUtils.exitError();
        }

        if (isVerbose) {
            System.out.println(ObjectMapperUtil.getEntityAsString(translationBuild));
        }

        String fileName = languageCode + ".zip";

        String basePath = pb.getBasePath();
        String baseTempDir;
        if (basePath.endsWith(Utils.PATH_SEPARATOR)) {
            baseTempDir = basePath + System.currentTimeMillis();
        } else {
            baseTempDir = basePath + Utils.PATH_SEPARATOR + System.currentTimeMillis();
        }

        String downloadedZipArchivePath = pb.getBasePath() != null && !pb.getBasePath().endsWith(Utils.PATH_SEPARATOR)
                ? pb.getBasePath() + Utils.PATH_SEPARATOR + fileName
                : pb.getBasePath() + fileName;

        File downloadedZipArchive = new File(downloadedZipArchivePath);

        try {
            ConsoleSpinner.start(DOWNLOADING_TRANSLATION.getString(), this.noProgress);
            FileRaw fileRaw = translationsClient.getFileRaw(translationBuild.getId().toString());
            InputStream download = CrowdinHttpClient.download(fileRaw.getUrl());

            FileUtil.writeToFile(download, downloadedZipArchivePath);
            ConsoleSpinner.stop(OK);
            if (isVerbose) {
                System.out.println(ObjectMapperUtil.getEntityAsString(fileRaw));
            }
        } catch (IOException e) {
            System.out.println(ERROR_DURING_FILE_WRITE.getString());
        } catch (Exception e) {
            ConsoleSpinner.stop(ExecutionStatus.ERROR);
            System.out.println(e.getMessage());
            ConsoleUtils.exitError();
        }

        try {
            List<String> downloadedFilesProc = new ArrayList<>();
            for (String downloadedFile : getListOfFileFromArchive(downloadedZipArchive, false)) {
                if (Utils.isWindows()) {
                    downloadedFile = downloadedFile.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                }
                downloadedFilesProc.add(downloadedFile);
            }
            List<String> files = new ArrayList<>();
            Optional<Language> projectLanguage = projectWrapper.getProjectLanguageByCrowdinCode(languageCode);
            Map<String, String> mapping = commandUtils.doLanguagesMapping(projectLanguage, pb.getFiles(), languageCode, placeholderUtil);
            List<String> translations = pb.getFiles()
                    .stream()
                    .flatMap(file ->
                            commandUtils.getTranslations(null, null, file, projectWrapper.getProjectLanguages(), projectWrapper.getSupportedLanguages(), pb, "download", placeholderUtil).stream())
                    .collect(Collectors.toList());
            for (String translation : translations) {
                translation = translation.replaceAll("/+", "/");
                if (!files.contains(translation)) {
                    if (translation.contains(Utils.PATH_SEPARATOR_REGEX)) {
                        translation = translation.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                    } else if (translation.contains(Utils.PATH_SEPARATOR)) {
                        translation = translation.replaceAll(Utils.PATH_SEPARATOR + Utils.PATH_SEPARATOR, "/");
                    }
                    translation = translation.replaceAll("/+", "/");
                    files.add(translation);
                }
            }
            List<String> sources = pb.getFiles()
                .stream()
                .flatMap(file -> commandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil).stream())
                .collect(Collectors.toList());
            String commonPath;
            String[] common = new String[sources.size()];
            common = sources.toArray(common);
            commonPath = Utils.commonPath(common);
            commonPath = Utils.replaceBasePath(commonPath, pb.getBasePath());

            if (commonPath.contains("\\")) {
                commonPath = commonPath.replaceAll("\\\\+", "/");
            }
            downloadedFilesProc.sort(String::compareTo);
            extractFiles(downloadedFilesProc, files, baseTempDir, ignoreMatch, downloadedZipArchive, mapping, false, this.branch, pb, commonPath);
            renameMappingFiles(mapping, baseTempDir, pb, commonPath);
            FileUtils.deleteDirectory(new File(baseTempDir));
            downloadedZipArchive.delete();
        } catch (ZipException e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_open_zip"));
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_extracting_files"));
        }
    }

    private void dryrunTranslation(PropertiesBean pb, PlaceholderUtil placeholderUtil, boolean treeView) {
        CommandUtils commandUtils = new CommandUtils();

        List<File> files = pb
            .getFiles()
            .stream()
            .flatMap(file -> commandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil).stream())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .map(File::new)
            .collect(Collectors.toList());


        List<String> translations = new ArrayList<>();
        for (FileBean fileBean : pb.getFiles()) {
            translations.addAll(placeholderUtil.format(files, fileBean.getTranslation(), true));
        }

        Collections.sort(translations);
        if (treeView) {
            (new DrawTree()).draw(translations, -1);
        } else {
            translations.forEach(System.out::println);
        }
    }

    private ProjectWrapper getProjectInfo(String projectId, Settings settings) {
        ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
        ProjectWrapper projectInfo = new ProjectClient(settings).getProjectInfo(projectId, false);
        ConsoleSpinner.stop(OK);
        return projectInfo;
    }

    private List<String> getListOfFileFromArchive(File downloadedZipArchive, boolean isDebug) {
        List<String> downloadedFiles = new ArrayList<>();
        java.util.zip.ZipFile zipFile = null;
        try {
            zipFile = new java.util.zip.ZipFile(downloadedZipArchive.getAbsolutePath());
        } catch (Exception e) {
            System.out.println("Extracting archive '" + downloadedZipArchive + "' failed");
            if (isDebug) {
                e.printStackTrace();
                ConsoleUtils.exitError();
            }
        }
        Enumeration zipEntries = zipFile.entries();
        while (zipEntries.hasMoreElements()) {
            ZipEntry ze = (ZipEntry) zipEntries.nextElement();
            if (!ze.isDirectory()) {
                String fname = ze.getName();
                if (!fname.startsWith(Utils.PATH_SEPARATOR)) {
                    fname = Utils.PATH_SEPARATOR + fname;
                    if (Utils.isWindows()) {
                        fname = fname.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                    }
                }
                downloadedFiles.add(fname);
            }
        }
        try {
            zipFile.close();
        } catch (IOException e) {
        }
        return downloadedFiles;
    }

    private void extractFiles(List<String> downloadedFiles, List<String> files, String baseTempDir, boolean ignore_match,
                             File downloadedZipArchive, Map<String, String> mapping, boolean isDebug, String branch,
                             PropertiesBean propertiesBean, String commonPath) {
        ZipFile zFile = null;
        try {
            zFile = new ZipFile(downloadedZipArchive.getAbsolutePath());
        } catch (Exception e) {
            System.out.println("An archive '" + downloadedZipArchive.getAbsolutePath() + "' does not exist");
            if (isDebug) {
                e.printStackTrace();
                ConsoleUtils.exitError();
            }
        }
        File tmpDir = new File(baseTempDir);
        if (!tmpDir.exists()) {
            try {
                Files.createDirectory(tmpDir.toPath());
            } catch (IOException ex) {
                System.out.println(RESOURCE_BUNDLE.getString("error_extracting"));
            }
        }
        try {
            zFile.extractAll(tmpDir.getAbsolutePath());
        } catch (Exception e) {
            System.out.println("Extracting an archive '" + downloadedZipArchive + "' failed");
            if (isDebug) {
                e.printStackTrace();
                ConsoleUtils.exitError();
            }
        }
        List<String> ommitedFiles = new ArrayList<>();
        List<String> extractingFiles = new ArrayList<>();
        for (String downloadedFile : downloadedFiles) {
            if (!files.contains(downloadedFile) && !files.contains(downloadedFile.replaceFirst("/", ""))) {
                if (branch != null && !branch.isEmpty()) {
                    ommitedFiles.add(downloadedFile.replaceFirst("/" + branch + "/", ""));
                } else {
                    ommitedFiles.add(downloadedFile);
                }
            } else {
                if (branch != null && !branch.isEmpty()) {
                    if (downloadedFile.startsWith("/" + branch + "/")) {
                        downloadedFile = downloadedFile.replaceFirst("/", "");
                        downloadedFile = downloadedFile.replaceFirst(branch, "");
                        downloadedFile = downloadedFile.replaceFirst("/", "");
                    }
                    extractingFiles.add(downloadedFile);
                } else {
                    extractingFiles.add(downloadedFile);
                }
            }
        }
        List<String> sortedExtractingFiles = new ArrayList<>();
        for (Map.Entry<String, String> extractingMappingFile : mapping.entrySet()) {
            String k = extractingMappingFile.getKey();
            k = k.replaceAll("/+", "/");
            if (k.contains(Utils.PATH_SEPARATOR)) {
                k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                k = k.replaceAll("/+", "/");
            }
            if (k.contains("/")) {
                k = k.replaceAll("/+", "/");
            }
            if (!propertiesBean.getPreserveHierarchy()) {
                if (k.startsWith(commonPath)) {
                    for (FileBean file : propertiesBean.getFiles()) {
                        String ep = file.getTranslation();
                        if (ep != null && !ep.startsWith(commonPath) && !(new CommandUtils()).isSourceContainsPattern(ep) && !extractingMappingFile.getValue().startsWith(commonPath)) {
                            k = k.replaceFirst(commonPath, "");
                        }
                    }
                }
            }
            if (k.startsWith("/")) {
                k = k.replaceFirst("/", "");
            }
            String v = extractingMappingFile.getValue();
            if (v.contains(Utils.PATH_SEPARATOR)) {
                v = v.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                v = v.replaceAll("/+", "/");
            }
            if (extractingFiles.contains(k) || extractingFiles.contains("/" + k)) {
                sortedExtractingFiles.add(v);
            }
        }
        sortedExtractingFiles.sort(String::compareTo);
        for (String sortedExtractingFile : sortedExtractingFiles) {
            System.out.println("Extracting: '" + sortedExtractingFile + "'");
        }
        if (ommitedFiles.size() > 0 && !ignore_match) {
            ommitedFiles.sort(String::compareTo);
            System.out.println(RESOURCE_BUNDLE.getString("downloaded_file_omitted"));
            for (String ommitedFile : ommitedFiles) {
                System.out.println(" - '" + ommitedFile + "'");
            }
        }
    }

    private void renameMappingFiles(Map<String, String> mapping, String baseTempDir, PropertiesBean propertiesBean, String commonPath) {
        for (Map.Entry<String, String> entry : mapping.entrySet()) {
            String preservedKey = entry.getKey();
            if (!propertiesBean.getPreserveHierarchy()) {
                if (Utils.isWindows() && commonPath != null && commonPath.contains("\\")) {
                    commonPath = commonPath.replaceAll("\\\\", "/");
                }
                commonPath = commonPath.replaceAll("/+", "/");
                preservedKey = preservedKey.replaceAll("/+", "/");
                if (preservedKey.startsWith(commonPath)) {
                    for (FileBean file : propertiesBean.getFiles()) {
                        String ep = file.getTranslation();
                        if (ep != null && !ep.startsWith(commonPath) && !(new CommandUtils()).isSourceContainsPattern(ep) && !entry.getValue().startsWith(commonPath)) {
                            preservedKey = preservedKey.replaceFirst(commonPath, "");
                        }
                    }
                }
            }
            String key = baseTempDir + Utils.PATH_SEPARATOR + preservedKey;
            key = key.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            String value = propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + entry.getValue();
            value = value.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            if (Utils.isWindows()) {
                key = key.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
                key = key.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                value = value.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
                value = value.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            }
            if (!key.equals(value)) {
                File oldFile = new File(key);
                File newFile = new File(value);
                if (oldFile.isFile()) {
                    //noinspection ResultOfMethodCallIgnored
                    newFile.getParentFile().mkdirs();
                    if (!oldFile.renameTo(newFile)) {
                        if (newFile.delete()) {
                            if (!oldFile.renameTo(newFile)) {
                                System.out.println("Replacing file '" + newFile.getAbsolutePath() + "' failed. Try to run an application with Administrator permission.");
                            }
                        }
                    }
                }
            }
        }
    }
}
