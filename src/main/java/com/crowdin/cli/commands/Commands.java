package com.crowdin.cli.commands;

import com.crowdin.Credentials;
import com.crowdin.Crwdn;
import com.crowdin.cli.BaseCli;
import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.*;
import com.crowdin.cli.utils.FileReader;
import com.crowdin.cli.utils.tree.DrawTree;
import com.crowdin.client.CrowdinApiClient;
import com.crowdin.parameters.CrowdinApiParametersBuilder;
import com.sun.jersey.api.client.ClientResponse;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.*;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.util.*;

/**
 * @author ihor
 */
public class Commands extends BaseCli {

    private String branch = null;

    private HashMap<String, Object> cliConfig = new HashMap<>();

    private CrowdinCliOptions cliOptions = new CrowdinCliOptions();

    private CliProperties cliProperties = new CliProperties();

    private File configFile = null;

    private Credentials credentials = null;

    private CommandUtils commandUtils = new CommandUtils();

    private boolean dryrun = false;

    private FileReader fileReader = new FileReader();

    private boolean help = false;

    private File identity = null;

    private HashMap<String, Object> identityCliConfig = null;

    private boolean isDebug = false;

    private boolean isVerbose = false;

    private String language = null;

    private JSONObject projectInfo = null;

    private PropertiesBean propertiesBean = new PropertiesBean();

    private ConsoleSpinner spin = new ConsoleSpinner();

    private JSONArray supportedLanguages = null;

    private boolean version = false;

