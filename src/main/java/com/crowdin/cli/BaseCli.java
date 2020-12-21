package com.crowdin.cli;

import com.crowdin.cli.utils.Utils;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * Created by ihor on 12/1/16.
 */
public class BaseCli {

    public static final List<String> DEFAULT_CONFIGS = Collections.unmodifiableList(Arrays.asList("crowdin.yml", "crowdin.yaml"));

    public static final String DEFAULT_GLOSSARY_NAME = "Created in Crowdin CLI (%s)";
    public static final String DEFAULT_TM_NAME = "Created in Crowdin CLI (%s)";

    public static final String ALL = "ALL";

    public static final List<String> DEFAULT_IDENTITY_FILES = Collections.unmodifiableList(Arrays.asList(
        System.getProperty("user.home") + Utils.PATH_SEPARATOR + ".crowdin.yml",
        System.getProperty("user.home") + Utils.PATH_SEPARATOR + ".crowdin.yaml"
    ));

    public static final Map<String, String> PLACEHOLDER_MAPPING_FOR_SERVER = Collections.unmodifiableMap(new HashMap<String, String>() {{
                put("name", "language");
        }}
    );

    /**
     * File format -> Export File Format (see https://support.crowdin.com/api/v2/#operation/api.projects.translations.exports.post)
     */
    public static final Map<String, String> FILE_FORMAT_MAPPER = Collections.unmodifiableMap(new HashMap<String, String>() {{
                put("xliff", "xliff");
                put("xml", "android");
                put("strings", "macosx");
        }}
    );

    public static final ResourceBundle RESOURCE_BUNDLE = ResourceBundle.getBundle("messages/messages");

    public static final String URL_OAUTH_AUTH = "https://accounts.crowdin.com/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=token&scope=project";

    public static final String OAUTH_CLIENT_ID = "wQEqvhU3vLOa2XicmUyT";

    public static final String HTTP_PROXY_HOST_ENV = "HTTP_PROXY_HOST";
    public static final String HTTP_PROXY_PORT_ENV = "HTTP_PROXY_PORT";
    public static final String HTTP_PROXY_USER_ENV = "HTTP_PROXY_USER";
    public static final String HTTP_PROXY_PASSWORD_ENV = "HTTP_PROXY_PASSWORD";

    public static final String IGNORE_HIDDEN_FILES_PATTERN = "**/.*";
}
