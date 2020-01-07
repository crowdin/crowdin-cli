package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.*;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.request.PropertyFileExportOptionsWrapper;
import com.crowdin.cli.client.request.SpreadsheetFileImportOptionsWrapper;
import com.crowdin.cli.client.request.UpdateFilePayloadWrapper;
import com.crowdin.cli.client.request.XmlFileImportOptionsWrapper;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.*;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.cli.utils.file.FileReader;
import com.crowdin.cli.utils.file.FileUtil;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.client.api.FilesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.*;
import com.crowdin.common.request.*;
import com.crowdin.common.response.Page;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.CrowdinHttpClient;
import com.crowdin.util.ObjectMapperUtil;
import com.crowdin.util.PaginationUtil;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;

import javax.ws.rs.core.Response;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.UnsupportedCharsetException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipException;

import static com.crowdin.cli.properties.CliProperties.*;
import static com.crowdin.cli.utils.MessageSource.Messages.*;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class Commands extends BaseCli {

    private String branch = null;

    private HashMap<String, Object> cliConfig = new HashMap<>();

    private CrowdinCliOptions cliOptions = new CrowdinCliOptions();

    private CliProperties cliProperties = new CliProperties();

    private File configFile = null;

    private Settings settings = null;

    private CommandUtils commandUtils = new CommandUtils();

    private boolean dryrun = false;

    private FileReader fileReader = new FileReader();

    private boolean help = false;

    private File identity = null;

    private HashMap<String, Object> identityCliConfig = null;

    private boolean isDebug = false;

    private boolean isVerbose = false;

    private String language = null;

    private ProjectWrapper projectInfo = null;

    private PropertiesBean propertiesBean = new PropertiesBean();

    private boolean version = false;

    private boolean noProgress = false;

    private boolean skipGenerateDescription = false;

    private void initialize(String resultCmd, CommandLine commandLine) {
        this.removeUnsupportedCharsetProperties();
        if (notNeedInitialisation(resultCmd, commandLine)) {
            return;
        }

        try {
            PropertiesBean configFromParameters = commandUtils.makeConfigFromParameters(commandLine, this.propertiesBean);
            if (configFromParameters != null) {
                this.propertiesBean = configFromParameters;
            } else {
                try {
                    this.configFile = Stream.of(commandLine.getOptionValue(CrowdinCliOptions.CONFIG_LONG), "crowdin.yml", "crowdin.yaml")
                            .filter(StringUtils::isNoneEmpty)
                            .map(File::new)
                            .filter(File::isFile)
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("configuration_file_empty")));
                    this.cliConfig = this.fileReader.readCliConfig(this.configFile);
                    this.propertiesBean = this.cliProperties.loadProperties(this.cliConfig);
                    if (this.identity != null && this.identity.isFile()) {
                        this.propertiesBean = this.readIdentityProperties(this.propertiesBean);
                    }
                } catch (Exception e) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error_loading_config"), e);
                }
            }

            this.propertiesBean.setBaseUrl(commandUtils.getBaseUrl(this.propertiesBean));
            this.settings = Settings.withBaseUrl(this.propertiesBean.getApiToken(), this.propertiesBean.getBaseUrl());
            this.propertiesBean.setBasePath(commandUtils.getBasePath(this.propertiesBean.getBasePath(), this.configFile, this.isDebug));

            if (configFromParameters == null && StringUtils.isNoneEmpty(commandLine.getOptionValue("base-path"))) {
                propertiesBean.setBasePath(commandLine.getOptionValue("base-path"));
            }
            this.propertiesBean = cliProperties.validateProperties(propertiesBean);
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("initialisation_failed"), e);
        }
    }

    private ProjectWrapper getProjectInfo() {
        if (projectInfo == null) {
            ConsoleSpinner.start(FETCHING_PROJECT_INFO.getString(), this.noProgress);
            projectInfo = new ProjectClient(this.settings).getProjectInfo(this.propertiesBean.getProjectId(), this.isDebug);
            ConsoleSpinner.stop(OK);
        }
        return projectInfo;
    }

    private PlaceholderUtil getPlaceholderUtil() {
        ProjectWrapper proj = getProjectInfo();
        return new PlaceholderUtil(proj.getSupportedLanguages(), proj.getProjectLanguages(), propertiesBean.getBasePath());
    }

    private boolean notNeedInitialisation(String resultCmd, CommandLine commandLine) {
        return resultCmd.startsWith(HELP)
                || (GENERATE.equals(resultCmd) || INIT.equals(resultCmd))
                || "".equals(resultCmd)
                || commandLine.hasOption(CrowdinCliOptions.HELP_LONG)
                || commandLine.hasOption(CrowdinCliOptions.HELP_SHORT);
    }

    private void removeUnsupportedCharsetProperties() {
        try {
            String stdoutEncoding = System.getProperties().getProperty("sun.stdout.encoding");
            if (stdoutEncoding != null && !stdoutEncoding.isEmpty()) {
                java.nio.charset.Charset.forName(stdoutEncoding);
            }
        } catch (UnsupportedCharsetException e) {
            System.getProperties().remove("sun.stdout.encoding");
        }
    }

    private PropertiesBean readIdentityProperties(PropertiesBean propertiesBean) {
        try {
            this.identityCliConfig = this.fileReader.readCliConfig(this.identity);
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_reading_configuration_file") + " '" + this.identity.getAbsolutePath() + "'");
            if (this.isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }

        if (this.identityCliConfig != null) {
            if (this.identityCliConfig.get("project_idr_env") != null) {
                String projectIdEnv = this.identityCliConfig.get("project_id_env").toString();
                String projectId = System.getenv(projectIdEnv);

                if (StringUtils.isNotEmpty(projectId)) {
                    propertiesBean.setProjectId(projectId);
                }
            }
            if (this.identityCliConfig.get("api_token_env") != null) {
                String apiTokenEnv = this.identityCliConfig.get("api_token_env").toString();
                String apiToken = System.getenv(apiTokenEnv);

                if (StringUtils.isNotEmpty(apiToken)) {
                    propertiesBean.setApiToken(apiToken);
                }
            }
            if (this.identityCliConfig.get("base_path_env") != null) {
                String basePathEnv = this.identityCliConfig.get("base_path_env").toString();
                String basePath = System.getenv(basePathEnv);

                if (StringUtils.isNotEmpty(basePath)) {
                    propertiesBean.setBasePath(basePath);
                }
            }
            if (this.identityCliConfig.get("base_url_env") != null) {
                String baseUrlEnv = this.identityCliConfig.get("base_url_env").toString();
                String baseUrl = System.getenv(baseUrlEnv);

                if (StringUtils.isNotEmpty(baseUrl)) {
                    propertiesBean.setBaseUrl(baseUrl);
                }
            }
            if (this.identityCliConfig.get("project_id") != null) {
                propertiesBean.setProjectId(this.identityCliConfig.get("project_id").toString());
            }
            if (this.identityCliConfig.get("api_token") != null) {
                propertiesBean.setApiToken(this.identityCliConfig.get("api_token").toString());
            }
            if (this.identityCliConfig.get("base_path") != null) {
                propertiesBean.setBasePath(this.identityCliConfig.get("base_path").toString());
            }
            if (this.identityCliConfig.get("base_url") != null) {
                propertiesBean.setBaseUrl(this.identityCliConfig.get("base_url").toString());
            }
        }
        return propertiesBean;
    }

    public void run(String resultCmd, CommandLine commandLine) {

        if (commandLine == null) {
            System.out.println(RESOURCE_BUNDLE.getString("commandline_null"));
            ConsoleUtils.exitError();
        }
        if (resultCmd == null) {
            System.out.println(RESOURCE_BUNDLE.getString("command_not_found"));
            ConsoleUtils.exitError();
        }

        this.branch = this.commandUtils.getBranch(commandLine);
        this.language = this.commandUtils.getLanguage(commandLine);
        this.identity = this.commandUtils.getIdentityFile(commandLine);
        this.isDebug = commandLine.hasOption(CrowdinCliOptions.DEBUG_LONG);
        this.isVerbose = commandLine.hasOption(CrowdinCliOptions.VERBOSE_LONG) || commandLine.hasOption(CrowdinCliOptions.VERBOSE_SHORT);
        this.dryrun = commandLine.hasOption(CrowdinCliOptions.DRY_RUN_LONG);
        this.help = commandLine.hasOption(HELP) || commandLine.hasOption(HELP_SHORT);
        this.version = commandLine.hasOption(CrowdinCliOptions.VERSION_LONG);
        this.noProgress = commandLine.hasOption(CrowdinCliOptions.NO_PROGRESS);
        this.skipGenerateDescription = commandLine.hasOption(CrowdinCliOptions.SKIP_GENERATE_DESCRIPTION);
        this.initialize(resultCmd, commandLine);

        if (this.help) {
            this.help(resultCmd);
            return;
        }
        switch (resultCmd) {
            case UPLOAD:
            case UPLOAD_SOURCES:
            case PUSH:
                boolean isAutoUpdate = commandLine.getOptionValue(COMMAND_NO_AUTO_UPDATE) == null;
                if (this.dryrun) {
                    boolean treeView = commandLine.hasOption(COMMAND_TREE);
                    this.dryrunSources(treeView);
                } else {
                    this.uploadSources(isAutoUpdate);
                }
                break;
            case UPLOAD_TRANSLATIONS:
                boolean isImportDuplicates = commandLine.hasOption(CrowdinCliOptions.IMPORT_DUPLICATES);
                boolean isImportEqSuggestions = commandLine.hasOption(CrowdinCliOptions.IMPORT_EQ_SUGGESTIONS);
                boolean isAutoApproveImported = commandLine.hasOption(CrowdinCliOptions.AUTO_APPROVE_IMPORTED);
                this.uploadTranslation(isImportDuplicates, isImportEqSuggestions, isAutoApproveImported);
                break;
            case DOWNLOAD:
            case DOWNLOAD_TRANSLATIONS:
            case PULL:
                boolean ignoreMatch = commandLine.hasOption(IGNORE_MATCH);
                if (this.dryrun) {
                    this.dryrunTranslation(commandLine);
                } else {
                    this.downloadTranslation(ignoreMatch);
                }
                break;
            case LIST:
                this.help(resultCmd);
                break;
            case LIST_PROJECT:
                this.dryrunProject(commandLine);
                break;
            case LIST_SOURCES:
                boolean treeView = commandLine.hasOption(COMMAND_TREE);
                this.dryrunSources(treeView);
                break;
            case LIST_TRANSLATIONS:
                this.dryrunTranslation(commandLine);
                break;
            case LINT:
                this.lint();
                break;
            case INIT:
            case GENERATE:
                String config = null;
                if (commandLine.getOptionValue(DESTINATION_LONG) != null && !commandLine.getOptionValue(DESTINATION_LONG).isEmpty()) {
                    config = commandLine.getOptionValue(DESTINATION_LONG);
                } else if (commandLine.getOptionValue(DESTINATION_SHORT) != null && !commandLine.getOptionValue(DESTINATION_SHORT).isEmpty()) {
                    config = commandLine.getOptionValue(DESTINATION_SHORT);
                }
                this.generate(config);
                break;
            case HELP:
                boolean p = commandLine.hasOption(HELP_P);
                if (p) {
                    System.out.println(UPLOAD);
                    System.out.println(DOWNLOAD);
                    System.out.println(LIST);
                    System.out.println(LINT);
                    System.out.println(GENERATE);
                    System.out.println(HELP);
                } else {
                    this.help(resultCmd);
                }
                break;
            case HELP_HELP:
            case HELP_UPLOAD:
            case HELP_UPLOAD_SOURCES:
            case HELP_UPLOAD_TRANSLATIONS:
            case HELP_DOWNLOAD:
            case HELP_GENERATE:
            case HELP_LIST:
            case HELP_LIST_PROJECT:
            case HELP_LIST_SOURCES:
            case HELP_LIST_TRANSLATIONS:
            case HELP_LINT:
                this.help(resultCmd);
                break;
            default:
                if (this.version) {
                    System.out.println("Crowdin CLI version is " + Utils.getAppVersion());
                } else {
                    StringBuilder wrongArgs = new StringBuilder();
                    for (String wrongCmd : commandLine.getArgList()) {
                        wrongArgs.append(wrongCmd).append(" ");
                    }
                    if (!"".equalsIgnoreCase(wrongArgs.toString().trim())) {
                        System.out.println("Command '" + wrongArgs.toString().trim() + "' not found");
                    }
                    this.help(HELP);
                }
                break;
        }
    }

    private void generate(String path) {
        File skeleton;
        if (path != null && !path.isEmpty()) {
            skeleton = new File(path);
        } else {
            skeleton = new File("crowdin.yml");
        }

        Path destination = Paths.get(skeleton.toURI());
        System.out.println(RESOURCE_BUNDLE.getString("command_generate_description") + " '" + destination + "'");
        if (Files.exists(destination)) {
            System.out.println(ExecutionStatus.SKIPPED.getIcon() + "File '" + destination + "' already exists.");
            return;
        }

        try {
            if (skipGenerateDescription) {
                InputStream is = Commands.class.getResourceAsStream("/crowdin.yml");
                Files.copy(is, destination);
                return;
            }

            InputStream is = Commands.class.getResourceAsStream("/crowdin.yml");
            Files.copy(is, destination);
            List<String> dummyConfig = new ArrayList<>();

            Scanner in = new Scanner(skeleton);
            while (in.hasNextLine())
                dummyConfig.add(in.nextLine());

            System.out.println(GENERATE_HELP_MESSAGE.getString());
            Scanner consoleScanner = new Scanner(System.in);
            for (String param : Arrays.asList(API_TOKEN, PROJECT_ID, BASE_PATH, BASE_URL)) {
                System.out.print(param.replaceAll("_", " ") + " : ");
                String userInput = consoleScanner.nextLine();

                ListIterator<String> dummyConfigIterator = dummyConfig.listIterator();
                while (dummyConfigIterator.hasNext()) {
                    String defaultLine = dummyConfigIterator.next();
                    if (defaultLine.contains(param)) {
                        String lineWithUserInput = defaultLine.replaceFirst(": \"*\"", String.format(": \"%s\"", userInput));
                        dummyConfigIterator.set(lineWithUserInput);
                        Files.write(destination, dummyConfig);
                        break;
                    }
                }
            }
        } catch (Exception ex) {
            System.out.println(RESOURCE_BUNDLE.getString("error_generate"));
            if (this.isDebug) {
                ex.printStackTrace();
            }
        }
    }


    private Branch createBranch(String name) {
        try {
            Response createBranchResponse = new BranchesApi(settings)
                    .createBranch(Long.toString(this.getProjectInfo().getProject().getId()), new BranchPayload(name))
                    .execute();
            Branch branch = ResponseUtil.getResponceBody(createBranchResponse, new TypeReference<SimpleResponse<Branch>>() {
            }).getEntity();
            if (this.isVerbose) {
                System.out.println(createBranchResponse.getHeaders());
                System.out.println(ResponseUtil.getResponceBody(createBranchResponse));
            }

            System.out.println(OK.withIcon(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "'"));
            return branch;
        } catch (Exception e) {
            System.out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "'"));
            System.out.println(e.getMessage());
            if (this.isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }
        return null;
    }


    private void uploadSources(boolean autoUpdate) {
        final ProjectWrapper projectInfo = getProjectInfo();

        FileClient fileClient = new FileClient(this.settings);
        StorageClient storageClient = new StorageClient(this.settings);
        DirectoriesClient directoriesClient = new DirectoriesClient(this.settings, projectInfo.getProjectId());

        Boolean preserveHierarchy = this.propertiesBean.getPreserveHierarchy();
        List<FileBean> files = this.propertiesBean.getFiles();
        Optional<Long> branchId = getOrCreateBranchId();

        for (FileBean file : files) {
            if (StringUtils.isAnyEmpty(file.getSource(), file.getTranslation())) {
                throw new RuntimeException("No sources and/or translations in config are included");
            }
            List<String> sources = this.commandUtils.getSourcesWithoutIgnores(file, this.propertiesBean.getBasePath(), getPlaceholderUtil());
            String commonPath =
                (preserveHierarchy) ? "" : this.commandUtils.getCommonPath(sources);

            boolean isDest = StringUtils.isNotEmpty(file.getDest());

            if (sources.isEmpty()) {
                throw new RuntimeException("No sources found");
            }
            if (isDest && this.commandUtils.isSourceContainsPattern(file.getSource())) {
                throw new RuntimeException("Config contains 'dest' and have pattern in source. There can be only one file with 'dest'.");
            } else if (isDest && !preserveHierarchy) {
                throw new RuntimeException("The 'dest' parameter only works for single files, and if you use it, the configuration file should also include the 'preserve_hierarchy' parameter with true value.");
            }

            try {
                this.commandUtils.addDirectoryIdMap(directoriesClient.getProjectDirectoriesMapPathId());
            } catch (ResponseException e) {
                throw new RuntimeException("Couldn't get list of directories", e);
            }

            List<Runnable> tasks = sources.stream()
                    .map(File::new)
                    .filter(File::isFile)
                    .map(sourceFile -> (Runnable) () -> {
                        String filePath;

                        if (isDest) {
                            filePath = file.getDest();
                        } else {
                            filePath = Utils.replaceBasePath(sourceFile.getAbsolutePath(), this.propertiesBean.getBasePath());
                            filePath = StringUtils.removeStart(filePath, Utils.PATH_SEPARATOR);
                            filePath = StringUtils.removeStart(filePath, commonPath);
                        }
                        Long directoryId = this.commandUtils.createPath(filePath, branchId, directoriesClient);
                        String fName = ((isDest) ? new File(file.getDest()) : sourceFile).getName();

                        ImportOptions importOptions =
                            (sourceFile.getName().endsWith(".xml"))
                            ? new XmlFileImportOptionsWrapper(
                                unboxingBoolean(file.getContentSegmentation()),
                                unboxingBoolean(file.getTranslateAttributes()),
                                unboxingBoolean(file.getTranslateContent()),
                                file.getTranslatableElements())
                            : new SpreadsheetFileImportOptionsWrapper(
                                true,
                                unboxingBoolean(file.getFirstLineContainsHeader()),
                                getSchemeObject(file));

                        ExportOptions exportOptions = null;
                        if (StringUtils.isNoneEmpty(sourceFile.getAbsolutePath(), file.getTranslation())) {
                            String exportPattern = this.commandUtils.replaceDoubleAsteriskInTranslation(
                                file.getTranslation(),
                                sourceFile.getAbsolutePath(),
                                file.getSource(),
                                this.propertiesBean.getBasePath()
                            );
                            exportPattern = StringUtils.replacePattern(exportPattern, "[\\\\/]+", "/");
                            exportOptions = new PropertyFileExportOptionsWrapper(file.getEscapeQuotes(), exportPattern);
                        }

                        Long storageId;
                        try {
                            storageId = storageClient.uploadStorage(sourceFile, fName);
                        } catch (Exception e) {
                            throw new RuntimeException("Couldn't upload file '" + sourceFile.getAbsolutePath() + "' to storage");
                        }

                        FilePayload filePayload = new FilePayload();
                        filePayload.setName(fName);
                        filePayload.setDirectoryId(directoryId);
                        filePayload.setType(file.getType());
                        filePayload.setImportOptions(importOptions);
                        filePayload.setExportOptions(exportOptions);
                        filePayload.setStorageId(storageId);
                        branchId.ifPresent(filePayload::setBranchId);


                        Response response = null;
                        try {
                            if (autoUpdate) {
                                response = EntityUtils.find(
                                        projectInfo.getFiles(),
                                        filePayload.getName(),
                                        filePayload.getDirectoryId(),
                                        FileEntity::getName,
                                        FileEntity::getDirectoryId)
                                        .map(fileEntity -> {
                                            String fileId = fileEntity.getId().toString();
                                            String projectId = projectInfo.getProjectId();

                                            UpdateFilePayload updateFilePayload = new UpdateFilePayloadWrapper(
                                                filePayload.getStorageId(),
                                                filePayload.getExportOptions(),
                                                filePayload.getImportOptions()
                                            );
                                            getUpdateOption(file.getUpdateOption())
                                                    .ifPresent(updateFilePayload::setUpdateOption);

                                            return fileClient.updateFile(projectId, fileId, updateFilePayload);
                                        }).orElseGet(() -> fileClient.uploadFile(projectInfo.getProject().getId().toString(), filePayload));
                            } else {
                                response = fileClient.uploadFile(projectInfo.getProject().getId().toString(), filePayload);
                            }

                            System.out.println(OK.withIcon(RESOURCE_BUNDLE.getString("uploading_file") + " '" + filePath + "'"));
                        } catch (Exception e) {
                            System.out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("uploading_file") + " '" + filePath + "'"));
                            if (this.isDebug) {
                                e.printStackTrace();
                            }
                        }
                        if (this.isVerbose && response != null) {
                            System.out.println(response.getHeaders());
                            System.out.println(ResponseUtil.getResponceBody(response));
                        }
                    })
                    .collect(Collectors.toList());
            ConcurrencyUtil.executeAndWait(tasks);
        }
    }

    private Optional<String> getUpdateOption(String fileUpdateOption) {
        if (fileUpdateOption == null) {
            return Optional.empty();
        }
        switch(fileUpdateOption) {
            case UPDATE_OPTION_KEEP_TRANSLATIONS_CONF:
                return Optional.of(UPDATE_OPTION_KEEP_TRANSLATIONS);
            case UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS_CONF:
                return Optional.of(UPDATE_OPTION_KEEP_TRANSLATIONS_AND_APPROVALS);
            default:
                return Optional.empty();

        }
    }

    private Map<String, Integer> getSchemeObject(FileBean file) {
        String fileScheme = file.getScheme();
        if (fileScheme == null || fileScheme.isEmpty()) {
            return null;
        }

        String[] schemePart = fileScheme.split(",");
        Map<String, Integer> scheme = new HashMap<>();
        for (int i = 0; i < schemePart.length; i++) {
            scheme.put(schemePart[i], i);
        }
        return scheme;
    }

    private boolean unboxingBoolean(Boolean booleanValue) {
        return booleanValue == null
                ? false
                : booleanValue;
    }


    private void uploadTranslation(boolean importDuplicates, boolean importEqSuggestions, boolean autoApproveImported) {
        String projectId = getProjectInfo().getProject().getId().toString();
        List<FileBean> files = propertiesBean.getFiles();
        List<FileEntity> projectFiles = PaginationUtil.unpaged(new FilesApi(settings).getProjectFiles(projectId, Pageable.unpaged()));
        Map<Long, String> filesFullPath = commandUtils.getFilesFullPath(projectFiles, settings, getProjectInfo().getProject().getId());

        StorageClient storageClient = new StorageClient(this.settings);

        final ProjectWrapper projectInfo = getProjectInfo();
        for (FileBean file : files) {
            for (Language languageEntity : projectInfo.getSupportedLanguages()) {
                if (language != null && !language.isEmpty() && languageEntity != null && !language.equals(languageEntity.getId())) {
                    continue;
                }

                String lng = (this.language == null || this.language.isEmpty()) ? languageEntity.getId() : this.language;
                List<String> sourcesWithoutIgnores = commandUtils.getSourcesWithoutIgnores(file, propertiesBean.getBasePath(), getPlaceholderUtil());
                String[] common = new String[sourcesWithoutIgnores.size()];
                common = sourcesWithoutIgnores.toArray(common);
                String commonPath = Utils.replaceBasePath(Utils.commonPath(sourcesWithoutIgnores.toArray(common)), propertiesBean.getBasePath());
                if (Utils.isWindows()) {
                    if (commonPath.contains("\\")) {
                        commonPath = commonPath.replaceAll("\\\\", "/");
                        commonPath = commonPath.replaceAll("/+", "/");
                    }
                }
                final String finalCommonPath = commonPath;
                List<Runnable> tasks = sourcesWithoutIgnores.stream()
                        .map(sourcesWithoutIgnore -> (Runnable) () -> {
                            File sourcesWithoutIgnoreFile = new File(sourcesWithoutIgnore);
                            List<String> translations = commandUtils.getTranslations(lng, sourcesWithoutIgnore, file, projectInfo, propertiesBean, "translations", getPlaceholderUtil());
                            Map<String, String> mapping = commandUtils.doLanguagesMapping(projectInfo, propertiesBean, languageEntity.getId(), getPlaceholderUtil());
                            List<File> translationFiles = new ArrayList<>();

                            for (String translation : translations) {
                                translation = Utils.PATH_SEPARATOR + translation;
                                translation = translation.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                                String mappedTranslations = translation;
                                if (Utils.isWindows() && translation.contains("\\")) {
                                    translation = translation.replaceAll("\\\\+", "/").replaceAll(" {2}\\+", "/");
                                }
                                if (mapping != null && (mapping.get(translation) != null || mapping.get("/" + translation) != null)) {
                                    mappedTranslations = mapping.get(translation);
                                }
                                mappedTranslations = propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + mappedTranslations;
                                mappedTranslations = mappedTranslations.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                                translationFiles.add(new File(mappedTranslations));
                            }
                            for (File translationFile : translationFiles) {
                                if (!translationFile.isFile()) {
                                    System.out.println("Translation file '" + translationFile.getAbsolutePath() + "' does not exist");
                                    continue;
                                }
                                if (!sourcesWithoutIgnoreFile.isFile()) {
                                    System.out.println("Source file '" + Utils.replaceBasePath(sourcesWithoutIgnoreFile.getAbsolutePath(), propertiesBean.getBasePath()) + "' does not exist");
                                    continue;
                                }
                                String translationSrc = Utils.replaceBasePath(sourcesWithoutIgnoreFile.getAbsolutePath(), propertiesBean.getBasePath());
                                if (Utils.isWindows()) {
                                    if (translationSrc.contains("\\")) {
                                        translationSrc = translationSrc.replaceAll("\\\\", "/");
                                        translationSrc = translationSrc.replaceAll("/+", "/");
                                    }
                                }
                                if (!propertiesBean.getPreserveHierarchy() && translationSrc.startsWith(finalCommonPath)) {
                                    translationSrc = translationSrc.replaceFirst(finalCommonPath, "");
                                }
                                if (Utils.isWindows() && translationSrc.contains("/")) {
                                    translationSrc = translationSrc.replaceAll("/", Utils.PATH_SEPARATOR_REGEX);
                                }

                                if (Utils.isWindows()) {
                                    translationSrc = translationSrc.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                                }
                                if (translationSrc.startsWith("/")) {
                                    translationSrc = translationSrc.replaceFirst("/", "");
                                }
                                boolean isDest = file.getDest() != null && !file.getDest().isEmpty() && !this.commandUtils.isSourceContainsPattern(file.getSource());
                                if (isDest) {
                                    translationSrc = file.getDest();
                                    if (!propertiesBean.getPreserveHierarchy()) {
                                        if (translationSrc.lastIndexOf(Utils.PATH_SEPARATOR) != -1) {
                                            translationSrc = translationSrc.substring(translationSrc.lastIndexOf(Utils.PATH_SEPARATOR));
                                        }
                                        translationSrc = translationSrc.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                                    }
                                    if (Utils.isWindows()) {
                                        translationSrc = translationSrc.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                                    }
                                    if (translationSrc.startsWith("/")) {
                                        translationSrc = translationSrc.replaceFirst("/", "");
                                    }
                                }

                                String translationSrcFinal = translationSrc;
                                Optional<FileEntity> projectFileOrNone = EntityUtils.find(projectFiles, o -> filesFullPath.get(o.getId()).equalsIgnoreCase(translationSrcFinal));
                                if (!projectFileOrNone.isPresent()) {
                                    System.out.println("source '" + translationSrcFinal + "' does not exist in the project");
                                    continue;
                                }
                                try {
                                    System.out.println(OK.withIcon("Uploading translation file '" + Utils.replaceBasePath(translationFile.getAbsolutePath(), propertiesBean.getBasePath()) + "'"));

                                    Long storageId = storageClient.uploadStorage(translationFile, translationFile.getName());

                                    TranslationsClient translationsClient = new TranslationsClient(settings, projectId);
                                    translationsClient.uploadTranslations(
                                        languageEntity.getId(),
                                        projectFileOrNone.get().getId(),
                                        importDuplicates,
                                        importEqSuggestions,
                                        autoApproveImported,
                                        storageId
                                    );
                                } catch (Exception e) {
                                    System.out.println("message : " + e.getMessage());
                                    if (isDebug) {
                                        e.printStackTrace();
                                    }
                                }
                            }
                        })
                        .collect(Collectors.toList());
                ConcurrencyUtil.executeAndWait(tasks);
            }
        }

    }

    private Optional<Long> getOrCreateBranchId() {
        if (this.branch == null || this.branch.isEmpty()) return Optional.empty();

        Optional<Long> existBranch = new BranchClient(this.settings).getProjectBranchByName(this.getProjectInfo().getProject().getId(), branch)
                .map(Branch::getId);
        if (existBranch.isPresent()) {
            return existBranch;
        } else {
            return Optional.ofNullable(this.createBranch(branch)).map(Branch::getId);
        }
    }

    private void download(String languageCode, boolean ignoreMatch) {

        Language languageEntity = getProjectInfo().getProjectLanguages()
            .stream()
            .filter(language -> language.getId().equals(languageCode))
            .findAny()
            .orElseThrow(() -> new RuntimeException("language '" + languageCode + "' does not exist in the project"));

        Long projectId = this.getProjectInfo().getProject().getId();
        Optional<Branch> branchOrNull = Optional.ofNullable(this.branch)
                .flatMap(branchName -> new BranchClient(this.settings).getProjectBranchByName(projectId, branchName));

        TranslationsClient translationsClient = new TranslationsClient(this.settings, projectId.toString());

        System.out.println(RESOURCE_BUNDLE.getString("build_archive") + " for '" + languageCode + "'");
        Translation translationBuild = null;
        try {
            ConsoleSpinner.start(BUILDING_TRANSLATION.getString(), this.noProgress);
            translationBuild = translationsClient.startBuildingTranslation(branchOrNull.map(b -> b.getId()), languageEntity.getId());
            while (!translationBuild.getStatus().equalsIgnoreCase("finished")) {
                Thread.sleep(100);
                translationBuild = translationsClient.checkBuildingStatus(translationBuild.getId().toString());
            }

            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ExecutionStatus.ERROR);
            System.out.println(e.getMessage());
            if (isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }

        if (isVerbose) {
            System.out.println(ObjectMapperUtil.getEntityAsString(translationBuild));
        }

        String fileName = languageCode + ".zip";

        String basePath = propertiesBean.getBasePath();
        String baseTempDir;
        if (basePath.endsWith(Utils.PATH_SEPARATOR)) {
            baseTempDir = basePath + System.currentTimeMillis();
        } else {
            baseTempDir = basePath + Utils.PATH_SEPARATOR + System.currentTimeMillis();
        }

        String downloadedZipArchivePath = propertiesBean.getBasePath() != null && !propertiesBean.getBasePath().endsWith(Utils.PATH_SEPARATOR)
                ? propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + fileName
                : propertiesBean.getBasePath() + fileName;

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
            if (isDebug) {
                e.printStackTrace();
            }
        } catch (Exception e) {
            ConsoleSpinner.stop(ExecutionStatus.ERROR);
            System.out.println(e.getMessage());
            ConsoleUtils.exitError();
        }

        try {
            List<String> downloadedFiles = commandUtils.getListOfFileFromArchive(downloadedZipArchive, isDebug);
            List<String> downloadedFilesProc = new ArrayList<>();
            for (String downloadedFile : downloadedFiles) {
                if (Utils.isWindows()) {
                    downloadedFile = downloadedFile.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                }
                downloadedFilesProc.add(downloadedFile);
            }
            List<String> files = new ArrayList<>();
            Map<String, String> mapping = commandUtils.doLanguagesMapping(getProjectInfo(), propertiesBean, languageCode, getPlaceholderUtil());
            List<String> translations = this.list(TRANSLATIONS, "download");
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
            List<String> sources = this.list(SOURCES, null);
            String commonPath;
            String[] common = new String[sources.size()];
            common = sources.toArray(common);
            commonPath = Utils.commonPath(common);
            commonPath = Utils.replaceBasePath(commonPath, propertiesBean.getBasePath());

            if (commonPath.contains("\\")) {
                commonPath = commonPath.replaceAll("\\\\+", "/");
            }
            commandUtils.sortFilesName(downloadedFilesProc);
            commandUtils.extractFiles(downloadedFilesProc, files, baseTempDir, ignoreMatch, downloadedZipArchive, mapping, isDebug, this.branch, propertiesBean, commonPath);
            commandUtils.renameMappingFiles(mapping, baseTempDir, propertiesBean, commonPath);
            FileUtils.deleteDirectory(new File(baseTempDir));
            downloadedZipArchive.delete();
        } catch (ZipException e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_open_zip"));
            if (isDebug) {
                e.printStackTrace();
            }
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_extracting_files"));
            if (isDebug) {
                e.printStackTrace();
            }
        }
    }

    private void downloadTranslation(boolean ignoreMatch) {
        if (language != null) {
            this.download(language, ignoreMatch);
        } else {
            List<Language> projectLanguages = getProjectInfo().getProjectLanguages();
            for (Language projectLanguage : projectLanguages) {
                if (projectLanguage != null && projectLanguage.getId() != null) {
                    this.download(projectLanguage.getId(), ignoreMatch);
                }
            }
        }
    }

    public List<String> list(String subcommand, String command) {
        List<String> result = new ArrayList<>();
        if (subcommand != null && !subcommand.isEmpty()) {
            switch (subcommand) {
                case PROJECT: {
                    Long branchId = null;
                    if (branch != null) {
                        CrowdinRequestBuilder<Page<Branch>> branches = new BranchesApi(settings).getBranches(getProjectInfo().getProjectId(), null);
                        Optional<Branch> branchOp = PaginationUtil.unpaged(branches).stream()
                                .filter(br -> br.getName().equalsIgnoreCase(branch))
                                .findFirst();
                        if (branchOp.isPresent()) {
                            branchId = branchOp.get().getId();
                        }
                    }
                    result = commandUtils.projectList(getProjectInfo().getFiles(), getProjectInfo().getDirectories(), branchId);
                    break;
                }
                case SOURCES: {
                    result = propertiesBean.getFiles()
                        .stream()
                        .flatMap(file -> commandUtils.getSourcesWithoutIgnores(file, propertiesBean.getBasePath(), getPlaceholderUtil()).stream())
                        .collect(Collectors.toList());
                }
                case TRANSLATIONS: {
                    result = propertiesBean.getFiles()
                        .stream()
                        .flatMap(file ->
                            commandUtils.getTranslations(null, null, file, this.getProjectInfo(), propertiesBean, command, getPlaceholderUtil()).stream())
                        .collect(Collectors.toList());
                }
            }
        }
        return result;
    }

    public void help(String resultCmd) {
        if (null != resultCmd) {
            switch (resultCmd) {
                case "":
                case HELP:
                    cliOptions.cmdGeneralOptions();
                    break;
                case UPLOAD:
                case HELP_UPLOAD:
                    cliOptions.cmdUploadOptions();
                    break;
                case UPLOAD_SOURCES:
                case HELP_UPLOAD_SOURCES:
                    cliOptions.cmdUploadSourcesOptions();
                    break;
                case UPLOAD_TRANSLATIONS:
                case HELP_UPLOAD_TRANSLATIONS:
                    cliOptions.cmdUploadTranslationsOptions();
                    break;
                case DOWNLOAD:
                case HELP_DOWNLOAD:
                    cliOptions.cmdDownloadOptions();
                    break;
                case LIST:
                case HELP_LIST:
                    cliOptions.cmdListOptions();
                    break;
                case LINT:
                case HELP_LINT:
                    cliOptions.cmdLintOptions();
                    break;
                case LIST_PROJECT:
                case HELP_LIST_PROJECT:
                    cliOptions.cmdListProjectOptions();
                    break;
                case LIST_SOURCES:
                case HELP_LIST_SOURCES:
                    cliOptions.cmdListSourcesOptions();
                    break;
                case LIST_TRANSLATIONS:
                case HELP_LIST_TRANSLATIONS:
                    cliOptions.cmdListTranslationsIOptions();
                    break;
                case GENERATE:
                case HELP_GENERATE:
                    cliOptions.cmdGenerateOptions();
                    break;
                case HELP_HELP:
                    cliOptions.cmdHelpOptions();
            }
        }
    }

    private void dryrunSources(boolean treeView) {
        List<String> files;
        try {
            files = propertiesBean
                .getFiles()
                .stream()
                .flatMap(file -> this.commandUtils.getSourcesWithoutIgnores(file, propertiesBean.getBasePath(), getPlaceholderUtil()).stream())
                .map(source -> StringUtils.removeStart(source, propertiesBean.getBasePath()))
                .collect(Collectors.toList());

            final String commonPath =
                (propertiesBean.getPreserveHierarchy()) ? "" : commandUtils.getCommonPath(files);

            files = files.stream()
                .map(source -> StringUtils.removeStart(source, commonPath))
                .collect(Collectors.toList());

            files.sort(String::compareTo);
        } catch (Exception e) {
            throw new RuntimeException("Couldn't prepare source files", e);
        }

        if (branch != null) {
            System.out.println(branch);
        }
        if (treeView) {
            (new DrawTree()).draw(files, 0);
        } else {
            files.forEach(System.out::println);
        }
    }

    private void dryrunTranslation(CommandLine commandLine) {
        Set<String> translations = new HashSet<>();
        List<Language> projectLanguages = getProjectInfo().getProjectLanguages();
        Map<String, String> mappingTranslations = new HashMap<>();
        for (Language projectLanguage : projectLanguages) {
            if (projectLanguage != null && projectLanguage.getId() != null) {
//                JSONObject languageInfo = commandUtils.getLanguageInfo(projectLanguage.getName(), supportedLanguages);
                String projectLanguageId = projectLanguage.getId();
                mappingTranslations.putAll(commandUtils.doLanguagesMapping(getProjectInfo(), propertiesBean, projectLanguageId, getPlaceholderUtil()));
            }
        }
        String commonPath;
        String[] common = new String[mappingTranslations.values().size()];
        common = mappingTranslations.values().toArray(common);
        commonPath = Utils.commonPath(common);
        for (Map.Entry<String, String> mappingTranslation : mappingTranslations.entrySet()) {
            String s = mappingTranslation.getValue().replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
            if (!propertiesBean.getPreserveHierarchy()) {
                if (s.startsWith(commonPath)) {
                    s = s.replaceFirst(commonPath, "");
                }
            }
            translations.add(s);
        }
        List<String> files = new ArrayList<>(translations);
        commandUtils.sortFilesName(files);
        if (commandLine.hasOption(COMMAND_TREE)) {
            DrawTree drawTree = new DrawTree();
            int ident = -1;
            drawTree.draw(files, ident);
        } else {
            for (String file : files) {
                System.out.println(file);
            }
        }
    }

    private void dryrunProject(CommandLine commandLine) {
        List<String> files = this.list(PROJECT, "project");
        List<String> filesWin = new ArrayList<>();
        for (String file : files) {
            file = file.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            filesWin.add(file);
        }
        commandUtils.sortFilesName(files);
        commandUtils.sortFilesName(filesWin);
        if (commandLine.hasOption(COMMAND_TREE)) {
            DrawTree drawTree = new DrawTree();
            int ident = -1;
            drawTree.draw(filesWin, ident);
        } else {
            for (String file : files) {
                System.out.println(file.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX));
            }
        }
    }

    private void lint() {
        if (cliConfig == null) {
            System.out.println(RESOURCE_BUNDLE.getString("configuration_file_empty"));
            ConsoleUtils.exitError();
        } else {
            CliProperties cliProperties = new CliProperties();
            PropertiesBean propertiesBean = cliProperties.loadProperties(cliConfig);
            PropertiesBean propertiesBeanIdentity = null;
            if (identityCliConfig != null) {
                propertiesBeanIdentity = cliProperties.loadProperties(identityCliConfig);
            }
            if (propertiesBean == null && propertiesBeanIdentity == null) {
                System.out.println(RESOURCE_BUNDLE.getString("configuration_file_empty"));
                ConsoleUtils.exitError();
            }

            if (propertiesBean == null || propertiesBean.getProjectId() == null) {
                if (propertiesBeanIdentity == null || propertiesBeanIdentity.getProjectId() == null) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_project_id"));
                    ConsoleUtils.exitError();
                }
            }

            if (propertiesBean == null || propertiesBean.getApiToken() == null) {
                if (propertiesBeanIdentity == null || propertiesBeanIdentity.getApiToken() == null) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_api_token"));
                    ConsoleUtils.exitError();
                }
            }

            if (propertiesBean == null || propertiesBean.getBaseUrl() == null) {
                if (propertiesBeanIdentity == null || propertiesBeanIdentity.getBaseUrl() == null) {
                    String baseUrl = Utils.getBaseUrl();
                    if (baseUrl == null || baseUrl.isEmpty()) {
                        System.out.println(RESOURCE_BUNDLE.getString("missed_base_url"));
                        ConsoleUtils.exitError();
                    }
                }
            }

            String basePath = null;
            if (propertiesBean == null || propertiesBean.getBasePath() == null) {
                if (propertiesBeanIdentity != null && propertiesBeanIdentity.getBasePath() != null) {
                    basePath = propertiesBeanIdentity.getBasePath();
                }
            } else {
                basePath = propertiesBean.getBasePath();
            }
            if (basePath != null && !basePath.isEmpty()) {
                File base = new File(basePath);
                if (!base.exists()) {
                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                    ConsoleUtils.exitError();
                }
            }
            if (propertiesBean == null) {
                System.out.println(MISSING_PROPERTY_BEAN.getString());
            } else {
                if (propertiesBean.getFiles() == null) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_section_files"));
                    ConsoleUtils.exitError();
                } else if (propertiesBean.getFiles().isEmpty()) {
                    System.out.println(RESOURCE_BUNDLE.getString("empty_section_file"));
                    ConsoleUtils.exitError();
                } else {
                    for (FileBean fileBean : propertiesBean.getFiles()) {
                        if (fileBean.getSource() == null || fileBean.getSource().isEmpty()) {
                            System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_source_or_translation"));
                            ConsoleUtils.exitError();
                        }
                        if (fileBean.getTranslation() == null || fileBean.getTranslation().isEmpty()) {
                            System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_source_or_translation"));
                            ConsoleUtils.exitError();
                        }
                    }
                }
            }
        }
        System.out.println(RESOURCE_BUNDLE.getString("configuration_ok"));
    }
}
