package com.crowdin.cli;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;

import javax.ws.rs.core.HttpHeaders;
import java.util.ResourceBundle;

/**
 * Created by ihor on 12/1/16.
 */
public class BaseCli {

    protected static final String FILE_NAME_IDENTITY_CROWDIN_YAML = ".crowdin.yaml";

    protected static final String FILE_NAME_IDENTITY_CROWDIN_YML = ".crowdin.yml";

    protected static final String OPTION_NAME_IDENTITY = "identity";

    protected static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    protected static final String STRING_PLUS = "+";

    protected static final String HEADER_ACCEPT = HttpHeaders.ACCEPT;

    protected static final String HEADER_ACCAEPT_VALUE = "application/json";

    protected static final String HEADER_CLI_VERSION = "X-CLI-VERSION";

    protected static final String HEADER_CLI_VERSION_VALUE = Utils.getAppVersion();

    protected static final String HEADER_JAVA_VERSION = "X-JAVA-VERSION";

    protected static final String HEADER_JAVA_VERSION_VALUE = System.getProperty("java.version");

    protected static final String HEADER_USER_AGENT = HttpHeaders.USER_AGENT;

    protected static final String HEADER_USER_AGENT_VALUE = Utils.getUserAgent();

    protected static final String COMMAND_BRANCH_LONG = "branch";

    protected static final String COMMAND_BRANCH_SHORT = "b";

    protected static final String COMMAND_LANGUAGE_LONG = "language";

    protected static final String COMMAND_LANGUAGE_SHORT = "l";

    protected static final String COMMAND_NO_AUTO_UPDATE = "no-auto-update";

    protected static final String PLACEHOLDER_ANDROID_CODE = "%android_code%";

    protected static final String PLACEHOLDER_FILE_EXTENTION = "%file_extension%";

    protected static final String PLACEHOLDER_FILE_NAME = "%file_name%";

    protected static final String PLACEHOLDER_LANGUAGE = "%language%";

    protected static final String PLACEHOLDER_LOCALE = "%locale%";

    protected static final String PLACEHOLDER_LOCALE_WITH_UNDERSCORE = "%locale_with_underscore%";

    protected static final String PLACEHOLDER_THREE_LETTERS_CODE = "%three_letters_code%";

    protected static final String PLACEHOLDER_TWO_LETTERS_CODE = "%two_letters_code%";

    protected static final String PLACEHOLDER_OSX_CODE = "%osx_code%";

    protected static final String PLACEHOLDER_OSX_LOCALE = "%osx_locale%";

    protected static final String PLACEHOLDER_ORIGINAL_FILE_NAME = "%original_file_name%";

    protected static final String PLACEHOLDER_ORIGINAL_PATH = "%original_path%";

    protected static final String IGNORE_MATCH = "ignore-match";

    protected static final String COMMAND_TREE = "tree";

    protected static final String DESTINATION_LONG = "destination";

    protected static final String DESTINATION_SHORT = "d";

    protected static final String DOWNLOAD = "download";

    protected static final String DOWNLOAD_TRANSLATIONS = "download translations";

    protected static final String GENERATE = "generate";

    protected static final String HELP = "help";

    protected static final String HELP_P = "p";

    protected static final String HELP_SHORT = "h";

    protected static final String HELP_UPLOAD = "help upload";

    protected static final String HELP_UPLOAD_SOURCES = "help upload sources";

    protected static final String HELP_UPLOAD_TRANSLATIONS = "help upload translations";

    protected static final String HELP_DOWNLOAD = "help download";

    protected static final String HELP_GENERATE = "help generate";

    protected static final String HELP_LIST = "help list";

    protected static final String HELP_LIST_PROJECT = "help list project";

    protected static final String HELP_LIST_SOURCES = "help list sources";

    protected static final String HELP_LIST_TRANSLATIONS = "help list translations";

    protected static final String HELP_HELP = "help help";

    protected static final String HELP_LINT = "help lint";

    protected static final String LINT = "lint";

    protected static final String LIST = "list";

    protected static final String LIST_PROJECT = "list project";

    protected static final String LIST_SOURCES = "list sources";

    protected static final String LIST_TRANSLATIONS = "list translations";

    protected static final String RESPONSE_CODE = "code";

    protected static final String RESPONSE_ERROR = "error";

    protected static final String RESPONSE_MESSAGE = "message";

    protected static final String RESPONSE_STATUS = "status";

    protected static final String RESPONSE_SUCCESS = "success";

    protected static final String UPLOAD = "upload";

    protected static final String UPLOAD_SOURCES = "upload sources";

    protected static final String UPLOAD_TRANSLATIONS = "upload translations";

    protected static final String SOURCES = "sources";

    protected static final String TRANSLATIONS = "translations";

    protected static final String PROJECT = "project";

    protected static final String OK = "OK";

    protected static final String SKIPPED = "SKIPPED";

    public static final String PULL = "pull";

    public static final String PUSH = "push";

}
