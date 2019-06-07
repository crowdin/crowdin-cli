package com.crowdin.cli.commands;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ProjectWrapper;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.*;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.client.api.FilesApi;
import com.crowdin.client.api.StorageApi;
import com.crowdin.client.api.TranslationsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.*;
import com.crowdin.common.request.*;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.CrowdinHttpClient;
import com.crowdin.util.ObjectMapperUtil;
import com.crowdin.util.PaginationUtil;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.logging.log4j.util.Strings;

import java.nio.charset.UnsupportedCharsetException;
import javax.ws.rs.core.Response;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.zip.ZipException;

import static com.crowdin.cli.utils.MessageSource.*;

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

    private ConsoleSpinner spinner = new ConsoleSpinner();

    private List<Language> supportedLanguages = null;

    private boolean version = false;

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
        this.settings = Settings.withBaseUrl(this.propertiesBean.getApiKey(), this.propertiesBean.getLogin(), this.propertiesBean.getBaseUrl());
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
        this.spinner.start();
        this.projectInfo = new ProjectClient(this.settings).getProjectInfo(this.propertiesBean.getProjectIdentifier(), this.isDebug);
        this.spinner.stop();

        if (this.isVerbose) {
            System.out.println(this.projectInfo);
        }
        this.supportedLanguages = this.projectInfo.getSupportedLanguages();
        if (this.isVerbose) {
            System.out.println(this.supportedLanguages);
        }
    }

    private boolean notNeedInitialisation(String resultCmd, CommandLine commandLine) {
        return resultCmd.startsWith(HELP)
                || GENERATE.equals(resultCmd)
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
            if (this.identityCliConfig.get("project_identifier_env") != null) {
                String projectIdentifierEnv = this.identityCliConfig.get("project_identifier_env").toString();
                String projectIdentifier = System.getenv(projectIdentifierEnv);

                if (StringUtils.isNotEmpty(projectIdentifier)) {
                    propertiesBean.setProjectIdentifier(projectIdentifier);
                }
            }
            if (this.identityCliConfig.get("api_key_env") != null) {
                String apiKeyEnv = this.identityCliConfig.get("api_key_env").toString();
                String apiKey = System.getenv(apiKeyEnv);

                if (StringUtils.isNotEmpty(apiKey)) {
                    propertiesBean.setApiKey(apiKey);
                }
            }
            if (this.identityCliConfig.get("login_env") != null) {
                String loginEnv = this.identityCliConfig.get("login_env").toString();
                String login = System.getenv(loginEnv);

                if (StringUtils.isNotEmpty(login)) {
                    propertiesBean.setLogin(login);
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
            if (this.identityCliConfig.get("project_identifier") != null) {
                propertiesBean.setProjectIdentifier(this.identityCliConfig.get("project_identifier").toString());
            }
            if (this.identityCliConfig.get("api_key") != null) {
                propertiesBean.setApiKey(this.identityCliConfig.get("api_key").toString());
            }
            if (this.identityCliConfig.get("login") != null) {
                propertiesBean.setLogin(this.identityCliConfig.get("login").toString());
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

        this.initialize(resultCmd, commandLine);

        switch (resultCmd) {
            case UPLOAD:
            case UPLOAD_SOURCES:
            case PUSH:
            case UPLOAD_TRANSLATIONS:
                boolean isPushTranslation = commandLine.hasOption(CrowdinCliOptions.TRANSLATION_SHORT);
                if (UPLOAD_TRANSLATIONS.equalsIgnoreCase(resultCmd) || isPushTranslation) {
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
        InputStream is = Commands.class.getResourceAsStream("/crowdin.yml");
        Path destination = Paths.get(skeleton.toURI());
        System.out.print(RESOURCE_BUNDLE.getString("command_generate_description") + " '" + destination + "'- ");
        try {
            Files.copy(is, destination);
            System.out.println(OK);
        } catch (FileAlreadyExistsException ex) {
            System.out.println(SKIPPED);
            System.out.println("File '" + destination + "' already exists.");
            if (this.isDebug) {
                ex.printStackTrace();
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
                    .createBranch(Long.toString(this.projectInfo.getProject().getId()), new BranchPayload(name))
                    .execute();
            Branch branch = ResponseUtil.getResponceBody(createBranchResponse, new TypeReference<SimpleResponse<Branch>>() {
            }).getEntity();
            if (this.isVerbose) {
                System.out.println(createBranchResponse.getHeaders());
                System.out.println(ResponseUtil.getResponceBody(createBranchResponse));
            }

            System.out.println(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "' - OK");
            return branch;
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "' - ERROR");
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
            List<String> sources = this.commandUtils.getSourcesWithoutIgnores(file, this.propertiesBean);
            if (!sources.isEmpty()) {
                noFiles = false;
            }
            String commonPath = "";
            if (!preserveHierarchy) {
                commonPath = this.commandUtils.getCommonPath(sources, this.propertiesBean);
            }

            for (String source : sources) {
                File sourceFile = new File(source);
                if (!sourceFile.isFile()) {
                    continue;
                }
                boolean isDest = file.getDest() != null && !file.getDest().isEmpty() && !this.commandUtils.isSourceContainsPattern(file.getSource());
                Pair<String, Long> preservePathToParentId = this.commandUtils.preserveHierarchy(file, sourceFile.getAbsolutePath(), commonPath, this.propertiesBean, this.branch, this.settings, projectInfo.getProject().getId(), this.isVerbose);
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


                /*
                //todo discus about that
                //param branch is name of branch
                filePayload.setBranchId(branchId);
                if (this.branch != null && !this.branch.isEmpty()) {
                    parameters.branch(this.branch);
                }*/
                /*
                if (sourceFile.getAbsoluteFile().isFile()) {
                    parameters.files(sourceFile.getAbsolutePath());
                }*/


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
                        //todo discus about that ?preservePath
                        GeneralFileExportOptions generalFileExportOptions = new GeneralFileExportOptions();
                        generalFileExportOptions.setExportPattern(translationWithReplacedAsterisk);
                        exportOptions = generalFileExportOptions;
                    } else {
                        String pattern = file.getTranslation();
                        if (pattern != null && pattern.contains("\\")) {
                            pattern = pattern.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                            pattern = pattern.replaceAll("/+", "/");
                        }

                        //todo discus about that ?preservePath
                        GeneralFileExportOptions generalFileExportOptions = new GeneralFileExportOptions();
                        generalFileExportOptions.setExportPattern(pattern);
                        exportOptions = generalFileExportOptions;
                    }
                }

                filePayload.setExportOptions(exportOptions);

               /* String outPath;
                if (this.branch != null && !this.branch.isEmpty()) {
                    outPath = this.branch + "/" + preservePath;
                    outPath = outPath.replaceAll("/+", "/");
                    outPath = outPath.replaceAll("\\+", "\\");
                } else {
                    outPath = preservePath;
                }*/
                System.out.println(RESOURCE_BUNDLE.getString("uploading_file") + " '" + preservePath + "'");
//                if (autoUpdate) {
                Response response;
                try {
                    spinner.start();
//
                    Long storageId = createStorage(sourceFile);
                    filePayload.setStorageId(storageId);
                    filePayload.setName(preservePath);

                    response = new FilesApi(settings)
                            .createFile(this.projectInfo.getProject().getId().toString(), filePayload)
                            .execute();

                    spinner.stop();
                } catch (Exception e) {
                    spinner.stop();
                    System.out.println(" - ERROR");
                    System.out.println("message : " + e.getMessage());
                    if (this.isDebug) {
                        e.printStackTrace();
                    }
                    continue;
                }
                if (this.isVerbose) {
                    System.out.println(response.getHeaders());
                    System.out.println(ResponseUtil.getResponceBody(response));
                }
                //todo discus about ?autoUpdate
                    /*if (result != null && !result.getBoolean(RESPONSE_SUCCESS)) {
                        if (result.getJSONObject(RESPONSE_ERROR) != null && result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE) == 5) {
                            try {
                                clientResponse = crwdn.updateFile(settings, parameters);
                                spinner.stop();
                            } catch (Exception e) {
                                System.out.println(" - ERROR");
                                System.out.println("code : " + result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE));
                                System.out.println("message : " + result.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE));
                                if (this.isDebug) {
                                    e.printStackTrace();
                                }
                                continue;
                            }
                            result = parser.parseJson(clientResponse.getEntity(String.class));
                            if (this.isVerbose) {
                                System.out.println(clientResponse.getHeaders());
                                System.out.println(result);
                            }
                        }
                    }*/
                /*}*/ /*else {
                    ClientResponse clientResponse;
                    try {
                        clientResponse = crwdn.addFile(settings, parameters);
                        spinner.stop();
                    } catch (Exception e) {
                        System.out.println(" - ERROR");
                        System.out.println("code : " + result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE));
                        System.out.println("message : " + result.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE));
                        if (this.isDebug) {
                            e.printStackTrace();
                        }
                        continue;
                    }
                    result = parser.parseJson(clientResponse.getEntity(String.class));
                    if (this.isVerbose) {
                        System.out.println(clientResponse.getHeaders());
                        System.out.println(result);
                    }
                }
                if (result != null && result.getBoolean(RESPONSE_SUCCESS)) {
                    if (result.has("files") && result.getJSONObject("files") != null) {
                        if (this.branch != null && !this.branch.isEmpty()) {
                            preservePath = this.branch + "/" + preservePath;
                        }
                        if (result.getJSONObject("files").has(preservePath) && "updated".equals(result.getJSONObject("files").getString(preservePath))) {
                            System.out.println(" - OK");
                        } else {
                            System.out.println(" - SKIPPED");
                        }git pu
                    } else if (result.has("stats")) {
                        System.out.println(" - OK");
                    } else if (result.getJSONObject("notes") != null && result.getJSONObject("notes").getJSONArray("files") != null) {
                        System.out.println(" - OK");
                    } else {
                        System.out.println(" - SKIPPED");
                    }
                } else if (result != null && !result.getBoolean(RESPONSE_SUCCESS) && result.getJSONObject(RESPONSE_ERROR) != null && result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE) == 5) {
                    System.out.println(" - SKIPPED");
                } else if (result != null && !result.getBoolean(RESPONSE_SUCCESS)) {
                    System.out.println(" - ERROR");
                    System.out.println("code : " + result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE));
                    System.out.println("message : " + result.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE));
                }*/
            }
        }
        if (noFiles) {
            System.out.println("Error: No source files to upload.\n" +
                    "Check your configuration file to ensure that they contain valid directives.");
            ConsoleUtils.exitError();
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


    public void uploadTranslation(boolean importDuplicates, boolean importEqSuggestions, boolean autoApproveImported) {
        String projectId = projectInfo.getProject().getId().toString();
        List<FileBean> files = propertiesBean.getFiles();
        List<FileEntity> projectFiles = PaginationUtil.unpaged(new FilesApi(settings).getProjectFiles(projectId, Pageable.unpaged()));


        for (FileBean file : files) {
            for (Language languageEntity : projectInfo.getSupportedLanguages()) {
                String lng = (this.language == null || this.language.isEmpty()) ? languageEntity.getCode() : this.language;
                List<String> sourcesWithoutIgnores = commandUtils.getSourcesWithoutIgnores(file, propertiesBean);
                for (String sourcesWithoutIgnore : sourcesWithoutIgnores) {
                    File sourcesWithoutIgnoreFile = new File(sourcesWithoutIgnore);
                    List<String> translations = commandUtils.getTranslations(lng, sourcesWithoutIgnore, file, this.projectInfo, propertiesBean, "translations");
                    Map<String, String> mapping = commandUtils.doLanguagesMapping(projectInfo, propertiesBean, languageEntity.getCrowdinCode());
                    List<File> translationFiles = new ArrayList<>();

                    String commonPath = "";
                    if (!propertiesBean.getPreserveHierarchy()) {
                        String[] common = new String[sourcesWithoutIgnores.size()];
                        common = sourcesWithoutIgnores.toArray(common);
                        commonPath = Utils.commonPath(common);
                        commonPath = Utils.replaceBasePath(commonPath, propertiesBean);
                    }
                    commonPath = (commonPath == null) ? "" : commonPath;
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
                        if (!propertiesBean.getPreserveHierarchy()) {
                            if (Utils.isWindows()) {
                                if (translationSrc.contains("\\")) {
                                    translationSrc = translationSrc.replaceAll("\\\\", "/");
                                    translationSrc = translationSrc.replaceAll("/+", "/");
                                }
                                if (commonPath.contains("\\")) {
                                    commonPath = commonPath.replaceAll("\\\\", "/");
                                    commonPath = commonPath.replaceAll("/+", "/");
                                }
                            }
                            if (translationSrc.startsWith(commonPath)) {
                                translationSrc = translationSrc.replaceFirst(commonPath, "");
                            }
                            if (Utils.isWindows() && translationSrc.contains("/")) {
                                translationSrc = translationSrc.replaceAll("/", Utils.PATH_SEPARATOR_REGEX);
                            }

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

                        //todo discus about that
                           /* if (file.getUpdateOption() != null) {
                                parameters.updateOption(file.getUpdateOption());
                            }*/


                        try {
                            System.out.println("Uploading translation file '" + Utils.replaceBasePath(translationFile.getAbsolutePath(), propertiesBean) + "'");
                            spinner.start();

                            TranslationsApi api = new TranslationsApi(settings);
                            TranslationPayload translationPayload = new TranslationPayload();
                            String translationSrcFinal = translationSrc;

                            Optional<FileEntity> projectFileOrNone = EntityUtil.find(o -> o.getName().equalsIgnoreCase(translationSrcFinal), projectFiles);
                            if (!projectFileOrNone.isPresent()) {
                                spinner.stop();
                                System.out.println(" - failed");
                                System.out.println("source '" + translationSrcFinal + "' does not exist in the project");
                                ConsoleUtils.exitError();

                            }
                            FileEntity projectFile = projectFileOrNone.get();


                            translationPayload.setFileId(projectFile.getId());

                            if (importDuplicates) translationPayload.setImportDuplicates(true);
                            if (importEqSuggestions) translationPayload.setImportEqSuggestions(true);
                            if (autoApproveImported) translationPayload.setAutoApproveImported(true);

                            Long storageId = createStorage(translationFile);
                            translationPayload.setStorageId(storageId);

                            Response uploadTransactionsResponse = api
                                    .uploadTranslation(projectId, Long.toString(languageEntity.getId()), translationPayload)
                                    .execute();

                            spinner.stop();
                            if (isVerbose) {
                                System.out.println(uploadTransactionsResponse.getHeaders());
                                System.out.println(ResponseUtil.getResponceBody(uploadTransactionsResponse));
                            }
                        } catch (Exception e) {
                            spinner.stop();
                            System.out.println(" - failed");
                            System.out.println("message : " + e.getMessage());
                            if (isDebug) {
                                e.printStackTrace();
                            }
                        }
                    }
                }
            }
        }

    }

    private Optional<Long> getOrCreateBranchId() {
        if (this.branch == null || this.branch.isEmpty()) return Optional.empty();

        Optional<Long> existBranch = new BranchClient(this.settings).getProjectBranchByName(this.projectInfo.getProject().getId(), branch)
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


//    public void initCli() {
//        if (settings == null) {
//            System.out.println(RESOURCE_BUNDLE.getString("wrong_connection"));
//            ConsoleUtils.exitError();
//        }
//        if (Strings.isEmpty(settings.getApiKey())) {
//            if (Strings.isEmpty(settings.getApiKey())) {
//                System.out.println("Api key is empty");
//            }
//            /*if (settings.getBaseUrl() == null || settings.getBaseUrl().isEmpty()) {
//                System.out.println("Base url is empty");
//            }*/
//            ConsoleUtils.exitError();
//        }
        /*CrowdinApiClient crwdn = new Crwdn();
        JSONObject result = null;
        Parser parser = new Parser();
        String cliVersion = Utils.getAppVersion();
        CrowdinApiParametersBuilder crowdinApiParametersBuilder = new CrowdinApiParametersBuilder();
        crowdinApiParametersBuilder.json()
                .version(cliVersion)
                .headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
        ClientResponse clientResponse;
        try {
            clientResponse = crwdn.init(settings, crowdinApiParametersBuilder);
            result = parser.parseJson(clientResponse.getEntity(String.class));
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("initialisation_failed"));
            if (isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }
        if (result == null) {
            System.out.println(RESOURCE_BUNDLE.getString("initialisation_failed"));
            ConsoleUtils.exitError();
        }
        if (result.has(RESPONSE_SUCCESS)) {
            Boolean responseStatus = result.getBoolean(RESPONSE_SUCCESS);
            if (responseStatus) {
                if (result.has(RESPONSE_MESSAGE)) {
                    String message = result.getString(RESPONSE_MESSAGE);
                    if (message != null) {
                        System.out.println(message);
                    }
                }
            } else {
                if (result.has(RESPONSE_ERROR)) {
                    JSONObject error = result.getJSONObject(RESPONSE_ERROR);
                    if (error == null) {
                        System.out.println("Initialization failed");
                        ConsoleUtils.exitError();
                    }
                    if (error.has(RESPONSE_CODE)) {
                        if ("0".equals(error.get(RESPONSE_CODE).toString())) {
                            if (error.has(RESPONSE_MESSAGE)) {
                                String message = error.getString(RESPONSE_MESSAGE);
                                if (message != null) {
                                    System.out.println(message);
                                    ConsoleUtils.exitError();
                                }
                            }
                        }
                    }
                }
            }
            */
       /* } else {
            System.out.println(RESOURCE_BUNDLE.getString("initialisation_failed"));
            ConsoleUtils.exitError();
        }*/
//    }

    private void download(String lang, boolean ignoreMatch) {

        String languageCode = Optional.ofNullable(language).orElse(lang);
        Optional<Language> languageOrNull = EntityUtil.find(ProjectWrapper.byCrowdinCode(languageCode), this.projectInfo.getProjectLanguages());

        if (!languageOrNull.isPresent()) {
            System.out.println(" - error");
            System.out.println("language '" + languageCode + "' does not exist in the project");
            ConsoleUtils.exitError();
        }
        TranslationsApi api = new TranslationsApi(this.settings);
        Language languageEntity = languageOrNull.get();

        Long projectId = this.projectInfo.getProject().getId();
        Optional<Branch> branchOrNull = Optional.ofNullable(this.branch)
                .flatMap(branchName -> new BranchClient(this.settings).getProjectBranchByName(projectId, branchName));


        System.out.println(RESOURCE_BUNDLE.getString("build_archive") + " for '" + languageCode + "'");
        Response clientResponse = null;
        Translation translationBuild = null;
        try {
            BuildTranslationPayload buildTranslation = new BuildTranslationPayload();
            branchOrNull.map(Branch::getId).ifPresent(buildTranslation::setBranchId);
            buildTranslation.setExportApprovedOnly(true);
            buildTranslation.setForce(true);
            buildTranslation.setExportTranslatedOnly(true);

            buildTranslation.setTargetLanguagesId(Collections.singletonList(languageEntity.getId()));
            spinner.start();
            clientResponse = api.buildTranslation(Long.toString(projectId), buildTranslation).execute();
            translationBuild = ResponseUtil.getResponceBody(clientResponse, new TypeReference<SimpleResponse<Translation>>() {
            }).getEntity();
            while (!translationBuild.getStatus().equalsIgnoreCase("finished")) {
                Thread.sleep(100);
                translationBuild = api.getTranslationInfo(projectId.toString(), translationBuild.getId().toString()).getResponseEntity().getEntity();
            }

            spinner.stop();
        } catch (Exception e) {
            System.out.println(" - error");
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


        /*result = parser.parseJson(clientResponse.getEntity(String.class));
        if (result != null) {
            if (result.get(RESPONSE_SUCCESS) instanceof JSONObject) {
                if ("built".equals(result.getJSONObject(RESPONSE_SUCCESS).getString(RESPONSE_STATUS))) {
                    System.out.println(" - OK");
                } else if ("skipped".equals(result.getJSONObject(RESPONSE_SUCCESS).getString(RESPONSE_STATUS))) {
                    System.out.println(" - skipped");
                    System.out.println(RESOURCE_BUNDLE.getString("export_skipped"));
                }
            } else if (!result.getBoolean(RESPONSE_SUCCESS)) {
                if (result.getJSONObject(RESPONSE_ERROR) != null && result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE) == 10
                        && "Language was not found".equals(result.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE))) {
                    System.out.println(" - error");
                    System.out.println("language '" + projectLanguage + "' does not exist in the project");
                } else if (result.getJSONObject(RESPONSE_ERROR) != null && result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE) == 17
                        && "Specified directory was not found".equals(result.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE))) {
                    System.out.println("error");
                    System.out.println("branch '" + branch + "' does not exist in the project");
                }
                ConsoleUtils.exitError();
            }
        }*/

//        if (result != null && result.get(RESPONSE_SUCCESS) instanceof JSONObject) {
        String fileName = languageCode + ".zip";

//        if (languageEntity != null) {
//            crowdinApiParametersBuilder.downloadPackage(projectLanguage);
//            fileName = languageCode + ".zip";
//        } else {
//            crowdinApiParametersBuilder.downloadPackage("all");
//            fileName = "all.zip";
//        }
        List<Translation> projectTranslations = PaginationUtil.unpaged(api.getTranslations(projectId.toString(), Pageable.unpaged()));

        Optional<Translation> translationEntityOrNull = EntityUtil.find(translation ->
                branchOrNull.map(branchEntity -> branchEntity.getId().equals(translation.getBranchId())).orElse(true)
                        || languageEntity.getId().equals(translation.getLanguageId()), projectTranslations);
        if (!translationEntityOrNull.isPresent()) {
            System.out.println(" - error");
            System.out.println("translation for language '" + languageCode + "' and branch '" + branch + "' does not exist in the project");
            ConsoleUtils.exitError();
        }
        Translation translationEntity = translationEntityOrNull.get();


//        if (this.branch != null) {
//            crowdinApiParametersBuilder.branch(this.branch);
//        }
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
//        crowdinApiParametersBuilder.destinationFolder(basePath);

        File downloadedZipArchive = new File(downloadedZipArchivePath);

        try {
            spinner.start();
            Response fileRawResponse = api.getTranslationRaw(Long.toString(projectId), Long.toString(translationEntity.getId())).execute();
            FileRaw fileRaw = ResponseUtil.getResponceBody(fileRawResponse, new TypeReference<SimpleResponse<FileRaw>>() {
            }).getEntity();
//        clientResponse = crwdn.downloadTranslations(settings, translationEntity.getId());
            InputStream download = CrowdinHttpClient.download(fileRaw.getUrl());

            FileUtil.writeToFile(download, downloadedZipArchivePath);
            spinner.stop();
            if (isVerbose) {
                System.out.println(fileRawResponse.getHeaders());
                System.out.println(ObjectMapperUtil.getEntityAsString(fileRaw));
            }
        } catch (IOException e) {
            System.out.println(RESOURCE_BUNDLE.getString(ERROR_DURING_FILE_WRITE));
            if (isDebug) {
                e.printStackTrace();
            }
        } catch (Exception e) {
            System.out.println(" - error");
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
            Map<String, String> mapping = commandUtils.doLanguagesMapping(projectInfo, propertiesBean, lang);
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
            List<Language> projectLanguages = projectInfo.getProjectLanguages();
            for (Language projectLanguage : projectLanguages) {
                if (projectLanguage != null && projectLanguage.getCode() != null) {
//                    JSONObject languageInfo = commandUtils.getLanguageInfo(projectLanguage.getName(), supportedLanguages);
                    String crowdinCode = projectLanguage.getCrowdinCode();
                    this.download(crowdinCode, ignoreMatch);
                }
            }
        }
    }

    public List<String> list(String subcommand, String command) {
        List<String> result = new ArrayList<>();
        if (subcommand != null && !subcommand.isEmpty()) {
            switch (subcommand) {
                case PROJECT: {
                    List<String> files = commandUtils.projectList(projectInfo.getFiles(), projectInfo.getDirectories());
                    if (branch != null) {
                        for (String file : files) {
                            if (file.startsWith(branch) || file.startsWith("/" + branch)) {
                                result.add(Utils.PATH_SEPARATOR + file);
                            }
                        }
                    } else {
                        result = files;
                    }
                    break;
                }
                case SOURCES: {
                    List<FileBean> files = propertiesBean.getFiles();
                    for (FileBean file : files) {
                        result.addAll(commandUtils.getSourcesWithoutIgnores(file, propertiesBean));
                    }
                    break;
                }
                case TRANSLATIONS: {
                    List<FileBean> files = propertiesBean.getFiles();
                    for (FileBean file : files) {
                        List<String> translations = commandUtils.getTranslations(null, null, file, this.projectInfo, propertiesBean, command);
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
        List<Language> projectLanguages = projectInfo.getProjectLanguages();
        Map<String, String> mappingTranslations = new HashMap<>();
        for (Language projectLanguage : projectLanguages) {
            if (projectLanguage != null && projectLanguage.getCode() != null) {
//                JSONObject languageInfo = commandUtils.getLanguageInfo(projectLanguage.getName(), supportedLanguages);
                String crowdinCode = projectLanguage.getCrowdinCode();
                mappingTranslations.putAll(commandUtils.doLanguagesMapping(projectInfo, propertiesBean, crowdinCode));
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

            if (propertiesBean == null || propertiesBean.getProjectIdentifier() == null) {
                if (propertiesBeanIdentity == null || propertiesBeanIdentity.getProjectIdentifier() == null) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_project_identifier"));
                    ConsoleUtils.exitError();
                }
            }

            if (propertiesBean == null || propertiesBean.getApiKey() == null) {
                if (propertiesBeanIdentity == null || propertiesBeanIdentity.getApiKey() == null) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_api_key"));
                    ConsoleUtils.exitError();
                }
            }

            if (propertiesBean == null || propertiesBean.getLogin() == null) {
                if (propertiesBeanIdentity == null || propertiesBeanIdentity.getLogin() == null) {
                    System.out.println(RESOURCE_BUNDLE.getString(MISSING_LOGIN));
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
                System.out.println(RESOURCE_BUNDLE.getString(MISSING_PROPERTY_BEAN));
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