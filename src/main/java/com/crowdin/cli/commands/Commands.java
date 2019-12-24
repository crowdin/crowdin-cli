package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectWrapper;
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
import com.crowdin.client.api.*;
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
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.logging.log4j.util.Strings;

import javax.ws.rs.core.Response;
import java.io.*;
import java.nio.charset.UnsupportedCharsetException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
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

        PropertiesBean configFromParameters = commandUtils.makeConfigFromParameters(commandLine, this.propertiesBean);
        if (configFromParameters != null) {
            this.propertiesBean = configFromParameters;
        } else {
            if (commandLine.getOptionValue(CrowdinCliOptions.CONFIG_LONG) != null && !commandLine.getOptionValue(CrowdinCliOptions.CONFIG_LONG).isEmpty()) {
                this.configFile = new File(commandLine.getOptionValue(CrowdinCliOptions.CONFIG_LONG));
            } else {
                this.configFile = new File("crowdin.yml");
                if (!this.configFile.isFile()) {
                    this.configFile = new File("crowdin.yaml");
                }
            }
            if (this.configFile.isFile()) {
                try {
                    this.cliConfig = this.fileReader.readCliConfig(this.configFile.getAbsolutePath(), this.isDebug);
                } catch (Exception e) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_reading_configuration_file") + " '" + this.configFile.getAbsolutePath() + "'");
                    if (this.isDebug) {
                        e.printStackTrace();
                    }
                    ConsoleUtils.exitError();
                }
            } else {
                System.out.println("Configuration file '" + this.configFile.getAbsolutePath() + "' does not exist");
                ConsoleUtils.exitError();
            }
            if (this.cliConfig != null) {
                try {
                    this.propertiesBean = this.cliProperties.loadProperties(this.cliConfig);
                } catch (Exception e) {
                    System.out.println(RESOURCE_BUNDLE.getString("load_properties_error"));
                    if (this.isDebug) {
                        e.printStackTrace();
                    }
                    ConsoleUtils.exitError();
                }
            } else {
                System.out.println("Configuration file '" + this.configFile.getAbsolutePath() + "' does not exist");
                ConsoleUtils.exitError();
            }
            if (this.identity != null && this.identity.isFile()) {
                this.propertiesBean = this.readIdentityProperties(this.propertiesBean);
            }
        }
        this.propertiesBean.setBaseUrl(commandUtils.getBaseUrl(this.propertiesBean));
        this.settings = Settings.withBaseUrl(this.propertiesBean.getApiToken(), this.propertiesBean.getBaseUrl());
        String basePath = commandUtils.getBasePath(this.propertiesBean, this.configFile, this.isDebug);
        if (basePath != null) {
            this.propertiesBean.setBasePath(basePath);
        } else {
            this.propertiesBean.setBasePath("");
        }
        if (configFromParameters == null) {
            if (commandLine.getOptionValue("base-path") != null && !commandLine.getOptionValue("base-path").isEmpty()) {
                propertiesBean.setBasePath(commandLine.getOptionValue("base-path"));
            }
        }
        this.propertiesBean = cliProperties.validateProperties(propertiesBean);

        if (this.isVerbose) {
            System.out.println(this.getProjectInfo());
        }
        if (this.isVerbose) {
            System.out.println(this.getProjectInfo().getSupportedLanguages());
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
            this.identityCliConfig = this.fileReader.readCliConfig(this.identity.getAbsolutePath(), this.isDebug);
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

        switch (resultCmd) {
            case UPLOAD:
            case UPLOAD_SOURCES:
            case PUSH:
            case UPLOAD_TRANSLATIONS:
                if (UPLOAD_TRANSLATIONS.equalsIgnoreCase(resultCmd)) {
                    boolean isImportDuplicates = commandLine.hasOption(CrowdinCliOptions.IMPORT_DUPLICATES);
                    boolean isImportEqSuggestions = commandLine.hasOption(CrowdinCliOptions.IMPORT_EQ_SUGGESTIONS);
                    boolean isAutoApproveImported = commandLine.hasOption(CrowdinCliOptions.AUTO_APPROVE_IMPORTED);
                    if (this.help) {
                        this.cliOptions.cmdUploadTranslationsOptions();
                    } else {
                        this.uploadTranslation(isImportDuplicates, isImportEqSuggestions, isAutoApproveImported);
                    }
                } else {
                    boolean isAutoUpdate = commandLine.getOptionValue(COMMAND_NO_AUTO_UPDATE) == null;
                    if (this.help) {
                        cliOptions.cmdUploadSourcesOptions();
                    } else if (this.dryrun) {
                        this.dryrunSources(commandLine);
                    } else {
                        this.uploadSources(isAutoUpdate);
                    }
                }
                break;
            case DOWNLOAD:
            case DOWNLOAD_TRANSLATIONS:
            case PULL:
                boolean ignoreMatch = commandLine.hasOption(IGNORE_MATCH);
                if (this.help) {
                    this.cliOptions.cmdDownloadOptions();
                } else if (this.dryrun) {
                    this.dryrunTranslation(commandLine);
                } else {
                    this.downloadTranslation(ignoreMatch);
                }
                break;
            case LIST:
                this.cliOptions.cmdListOptions();
                break;
            case LIST_PROJECT:
                if (this.help) {
                    this.cliOptions.cmdListProjectOptions();
                } else {
                    this.dryrunProject(commandLine);
                }
                break;
            case LIST_SOURCES:
                if (this.help) {
                    this.cliOptions.cmdListSourcesOptions();
                } else {
                    this.dryrunSources(commandLine);
                }
                break;
            case LIST_TRANSLATIONS:
                if (this.help) {
                    this.cliOptions.cmdListTranslationsIOptions();
                } else {
                    this.dryrunTranslation(commandLine);
                }
                break;
            case LINT:
                if (this.help) {
                    this.cliOptions.cmdLintOptions();
                } else {
                    this.lint();
                }
                break;
            case INIT:
            case GENERATE:
                if (this.help) {
                    this.cliOptions.cmdGenerateOptions();
                } else {
                    String config = null;
                    if (commandLine.getOptionValue(DESTINATION_LONG) != null && !commandLine.getOptionValue(DESTINATION_LONG).isEmpty()) {
                        config = commandLine.getOptionValue(DESTINATION_LONG);
                    } else if (commandLine.getOptionValue(DESTINATION_SHORT) != null && !commandLine.getOptionValue(DESTINATION_SHORT).isEmpty()) {
                        config = commandLine.getOptionValue(DESTINATION_SHORT);
                    }
                    this.generate(config);
                }
                break;
            case HELP:
                boolean p = commandLine.hasOption(HELP_P);
                if (this.help) {
                    this.cliOptions.cmdHelpOptions();
                } else if (p) {
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
                this.cliOptions.cmdHelpOptions();
                break;
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
                    this.cliOptions.cmdGeneralOptions();
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
        Boolean preserveHierarchy = this.propertiesBean.getPreserveHierarchy();
        List<FileBean> files = this.propertiesBean.getFiles();
        boolean noFiles = true;
        Optional<Long> branchId = getOrCreateBranchId();

        for (FileBean file : files) {
            if (file.getSource() == null
                    || file.getSource().isEmpty()
                    || file.getTranslation() == null
                    || file.getTranslation().isEmpty()) {
                continue;
            }
            List<String> sources = this.commandUtils.getSourcesWithoutIgnores(file, this.propertiesBean, getPlaceholderUtil());
            if (!sources.isEmpty()) {
                noFiles = false;
            }
            String commonPath = "";
            if (!preserveHierarchy) {
                commonPath = this.commandUtils.getCommonPath(sources, this.propertiesBean);
            }

            final String finalCommonPath = commonPath;
            final ProjectWrapper projectInfo = getProjectInfo();
            List<Runnable> tasks = sources.stream()
                    .map(source -> (Runnable) () -> {
                        File sourceFile = new File(source);
                        if (!sourceFile.isFile()) {
                            return;
                        }
                        boolean isDest = file.getDest() != null && !file.getDest().isEmpty() && !this.commandUtils.isSourceContainsPattern(file.getSource());
                        Pair<String, Long> preservePathToParentId = this.commandUtils.preserveHierarchy(file,
                                sourceFile.getAbsolutePath(),
                                finalCommonPath,
                                this.propertiesBean,
                                this.branch,
                                this.settings,
                                projectInfo.getProject().getId(),
                                this.isVerbose);
                        String preservePath = preservePathToParentId.getLeft();
                        Long parentId = preservePathToParentId.getRight();
                        String fName;
                        if (isDest) {
                            fName = new File(file.getDest()).getName();
                        } else {
                            fName = sourceFile.getName();
                        }
                        preservePath = preservePath + Utils.PATH_SEPARATOR + fName;
                        preservePath = preservePath.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                        if (preservePath.startsWith(Utils.PATH_SEPARATOR)) {
                            preservePath = preservePath.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
                        }

                        preservePath = preservePath.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");

                        FilePayload filePayload = new FilePayload();

                        filePayload.setDirectoryId(parentId);
                        filePayload.setTitle(preservePath);
                        filePayload.setType(file.getType());
                        branchId.ifPresent(filePayload::setBranchId);

                        ImportOptions importOptions;
                        if (source.endsWith(".xml")) {
                            XmlFileImportOptions xmlFileImportOptions = new XmlFileImportOptions();
                            xmlFileImportOptions.setContentSegmentation(unboxingBoolean(file.getContentSegmentation()));
                            xmlFileImportOptions.setTranslateAttributes(unboxingBoolean(file.getTranslateAttributes()));
                            xmlFileImportOptions.setTranslateContent(unboxingBoolean(file.getTranslateContent()));
                            xmlFileImportOptions.setTranslatableElements(file.getTranslatableElements());
                            importOptions = xmlFileImportOptions;
                        } else {
                            SpreadsheetFileImportOptions spreadsheetFileImportOptions = new SpreadsheetFileImportOptions();
                            spreadsheetFileImportOptions.setImportTranslations(true);
                            spreadsheetFileImportOptions.setFirstLineContainsHeader(unboxingBoolean(file.getFirstLineContainsHeader()));
                            spreadsheetFileImportOptions.setScheme(getSchemeObject(file));

                            importOptions = spreadsheetFileImportOptions;
                        }

                        filePayload.setImportOptions(importOptions);

                        ExportOptions exportOptions = null;
                        String translationWithReplacedAsterisk = null;
                        if (Strings.isNotEmpty(sourceFile.getAbsolutePath()) && file.getTranslation() != null && !file.getTranslation().isEmpty()) {
                            String translations = file.getTranslation();
                            if (translations.contains("**")) {
                                translationWithReplacedAsterisk = this.commandUtils.replaceDoubleAsteriskInTranslation(file.getTranslation(), sourceFile.getAbsolutePath(), file.getSource(), this.propertiesBean);
                            }
                            if (translationWithReplacedAsterisk != null) {
                                if (translationWithReplacedAsterisk.contains("\\")) {
                                    translationWithReplacedAsterisk = translationWithReplacedAsterisk.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                                    translationWithReplacedAsterisk = translationWithReplacedAsterisk.replaceAll("/+", "/");
                                }
                                GeneralFileExportOptions generalFileExportOptions = new GeneralFileExportOptions();
                                generalFileExportOptions.setExportPattern(translationWithReplacedAsterisk);
                                exportOptions = generalFileExportOptions;
                            } else {
                                String pattern = file.getTranslation();
                                if (pattern != null && pattern.contains("\\")) {
                                    pattern = pattern.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                                    pattern = pattern.replaceAll("/+", "/");
                                }

                                GeneralFileExportOptions generalFileExportOptions = new GeneralFileExportOptions();
                                generalFileExportOptions.setExportPattern(pattern);
                                exportOptions = generalFileExportOptions;
                            }
                        }

                        filePayload.setExportOptions(exportOptions);

                        Response response;
                        try {
                            Long storageId = createStorage(sourceFile);
                            filePayload.setStorageId(storageId);
                            filePayload.setName(preservePath);
                            FilesApi filesApi = new FilesApi(settings);
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
                                            Map<String, Integer> schemeObject = getSchemeObject(file);
                                            String updateOption = getUpdateOption(file);
                                            Integer escapeQuotes = (int) file.getEscapeQuotes();
                                            RevisionPayload revisionPayload = new RevisionPayload(storageId, schemeObject, file.getFirstLineContainsHeader(), updateOption, escapeQuotes);

                                            return new RevisionsApi(this.settings).createRevision(projectId, fileId, revisionPayload).execute();
                                        }).orElseGet(() -> uploadFile(filePayload, filesApi));
                            } else {
                                response = uploadFile(filePayload, filesApi);
                            }
                            System.out.println(OK.withIcon(RESOURCE_BUNDLE.getString("uploading_file") + " '" + preservePath + "'"));
                        } catch (Exception e) {
                            System.out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("uploading_file") + " '" + preservePath + "'"));
                            System.out.println("message : " + e.getMessage());
                            if (this.isDebug) {
                                e.printStackTrace();
                            }
                            return;
                        }
                        if (this.isVerbose && response != null) {
                            System.out.println(response.getHeaders());
                            System.out.println(ResponseUtil.getResponceBody(response));
                        }
                    })
                    .collect(Collectors.toList());
            ConcurrencyUtil.executeAndWait(tasks);
        }
        if (noFiles) {
            System.out.println("Error: No source files to upload.\n" +
                    "Check your configuration file to ensure that they contain valid directives.");
            ConsoleUtils.exitError();
        }
    }

    private String getUpdateOption(FileBean file) {
        String fileUpdateOption = file.getUpdateOption();
        if (fileUpdateOption == null || fileUpdateOption.isEmpty()) {
            return null;
        }

        return fileUpdateOption;
    }

    private Response uploadFile(FilePayload filePayload, FilesApi filesApi) {
        String projectId = this.getProjectInfo().getProject().getId().toString();
        return filesApi
                .createFile(projectId, filePayload)
                .execute();
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


        final ProjectWrapper projectInfo = getProjectInfo();
        for (FileBean file : files) {
            for (Language languageEntity : projectInfo.getSupportedLanguages()) {
                if (language != null && !language.isEmpty() && languageEntity != null && !language.equals(languageEntity.getId())) {
                    continue;
                }

                String lng = (this.language == null || this.language.isEmpty()) ? languageEntity.getId() : this.language;
                List<String> sourcesWithoutIgnores = commandUtils.getSourcesWithoutIgnores(file, propertiesBean, getPlaceholderUtil());
                String[] common = new String[sourcesWithoutIgnores.size()];
                common = sourcesWithoutIgnores.toArray(common);
                String commonPath = Utils.replaceBasePath(Utils.commonPath(sourcesWithoutIgnores.toArray(common)), propertiesBean);
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
                                    System.out.println("Source file '" + Utils.replaceBasePath(sourcesWithoutIgnoreFile.getAbsolutePath(), propertiesBean) + "' does not exist");
                                    continue;
                                }
                                String translationSrc = Utils.replaceBasePath(sourcesWithoutIgnoreFile.getAbsolutePath(), propertiesBean);
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
                                    System.out.println(OK.withIcon("Uploading translation file '" + Utils.replaceBasePath(translationFile.getAbsolutePath(), propertiesBean) + "'"));

                                    TranslationsApi api = new TranslationsApi(settings);
                                    TranslationPayload translationPayload = new TranslationPayload();

                                    FileEntity projectFile = projectFileOrNone.get();

                                    translationPayload.setFileId(projectFile.getId());

                                    if (importDuplicates) translationPayload.setImportDuplicates(true);
                                    if (importEqSuggestions) translationPayload.setImportEqSuggestions(true);
                                    if (autoApproveImported) translationPayload.setAutoApproveImported(true);

                                    Long storageId = createStorage(translationFile);
                                    translationPayload.setStorageId(storageId);

                                    Response uploadTransactionsResponse = api
                                            .uploadTranslation(projectId, languageEntity.getId(), translationPayload)
                                            .execute();

                                    if (isVerbose) {
                                        System.out.println(uploadTransactionsResponse.getHeaders());
                                        System.out.println(ResponseUtil.getResponceBody(uploadTransactionsResponse));
                                    }
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

    private Long createStorage(File uploadData) {
        return new StorageApi(settings)
                .uploadFile(uploadData)
                .getResponseEntity()
                .getEntity()
                .getId();
    }

    private void download(String languageCode, boolean ignoreMatch) {

        Language languageEntity = getProjectInfo().getProjectLanguages()
                .stream()
                .filter(language -> language.getId().equals(languageCode))
                .findAny()
                .orElseThrow(() -> new RuntimeException("language '" + languageCode + "' does not exist in the project"));

        TranslationsApi api = new TranslationsApi(this.settings);

        Long projectId = this.getProjectInfo().getProject().getId();
        Optional<Branch> branchOrNull = Optional.ofNullable(this.branch)
                .flatMap(branchName -> new BranchClient(this.settings).getProjectBranchByName(projectId, branchName));

        System.out.println(RESOURCE_BUNDLE.getString("build_archive") + " for '" + languageCode + "'");
        Response clientResponse = null;
        Translation translationBuild = null;
        try {
            BuildTranslationPayload buildTranslation = new BuildTranslationPayload();
            branchOrNull.map(Branch::getId).ifPresent(buildTranslation::setBranchId);
            buildTranslation.setTargetLanguageIds(Collections.singletonList(languageEntity.getId()));
            ConsoleSpinner.start(BUILDING_TRANSLATION.getString(), this.noProgress);
            clientResponse = api.buildTranslation(Long.toString(projectId), buildTranslation).execute();
            translationBuild = ResponseUtil.getResponceBody(clientResponse, new TypeReference<SimpleResponse<Translation>>() {
            }).getEntity();
            while (!translationBuild.getStatus().equalsIgnoreCase("finished")) {
                Thread.sleep(100);
                translationBuild = api.getTranslationInfo(projectId.toString(), translationBuild.getId().toString()).getResponseEntity().getEntity();
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
            System.out.println(clientResponse.getHeaders());
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
            Response fileRawResponse = api.getTranslationRaw(Long.toString(projectId), Long.toString(translationBuild.getId())).execute();
            FileRaw fileRaw = ResponseUtil.getResponceBody(fileRawResponse, new TypeReference<SimpleResponse<FileRaw>>() {
            }).getEntity();
            InputStream download = CrowdinHttpClient.download(fileRaw.getUrl());

            FileUtil.writeToFile(download, downloadedZipArchivePath);
            ConsoleSpinner.stop(OK);
            if (isVerbose) {
                System.out.println(fileRawResponse.getHeaders());
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
            commonPath = Utils.replaceBasePath(commonPath, propertiesBean);

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
                    List<FileBean> files = propertiesBean.getFiles();
                    for (FileBean file : files) {
                        result.addAll(commandUtils.getSourcesWithoutIgnores(file, propertiesBean, getPlaceholderUtil()));
                    }
                    break;
                }
                case TRANSLATIONS: {
                    List<FileBean> files = propertiesBean.getFiles();
                    for (FileBean file : files) {
                        List<String> translations = commandUtils.getTranslations(null, null, file, this.getProjectInfo(), propertiesBean, command, getPlaceholderUtil());
                        result.addAll(translations);
                    }
                    break;
                }
            }
        }
        return result;
    }

    public void help(String resultCmd) {
        if (null != resultCmd) {
            switch (resultCmd) {
                case HELP:
                case "":
                    cliOptions.cmdGeneralOptions();
                    break;
                case HELP_UPLOAD:
                    cliOptions.cmdUploadOptions();
                    break;
                case HELP_UPLOAD_SOURCES:
                    cliOptions.cmdUploadSourcesOptions();
                    break;
                case HELP_UPLOAD_TRANSLATIONS:
                    cliOptions.cmdUploadTranslationsOptions();
                    break;
                case HELP_DOWNLOAD:
                    cliOptions.cmdDownloadOptions();
                    break;
                case HELP_LIST:
                    cliOptions.cmdListOptions();
                    break;
                case HELP_LINT:
                    cliOptions.cmdLintOptions();
                    break;
                case HELP_LIST_PROJECT:
                    cliOptions.cmdListProjectOptions();
                    break;
                case HELP_LIST_SOURCES:
                    cliOptions.cmdListSourcesOptions();
                    break;
                case HELP_LIST_TRANSLATIONS:
                    cliOptions.cmdListTranslationsIOptions();
                    break;
                case HELP_GENERATE:
                    cliOptions.cmdGenerateOptions();
                    break;
            }
        }
    }

    private void dryrunSources(CommandLine commandLine) {
        List<String> files = this.list(SOURCES, "sources");
        if (files.size() < 1) {
            ConsoleUtils.exitError();
        }
        commandUtils.sortFilesName(files);
        String commonPath = "";
        if (!propertiesBean.getPreserveHierarchy()) {
            commonPath = commandUtils.getCommonPath(files, propertiesBean);
        }
        if (commandLine.hasOption(COMMAND_TREE)) {
            DrawTree drawTree = new DrawTree();
            List filesTree = new ArrayList();
            for (String file : files) {
                if (propertiesBean.getPreserveHierarchy()) {
                    filesTree.add(Utils.replaceBasePath(file, propertiesBean));
                } else {
                    StringBuilder resultFiles = new StringBuilder();
                    StringBuilder f = new StringBuilder();
                    String path = Utils.replaceBasePath(file, propertiesBean);
                    if (Utils.isWindows()) {
                        if (path.contains("\\")) {
                            path = path.replaceAll("\\\\", "/");
                            path = path.replaceAll("/+", "/");
                        }
                        if (commonPath.contains("\\")) {
                            commonPath = commonPath.replaceAll("\\\\", "/");
                            commonPath = commonPath.replaceAll("/+", "/");
                        }
                    }
                    if (path.startsWith(commonPath)) {
                        path = path.replaceFirst(commonPath, "");
                    } else if (path.startsWith("/" + commonPath)) {
                        path = path.replaceFirst("/" + commonPath, "");
                    }
                    if (Utils.isWindows() && path.contains("/")) {
                        path = path.replaceAll("/", Utils.PATH_SEPARATOR_REGEX);
                    }
                    if (path.startsWith(Utils.PATH_SEPARATOR)) {
                        path = path.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
                    }
                    String[] nodes = path.split(Utils.PATH_SEPARATOR_REGEX);
                    for (String node : nodes) {
                        if (node != null && !node.isEmpty()) {
                            f.append(node).append(Utils.PATH_SEPARATOR);
                            String preservePath = propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + commonPath + Utils.PATH_SEPARATOR + f;
                            preservePath = preservePath.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                            File treeFile = new File(preservePath);
                            if (treeFile.isDirectory()) {
                                resultFiles.append(node).append(Utils.PATH_SEPARATOR);
                            } else {
                                resultFiles.append(node);
                            }
                        }
                    }
                    filesTree.add(resultFiles.toString());
                }
            }
            if (branch != null) {
                System.out.println(branch);
            }
            int ident = propertiesBean.getPreserveHierarchy() ? -1 : 0;
            drawTree.draw(filesTree, ident);
        } else {
            String src;
            for (String file : files) {
                if (propertiesBean.getPreserveHierarchy()) {
                    src = Utils.replaceBasePath(file, propertiesBean);
                    if (branch != null && !branch.isEmpty()) {
                        src = Utils.PATH_SEPARATOR + branch + Utils.PATH_SEPARATOR + src;
                    }
                    src = src.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                    System.out.println(src);
                } else {
                    src = Utils.replaceBasePath(file, propertiesBean);
                    if (Utils.isWindows()) {
                        if (src.contains("\\")) {
                            src = src.replaceAll("\\\\", "/");
                            src = src.replaceAll("/+", "/");
                        }
                        if (commonPath.contains("\\")) {
                            commonPath = commonPath.replaceAll("\\\\", "/");
                            commonPath = commonPath.replaceAll("/+", "/");
                        }
                    }
                    if (src.startsWith(commonPath)) {
                        src = src.replaceFirst(commonPath, "");
                    } else if (src.startsWith("/" + commonPath)) {
                        src = src.replaceFirst("/" + commonPath, "");
                    }
                    if (Utils.isWindows() && src.contains("/")) {
                        src = src.replaceAll("/", Utils.PATH_SEPARATOR_REGEX);
                    }
                    if (branch != null && !branch.isEmpty()) {
                        src = branch + Utils.PATH_SEPARATOR + src;
                    }
                    src = src.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                    System.out.println(src);
                }
            }
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