    private void initialize(String resultCmd, CommandLine commandLine) {

        if (!resultCmd.startsWith(HELP)
                && !GENERATE.equals(resultCmd)
                && !"".equals(resultCmd)
                && !commandLine.hasOption(CrowdinCliOptions.HELP_LONG)
                && !commandLine.hasOption(CrowdinCliOptions.HELP_SHORT)) {

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
                        System.exit(0);
                    }
                } else {
                    System.out.println("Configuration file '" + this.configFile.getAbsolutePath() + "' does not exist");
                    System.exit(0);
                }
                if (this.cliConfig != null) {
                    try {
                        this.propertiesBean = this.cliProperties.loadProperties(this.cliConfig);
                    } catch (Exception e) {
                        System.out.println(RESOURCE_BUNDLE.getString("load_properties_error"));
                        if (this.isDebug) {
                            e.printStackTrace();
                        }
                        System.exit(0);
                    }
                } else {
                    System.out.println("Configuration file '" + this.configFile.getAbsolutePath() + "' does not exist");
                    System.exit(0);
                }
                if (this.identity != null && this.identity.isFile()) {
                    this.propertiesBean = this.readIdentityProperties(this.propertiesBean);
                }
            }
            this.propertiesBean.setBaseUrl(commandUtils.getBaseUrl(this.propertiesBean));
            this.credentials = new Credentials(this.propertiesBean.getBaseUrl(), this.propertiesBean.getProjectIdentifier(), this.propertiesBean.getApiKey(), this.propertiesBean.getAccountKey(), Utils.getUserAgent());
            this.initCli();
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
            this.projectInfo = this.commandUtils.projectInfo(this.credentials, this.isVerbose, this.isDebug);
            if (this.isVerbose) {
                System.out.println(this.projectInfo);
            }
            this.supportedLanguages = this.commandUtils.getSupportedLanguages(this.credentials, this.isVerbose, this.isDebug);
            if (this.isVerbose) {
                System.out.println(this.supportedLanguages);
            }
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
            System.exit(0);
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
            System.exit(0);
        }
        if (resultCmd == null) {
            System.out.println(RESOURCE_BUNDLE.getString("command_not_found"));
            System.exit(0);
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
            case UPLOAD :
            case UPLOAD_SOURCES :
            case PUSH:
            case UPLOAD_TRANSLATIONS :
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
            case LIST :
                this.cliOptions.cmdListOptions();
                break;
            case LIST_PROJECT :
                if (this.help) {
                    this.cliOptions.cmdListProjectOptions();
                } else {
                    this.dryrunProject(commandLine);
                }
                break;
            case LIST_SOURCES :
                if (this.help) {
                    this.cliOptions.cmdListSourcesOptions();
                } else {
                    this.dryrunSources(commandLine);
                }
                break;
            case LIST_TRANSLATIONS :
                if (this.help) {
                    this.cliOptions.cmdListTranslationsIOptions();
                } else {
                    this.dryrunTranslation(commandLine);
                }
                break;
            case LINT :
                if (this.help) {
                    this.cliOptions.cmdLintOptions();
                } else {
                    this.lint();
                }
                break;
            case GENERATE :
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
            case HELP :
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
            case HELP_HELP :
                this.cliOptions.cmdHelpOptions();
                break;
            case HELP_UPLOAD :
            case HELP_UPLOAD_SOURCES :
            case HELP_UPLOAD_TRANSLATIONS :
            case HELP_DOWNLOAD :
            case HELP_GENERATE :
            case HELP_LIST :
            case HELP_LIST_PROJECT :
            case HELP_LIST_SOURCES :
            case HELP_LIST_TRANSLATIONS :
            case HELP_LINT :
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
                    if (!"".equalsIgnoreCase(wrongArgs.toString().trim())){
                        System.out.println("Command '" + wrongArgs.toString().trim() + "' not found");
                    }
                    this.cliOptions.cmdGeneralOptions();
                }
                break;
        }
    }

    /*
    *
    * Command 'crowdin generate'
    *
    */
    public void generate(String path) {
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

    private void createBranch(String name) {
        CrowdinApiClient crwdn = new Crwdn();
        Parser parser = new Parser();
        CrowdinApiParametersBuilder crowdinApiParametersBuilder = new CrowdinApiParametersBuilder();
        crowdinApiParametersBuilder.json()
                .name(name)
                .isBranch(true)
                .headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
        ClientResponse clientResponse = null;
        try {
            clientResponse = crwdn.addDirectory(this.credentials, crowdinApiParametersBuilder);
        } catch (Exception e) {
            System.out.println("Error: creating branch '" + name + "' failed");
            if (this.isDebug) {
                e.printStackTrace();
            }
            System.exit(0);
        }
        JSONObject branch = parser.parseJson(clientResponse.getEntity(String.class));
        if (this.isVerbose) {
            System.out.println(clientResponse.getHeaders());
            System.out.println(branch);
        }
        if (branch != null && branch.getBoolean(RESPONSE_SUCCESS)) {
            System.out.println(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "' - OK");
        } else if (branch != null && !branch.getBoolean(RESPONSE_SUCCESS) && branch.getJSONObject(RESPONSE_ERROR) != null && branch.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE) == 50
                && "Directory with such name already exists".equals(branch.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE))) {
            System.out.println(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "' - SKIPPED");
        } else {
            System.out.println(RESOURCE_BUNDLE.getString("creating_branch") + " '" + name + "' - ERROR");
            if (branch != null && branch.getJSONObject(RESPONSE_ERROR) != null && branch.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE) != null) {
                System.out.println(branch.getJSONObject(RESPONSE_ERROR).getString(RESPONSE_MESSAGE));
            }
            System.exit(0);
        }
    }

    /*
    *
    * Command 'crowdin upload sources'
    *
    */
    public JSONObject uploadSources(boolean autoUpdate) {
        CrowdinApiClient crwdn = new Crwdn();
        JSONObject result = null;
        Parser parser = new Parser();
        Boolean preserveHierarchy = this.propertiesBean.getPreserveHierarchy();
        List<FileBean> files = this.propertiesBean.getFiles();
        boolean noFiles = true;
        if (this.branch != null) {
            this.createBranch(this.branch);
        }
        for (FileBean file : files) {
            if (file.getSource() == null
                    || file.getSource().isEmpty()
                    || file.getTranslation() == null
                    || file.getTranslation().isEmpty()) {
                continue;
            }
            List<String> sources = this.commandUtils.getSourcesWithoutIgnores(file, this.propertiesBean);
            if (sources != null && sources.size() > 0) {
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
                Boolean isDest = file.getDest() != null && !file.getDest().isEmpty() && !this.commandUtils.isSourceContainsPattern(file.getSource());
                String preservePath = file.getDest();
                preservePath = this.commandUtils.preserveHierarchy(file, sourceFile.getAbsolutePath(), commonPath, this.propertiesBean, this.branch, this.credentials, this.isVerbose);
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
                CrowdinApiParametersBuilder parameters = new CrowdinApiParametersBuilder();
                parameters.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                        .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                        .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                        .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
                preservePath = preservePath.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                if (this.branch != null && !this.branch.isEmpty()) {
                    parameters.branch(this.branch);
                }
                if (sourceFile.getAbsoluteFile().isFile()) {
                    parameters.files(sourceFile.getAbsolutePath());
                }
                if (preservePath != null && !preservePath.isEmpty()) {
                    parameters.titles(preservePath, preservePath);
                }
                if (file.getType() != null && !file.getType().isEmpty()) {
                    parameters.type(file.getType());
                }
                if (file.getFirstLineContainsHeader() != null && file.getFirstLineContainsHeader() == true) {
                    parameters.firstLineContainsHeader();
                }
                if (file.getScheme() != null && !file.getScheme().isEmpty()) {
                    parameters.scheme(file.getScheme());
                }
                if (file.getTranslateContent() != null) {
                    parameters.translateContent(file.getTranslateContent());
                }
                if (file.getTranslateAttributes() != null) {
                    parameters.translateAttributes(file.getTranslateAttributes());
                }
                if (file.getContentSegmentation() != null) {
                    parameters.contentSegmentation(file.getContentSegmentation());
                }
                if (file.getTranslatableElements() != null) {
                    parameters.translatableElements(file.getTranslatableElements());
                }
                if (file.getEscapeQuotes() >= 0) {
                    parameters.escapeQuotes((int) file.getEscapeQuotes());
                }
                if (file.getUpdateOption() != null) {
                    parameters.updateOption(file.getUpdateOption());
                }
                String translationWithReplacedAsterisk = null;
                if (sourceFile.getAbsolutePath() != null && !sourceFile.getAbsolutePath().isEmpty() && file.getTranslation() != null && !file.getTranslation().isEmpty()) {
                    String translations = file.getTranslation();
                    if (translations.contains("**")) {
                        translationWithReplacedAsterisk = this.commandUtils.replaceDoubleAsteriskInTranslation(file.getTranslation(), sourceFile.getAbsolutePath(), file.getSource(), this.propertiesBean);
                    }
                    if (translationWithReplacedAsterisk != null) {
                        if (translationWithReplacedAsterisk.indexOf("\\") != -1) {
                            translationWithReplacedAsterisk = translationWithReplacedAsterisk.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                            translationWithReplacedAsterisk = translationWithReplacedAsterisk.replaceAll("/+", "/");
                        }
                        parameters.exportPatterns(preservePath, translationWithReplacedAsterisk);
                    } else {
                        String pattern = file.getTranslation();
                        if (pattern != null && pattern.indexOf("\\") != -1) {
                            pattern = pattern.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                            pattern = pattern.replaceAll("/+", "/");
                        }
                        parameters.exportPatterns(preservePath, pattern);
                    }
                }
                parameters.json();
                String outPath;
                if (this.branch != null && !this.branch.isEmpty()) {
                    outPath = this.branch + "/" + preservePath;
                    outPath = outPath.replaceAll("/+", "/");
                    outPath = outPath.replaceAll("\\+", "\\");
                } else {
                    outPath = preservePath;
                }
                System.out.print(RESOURCE_BUNDLE.getString("uploading_file") + " '" + outPath + "'");
                Thread spinner = new Thread(new Runnable() {
                    @Override
                    public void run() {
                        while (true) {
                            spin.turn();
                        }
                    }
                });
                spinner.start();
                if (autoUpdate) {
                    ClientResponse clientResponse;
                    try {
                        clientResponse = crwdn.addFile(credentials, parameters);
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
                    if (result != null && !result.getBoolean(RESPONSE_SUCCESS)) {
                        if (result.getJSONObject(RESPONSE_ERROR) != null && result.getJSONObject(RESPONSE_ERROR).getInt(RESPONSE_CODE) == 5) {
                            try {
                                clientResponse = crwdn.updateFile(credentials, parameters);
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
                    }
                } else {
                    ClientResponse clientResponse;
                    try {
                        clientResponse = crwdn.addFile(credentials, parameters);
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
                        }
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
                }
            }
        }
        if (noFiles) {
            System.out.println("Error: No source files to upload.\n" +
                    "Check your configuration file to ensure that they contain valid directives.");
            System.exit(0);
        }
        return result;
    }

    /*
    *
    * Command 'crowdin upload translations'
    *
    */
    public JSONObject uploadTranslation(boolean importDuplicates, boolean importEqSuggestions, boolean autoApproveImported) {
        CrowdinApiClient crwdn = new Crwdn();
        JSONObject result = null;
        Parser parser = new Parser();
        List<FileBean> files = propertiesBean.getFiles();
        boolean isLanguageExist = false;
        for (FileBean file : files) {
            JSONArray projectLanguages = projectInfo.getJSONArray("languages");
            for (Object projectLanguage : projectLanguages) {
                JSONObject languages = parser.parseJson(projectLanguage.toString());
                if (languages != null && languages.getString("code") != null) {
                    JSONObject languageInfo = commandUtils.getLanguageInfo(languages.getString("name"), supportedLanguages);
                    if (language != null && !language.isEmpty() && languageInfo != null && !language.equals(languageInfo.getString("crowdin_code"))) {
                        continue;
                    }
                    isLanguageExist = true;
                    List<String> sourcesWithoutIgnores = commandUtils.getSourcesWithoutIgnores(file, propertiesBean);
                    for (String sourcesWithoutIgnore : sourcesWithoutIgnores) {
                        File sourcesWithoutIgnoreFile = new File(sourcesWithoutIgnore);
                        CrowdinApiParametersBuilder parameters = new CrowdinApiParametersBuilder();
                        parameters.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
                        String lng = (language == null || language.isEmpty()) ? languages.getString("code") : language;
                        List<String> translations = commandUtils.getTranslations(lng, sourcesWithoutIgnore, file, projectInfo, supportedLanguages, propertiesBean, "translations");
                        Map<String,String> mapping = commandUtils.doLanguagesMapping(projectInfo, supportedLanguages, propertiesBean, languageInfo.getString("crowdin_code"));
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
                                translation = translation.replaceAll("\\\\+", "/").replaceAll("  \\+", "/");
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
                            if (branch != null) {
                                parameters.branch(branch);
                            }
                            if (Utils.isWindows()) {
                                translationSrc = translationSrc.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                            }
                            if (translationSrc.startsWith("/")) {
                                translationSrc = translationSrc.replaceFirst("/", "");
                            }
                            Boolean isDest = file.getDest() != null && !file.getDest().isEmpty() && !this.commandUtils.isSourceContainsPattern(file.getSource());
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
                            parameters.files(translationFile.getAbsolutePath());
                            parameters.titles(translationSrc, translationSrc);
                            parameters.language(languages.getString("code"));
                            parameters.importDuplicates(importDuplicates);
                            parameters.importEqSuggestion(importEqSuggestions);
                            parameters.autoApproveImported(autoApproveImported);
                            parameters.json();
                            if (file.getUpdateOption() != null) {
                                parameters.updateOption(file.getUpdateOption());
                            }
                            System.out.print("Uploading translation file '" + Utils.replaceBasePath(translationFile.getAbsolutePath(), propertiesBean) + "'");
                            ClientResponse clientResponse;
                            Thread spinner = new Thread(new Runnable() {
                                @Override
                                public void run() {
                                    while (true) {
                                        spin.turn();
                                    }
                                }
                            });
                            try {
                                spinner.start();
                                clientResponse = crwdn.uploadTranslations(credentials, parameters);
                                spinner.stop();
                            } catch (Exception e) {
                                System.out.println(" - failed");
                                if (isDebug) {
                                    e.printStackTrace();
                                }
                                continue;
                            }
                            result = parser.parseJson(clientResponse.getEntity(String.class));
                            if (result != null && result.getBoolean(RESPONSE_SUCCESS)) {
                                JSONObject jsonObjFiles = result.getJSONObject("files");
                                if (jsonObjFiles != null) {
                                    Iterator<?> keys = jsonObjFiles.keys();
                                    while (keys.hasNext()) {
                                        String key = (String) keys.next();
                                        System.out.println(" - " + jsonObjFiles.getString(key));
                                    }
                                }
                            } else if (result != null && !result.getBoolean(RESPONSE_SUCCESS)) {
                                JSONObject jsonObjError = result.getJSONObject(RESPONSE_ERROR);
                                if (jsonObjError != null && jsonObjError.getInt(RESPONSE_CODE) == 17 && "Specified directory was not found".equals(jsonObjError.getString(RESPONSE_MESSAGE))) {
                                    if (branch != null) {
                                        System.out.println(" error: branch '" + branch + "' does not exist in the project");
                                    } else {
                                        System.out.println(" error: directory does not exist in the project");
                                    }
                                } else {
                                    System.out.println(" error: " + jsonObjError.get("message"));
                                }
                            } else {
                                System.out.println(" - " + result);
                            }
                            if (isVerbose) {
                                System.out.println(clientResponse.getHeaders());
                                System.out.println(result);
                            }
                        }
                    }
                }
            }
        }
        if (!isLanguageExist) {
            System.out.println("Language '" + language + "' does not exist in the project");
        }
        return result;
    }

    public void initCli() {
        if (credentials == null) {
            System.out.println(RESOURCE_BUNDLE.getString("wrong_connection"));
            System.exit(0);
        }
        if (credentials.getProjectIdentifier() == null || credentials.getProjectKey() == null || credentials.getBaseUrl() == null
            ||credentials.getProjectIdentifier().isEmpty() || credentials.getProjectKey().isEmpty() || credentials.getBaseUrl().isEmpty()) {
            if (credentials.getProjectIdentifier() == null || credentials.getProjectIdentifier().isEmpty()) {
                System.out.println("Project identifier is empty");
            }
            if (credentials.getProjectKey() == null || credentials.getProjectKey().isEmpty()) {
                System.out.println("Project key is empty");
            }
            if (credentials.getBaseUrl() == null || credentials.getBaseUrl().isEmpty()) {
                System.out.println("Base url is empty");
            }
            System.exit(0);
        }
        CrowdinApiClient crwdn = new Crwdn();
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
            clientResponse = crwdn.init(credentials,crowdinApiParametersBuilder);
            result = parser.parseJson(clientResponse.getEntity(String.class));
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("initialisation_failed"));
            if (isDebug) {
                e.printStackTrace();
            }
            System.exit(0);
        }
        if (result == null) {
            System.out.println(RESOURCE_BUNDLE.getString("initialisation_failed"));
            System.exit(0);
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
                        System.exit(0);
                    }
                    if (error.has(RESPONSE_CODE)) {
                        if ("0".equals(error.get(RESPONSE_CODE).toString())) {
                            if (error.has(RESPONSE_MESSAGE)) {
                                String message = error.getString(RESPONSE_MESSAGE);
                                if (message != null) {
                                    System.out.println(message);
                                    System.exit(0);
                                }
                            }
                        }
                    }
                }
            }
        } else {
            System.out.println(RESOURCE_BUNDLE.getString("initialisation_failed"));
            System.exit(0);
        }
    }

    private void download(String lang, boolean ignoreMatch) {
        JSONObject result;
        CrowdinApiClient crwdn = new Crwdn();
        Parser parser = new Parser();
        CrowdinApiParametersBuilder crowdinApiParametersBuilder = new CrowdinApiParametersBuilder();
        crowdinApiParametersBuilder.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
        Thread spinner = new Thread(new Runnable() {
            @Override
            public void run() {
                while (true) {
                    spin.turn();
                }
            }
        });
        String projectLanguage;
        if (language != null) {
            projectLanguage = language;
        } else {
            projectLanguage = lang;
        }
        if (branch != null) {
            crowdinApiParametersBuilder.branch(branch);
        }
        if (projectLanguage != null) {
            crowdinApiParametersBuilder.downloadPackage(projectLanguage);
            crowdinApiParametersBuilder.exportLanguage(projectLanguage);
        }
        crowdinApiParametersBuilder.json();
        System.out.print(RESOURCE_BUNDLE.getString("build_archive") + " for '" + projectLanguage + "'");
        ClientResponse clientResponse = null;
        try {
            spinner.start();
            clientResponse = crwdn.exportTranslations(credentials, crowdinApiParametersBuilder);
            spinner.stop();
        } catch (Exception e) {
            System.out.println(" - error");
            if (isDebug) {
                e.printStackTrace();
            }
            System.exit(0);
        }
        result = parser.parseJson(clientResponse.getEntity(String.class));
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
                System.exit(0);
            }
        }
        if (isVerbose) {
            System.out.println(clientResponse.getHeaders());
            System.out.println(result);
        }
        if (result != null && result.get(RESPONSE_SUCCESS) instanceof JSONObject) {
            String fileName;
            crowdinApiParametersBuilder = new CrowdinApiParametersBuilder();
            crowdinApiParametersBuilder.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                    .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                    .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                    .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
            if (projectLanguage != null) {
                crowdinApiParametersBuilder.downloadPackage(projectLanguage);
                fileName = projectLanguage + ".zip";
            } else {
                crowdinApiParametersBuilder.downloadPackage("all");
                fileName = "all.zip";
            }
            if (branch != null) {
                crowdinApiParametersBuilder.branch(branch);
            }
            String basePath = propertiesBean.getBasePath();
            String baseTempDir;
            if (basePath.endsWith(Utils.PATH_SEPARATOR)) {
                baseTempDir = basePath + new Timestamp(System.currentTimeMillis()).getTime();
            } else {
                baseTempDir = basePath + Utils.PATH_SEPARATOR + new Timestamp(System.currentTimeMillis()).getTime();
            }
            crowdinApiParametersBuilder.destinationFolder(basePath);
            try {
                if (Thread.State.TERMINATED.equals(spinner.getState()))  {
                    spinner = new Thread(new Runnable() {
                        @Override
                        public void run() {
                            while (true) {
                                spin.turn();
                            }
                        }
                    });
                }
                spinner.start();
            } catch (IllegalThreadStateException e) {
            }
            clientResponse = crwdn.downloadTranslations(credentials, crowdinApiParametersBuilder);
            try {
                spinner.stop();
            } catch (IllegalThreadStateException e) {
            }
            String downloadResult = clientResponse.getEntity(String.class);
            if (isVerbose) {
                System.out.println(clientResponse.getHeaders());
                System.out.println(downloadResult);
            }
            File downloadedZipArchive;
            if (propertiesBean.getBasePath() != null && !propertiesBean.getBasePath().endsWith(Utils.PATH_SEPARATOR)) {
                downloadedZipArchive = new File(propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + fileName);
            } else {
                downloadedZipArchive = new File(propertiesBean.getBasePath() + fileName);
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
                Map<String, String> mapping = commandUtils.doLanguagesMapping(projectInfo, supportedLanguages, propertiesBean, lang);
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
                commandUtils.extractFiles(downloadedFilesProc, files, baseTempDir, ignoreMatch, downloadedZipArchive, mapping, isDebug, branch, propertiesBean, commonPath);
                commandUtils.renameMappingFiles(mapping, baseTempDir, propertiesBean, commonPath);
                FileUtils.deleteDirectory(new File(baseTempDir));
                downloadedZipArchive.delete();
            } catch (java.util.zip.ZipException e) {
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
    }

    public void downloadTranslation(boolean ignoreMatch) {
        Parser parser = new Parser();
        if (language != null) {
            this.download(language, ignoreMatch);
        } else {
            JSONArray projectLanguages = projectInfo.getJSONArray("languages");
            for (Object projectLanguage : projectLanguages) {
                JSONObject languages = parser.parseJson(projectLanguage.toString());
                if (languages != null && languages.getString("code") != null) {
                    JSONObject languageInfo = commandUtils.getLanguageInfo(languages.getString("name"), supportedLanguages);
                    String crowdinCode = languageInfo.getString("crowdin_code");
                    this.download(crowdinCode, ignoreMatch);
                }
            }
        }
    }

    public List<String> list(String subcommand, String command) {
        List<String> result = new ArrayList<>();
        if (subcommand != null && !subcommand.isEmpty()) {
            if (PROJECT.equals(subcommand)) {
                List<String> files = commandUtils.projectList(projectInfo.getJSONArray("files"), null);
                if (branch != null) {
                    for (String file : files) {
                        if (file.startsWith(branch) || file.startsWith("/" + branch)) {
                            result.add(Utils.PATH_SEPARATOR + file);
                        }
                    }
                } else {
                    result = files;
                }
            } else if (SOURCES.equals(subcommand)) {
                List<FileBean> files = propertiesBean.getFiles();
                for (FileBean file : files) {
                    result.addAll(commandUtils.getSourcesWithoutIgnores(file, propertiesBean));
                }
            } else if (TRANSLATIONS.equals(subcommand)) {
                List<FileBean> files = propertiesBean.getFiles();
                for (FileBean file : files) {
                    result.addAll(commandUtils.getTranslations(null, null, file, projectInfo, supportedLanguages, propertiesBean, command));
                }
            }
        }
        return result;
    }

    public void help(String resultCmd) {
        if (null != resultCmd) {
            if (HELP.equals(resultCmd) || "".equals(resultCmd)) {
                cliOptions.cmdGeneralOptions();
            } else if (HELP_UPLOAD.equals(resultCmd)) {
                cliOptions.cmdUploadOptions();
            } else if (HELP_UPLOAD_SOURCES.equals(resultCmd)) {
                cliOptions.cmdUploadSourcesOptions();
            } else if (HELP_UPLOAD_TRANSLATIONS.equals(resultCmd)) {
                cliOptions.cmdUploadTranslationsOptions();
            } else if (HELP_DOWNLOAD.equals(resultCmd)) {
                cliOptions.cmdDownloadOptions();
            } else if (HELP_LIST.equals(resultCmd)) {
                cliOptions.cmdListOptions();
            } else if (HELP_LINT.equals(resultCmd)) {
                cliOptions.cmdLintOptions();
            } else if (HELP_LIST_PROJECT.equals(resultCmd)) {
                cliOptions.cmdListProjectOptions();
            } else if (HELP_LIST_SOURCES.equals(resultCmd)) {
                cliOptions.cmdListSourcesOptions();
            } else if (HELP_LIST_TRANSLATIONS.equals(resultCmd)) {
                cliOptions.cmdListTranslationsIOptions();
            } else if (HELP_GENERATE.equals(resultCmd)) {
                cliOptions.cmdGenerateOptions();
            }
        }
    }

    private void dryrunSources(CommandLine commandLine) {
        List<String> files = this.list(SOURCES, "sources");
        if (files.size() < 1 ) {
            System.exit(0);
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
                            String preservePath = propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + commonPath + Utils.PATH_SEPARATOR +  f;
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
        List<String> files = new ArrayList<>();
        Set<String> translations = new HashSet<>();
        Parser parser = new Parser();
        JSONArray projectLanguages = projectInfo.getJSONArray("languages");
        Map<String, String> mappingTranslations = new HashMap<>();
        for (Object projectLanguage : projectLanguages) {
            JSONObject languages = parser.parseJson(projectLanguage.toString());
            if (languages != null && languages.getString("code") != null) {
                JSONObject languageInfo = commandUtils.getLanguageInfo(languages.getString("name"), supportedLanguages);
                String crowdinCode = languageInfo.getString("crowdin_code");
                mappingTranslations.putAll(commandUtils.doLanguagesMapping(projectInfo, supportedLanguages, propertiesBean, crowdinCode));
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
        files.addAll(translations);
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
            System.exit(0);
        } else {
            CliProperties cliProperties = new CliProperties();
            PropertiesBean propertiesBean = cliProperties.loadProperties(cliConfig);
            PropertiesBean propertiesBeanIdentity = null;
            if (identityCliConfig != null) {
                propertiesBeanIdentity = cliProperties.loadProperties(identityCliConfig);
            }
            if (propertiesBean == null && propertiesBeanIdentity == null) {
                System.out.println(RESOURCE_BUNDLE.getString("configuration_file_empty"));
                System.exit(0);
            }

            if (propertiesBean == null || (propertiesBean != null && propertiesBean.getProjectIdentifier() == null)) {
                if (propertiesBeanIdentity == null || (propertiesBeanIdentity != null && propertiesBeanIdentity.getProjectIdentifier() == null)) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_project_identifier"));
                    System.exit(0);
                }
            }

            if (propertiesBean == null || (propertiesBean != null && propertiesBean.getApiKey() == null)) {
                if (propertiesBeanIdentity == null || (propertiesBeanIdentity != null && propertiesBeanIdentity.getApiKey() == null)) {
                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_api_key"));
                    System.exit(0);
                }
            }

            if (propertiesBean == null || (propertiesBean != null && propertiesBean.getBaseUrl() == null)) {
                if (propertiesBeanIdentity == null || (propertiesBeanIdentity != null && propertiesBeanIdentity.getBaseUrl() == null)) {
                    String baseUrl = Utils.getBaseUrl();
                    if (baseUrl == null || baseUrl.isEmpty()) {
                        System.out.println(RESOURCE_BUNDLE.getString("missed_base_url"));
                        System.exit(0);
                    }
                }
            }

            String basePath = null;
            if (propertiesBean == null || (propertiesBean != null && propertiesBean.getBasePath() == null)) {
                if (propertiesBeanIdentity == null || (propertiesBeanIdentity != null && propertiesBeanIdentity.getBasePath() == null)) {
                } else {
                    basePath = propertiesBeanIdentity.getBasePath();
                }
            } else {
                basePath = propertiesBean.getBasePath();
            }
            if (basePath != null && !basePath.isEmpty()) {
                File base = new File(basePath);
                if (!base.exists()) {
                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                    System.exit(0);
                }
            }

            if (propertiesBean.getFiles() == null) {
                System.out.println(RESOURCE_BUNDLE.getString("error_missed_section_files"));
                System.exit(0);
            } else if (propertiesBean.getFiles().isEmpty()) {
                System.out.println(RESOURCE_BUNDLE.getString("empty_section_file"));
                System.exit(0);
            } else {
                for (FileBean fileBean : propertiesBean.getFiles()) {
                    if (fileBean.getSource() == null || fileBean.getSource().isEmpty()) {
                        System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_source_or_translation"));
                        System.exit(0);
                    }
                    if (fileBean.getTranslation() == null || fileBean.getTranslation().isEmpty()) {
                        System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_source_or_translation"));
                        System.exit(0);
                    }
                }
            }
        }
        System.out.println(RESOURCE_BUNDLE.getString("configuration_ok"));
    }
}