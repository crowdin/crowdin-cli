package com.crowdin.cli.commands;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectWrapper;
import com.crowdin.cli.client.TranslationsClient;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.cli.utils.file.FileReader;
import com.crowdin.cli.utils.file.FileUtil;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.FileRaw;
import com.crowdin.common.models.Language;
import com.crowdin.common.models.Translation;
import com.crowdin.util.CrowdinHttpClient;
import com.crowdin.util.ObjectMapperUtil;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipException;

import static com.crowdin.cli.utils.MessageSource.Messages.*;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(name = "download", aliases = "pull", description = "Download latest translations from Crowdin and puts them to the specified place")
public class DownloadSubcommand extends GeneralCommand {

    @CommandLine.Option(names = {"--dryrun"}, description = "Runs command without API connection")
    protected boolean dryrun;

    @CommandLine.Option(names = {"-b", "--branch"}, description = "Defines branch name (default: none)")
    protected String branch;

    @CommandLine.Option(names = {"--tree"}, description = "List contents of directories in a tree-like format")
    protected boolean treeView;

    @CommandLine.Option(names = {"--ignore--match"}, description = "Ignores warning message about configuration change")
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, description = "If the option is defined the translations will be downloaded for a single specified language. (default: all)")
    protected String language;

    @CommandLine.ArgGroup(exclusive = false, heading = "@|bold config params|@:%n")
    protected Params params;

    @Override
    public Integer call() {
        CommandUtils commandUtils = new CommandUtils();
        CliProperties cliProperties = new CliProperties();

        PropertiesBean pb = (params != null)
                ? cliProperties.getFromParams(params)
                : cliProperties.loadProperties((new FileReader()).readCliConfig(configFilePath.toFile()));
        cliProperties.validateProperties(pb);
        pb.setBasePath(commandUtils.getBasePath(pb.getBasePath(), configFilePath.toFile(), false));
        Settings settings = Settings.withBaseUrl(pb.getApiToken(), pb.getBaseUrl());

        ProjectWrapper project = getProjectInfo(pb.getProjectId(), settings);
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(), pb.getBasePath());

        if (dryrun) {
            dryrunTranslation(pb, placeholderUtil, treeView);
            return 0;
        }

        if (language != null) {
            this.download(pb, project, language, placeholderUtil, settings, ignoreMatch);
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
            for (String downloadedFile : commandUtils.getListOfFileFromArchive(downloadedZipArchive, false)) {
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
            commandUtils.sortFilesName(downloadedFilesProc);
            commandUtils.extractFiles(downloadedFilesProc, files, baseTempDir, ignoreMatch, downloadedZipArchive, mapping, false, this.branch, pb, commonPath);
            commandUtils.renameMappingFiles(mapping, baseTempDir, pb, commonPath);
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
}
