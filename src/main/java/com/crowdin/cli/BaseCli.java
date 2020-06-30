package com.crowdin.cli;

import com.crowdin.cli.utils.Utils;

import java.util.HashMap;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * Created by ihor on 12/1/16.
 */
public class BaseCli {

    public static final String[] DEFAULT_CONFIGS = {"crowdin.yml", "crowdin.yaml"};

    public static final String[] DEFAULT_IDENTITY_FILES = {
        System.getProperty("user.home") + Utils.PATH_SEPARATOR + ".crowdin.yml",
        System.getProperty("user.home") + Utils.PATH_SEPARATOR + ".crowdin.yaml"
    };

    public static final Map<String, String> PLACEHOLDER_MAPPING_FOR_SERVER = new HashMap<String, String>() {{
       put("name", "language");
    }};

    public static final ResourceBundle RESOURCE_BUNDLE = ResourceBundle.getBundle("messages/messages");

    public static final String URL_OAUTH_AUTH = "https://accounts.crowdin.com/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=project";
    public static final String URL_OAUTH_TOKEN = "https://accounts.crowdin.com/oauth/token";
    
    public static final String OAUTH_CLIENT_ID = "wQEqvhU3vLOa2XicmUyT";
    public static final String OAURH_CLIENT_SECRET = "2c488qiUkqtcsQDtRysPjoKXJxm2JF87dFNcljN9";
}
