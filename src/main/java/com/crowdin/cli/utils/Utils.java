package com.crowdin.cli.utils;

import com.crowdin.cli.properties.PropertiesBean;
import org.apache.commons.lang3.SystemUtils;

import java.io.InputStream;
import java.nio.file.FileSystems;
import java.util.Properties;
import java.util.ResourceBundle;

/**
 * @author ihor
 */
public class Utils {

    private static final String APPLICATION_BASE_URL = "application.base_url";

    private static final String APPLICATION_NAME = "application.name";

    private static final String APPLICATION_VERSION = "application.version";

    private static final String PROPERTIES_FILE = "/crowdin.properties";

    private static final String USER_AGENT = "application.user_agent";

    /**
     * Path separator for use when concatenating or using non-regex find/replace methods.
     */
    public static final String PATH_SEPARATOR = FileSystems.getDefault().getSeparator();

    /**
     * Path separator for use in regex patterns, or in regex replacements, which use the same escaping.
     */
    public static final String PATH_SEPARATOR_REGEX = "\\".equals(PATH_SEPARATOR) ? "\\\\" : PATH_SEPARATOR;

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    public static String getAppName() {
        Properties properties = new Properties();
        String applicationName = null;
        try {
            InputStream in = Utils.class.getResourceAsStream(PROPERTIES_FILE);
            properties.load(in);
            in.close();
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("exception_app_name"));
        }
        if (properties != null && properties.get(APPLICATION_NAME) != null) {
            applicationName = properties.get(APPLICATION_NAME).toString();
        }
        return applicationName;
    }

    public static String getAppVersion() {
        Properties properties = new Properties();
        String applicationVersion = null;
        try {
            InputStream in = Utils.class.getResourceAsStream(PROPERTIES_FILE);
            properties.load(in);
            in.close();
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("exception_app_version"));
        }
        if (properties != null && properties.get(APPLICATION_VERSION) != null) {
            applicationVersion = properties.get(APPLICATION_VERSION).toString();
        }
        return applicationVersion;
    }

    public static String getBaseUrl() {
        Properties properties = new Properties();
        String applicationBaseUrl = null;
        try {
            InputStream in = Utils.class.getResourceAsStream(PROPERTIES_FILE);
            properties.load(in);
            in.close();
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_get_base_url"));
        }
        if (properties != null && properties.get(APPLICATION_BASE_URL) != null) {
            applicationBaseUrl = properties.get(APPLICATION_BASE_URL).toString();
        }
        return applicationBaseUrl;
    }

    public static String replaceBasePath(String path, PropertiesBean propertiesBean) {
        if (path == null || path.isEmpty()) {
            System.out.println(RESOURCE_BUNDLE.getString("error_empty_path"));
            System.exit(0);
        }
        String result;
        if (propertiesBean !=  null && propertiesBean.getBasePath() != null && !propertiesBean.getBasePath().isEmpty()) {
            path = path.replaceAll(PATH_SEPARATOR_REGEX + "+", PATH_SEPARATOR_REGEX);
            result = path.replace(propertiesBean.getBasePath(), PATH_SEPARATOR);
        } else {
            result = PATH_SEPARATOR;
        }
        result = result.replaceAll(PATH_SEPARATOR_REGEX + "+", PATH_SEPARATOR_REGEX);
        return result;
    }

    public static Boolean isWindows() {
        return SystemUtils.IS_OS_WINDOWS;
    }

    public static String getUserAgent() {
        Properties prop = new Properties();
        String userAgent = null;
        try {
            InputStream in = Utils.class.getResourceAsStream(PROPERTIES_FILE);
            prop.load(in);
            in.close();
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("error_get_user_agent"));
        }
        if (prop != null && prop.get(USER_AGENT) != null) {
            userAgent = prop.get(USER_AGENT).toString();
        }
        return userAgent;
    }

    public static String commonPath(String[] paths){
        String commonPath = "";
        if (paths == null) {
            return commonPath;
        }
        if (Utils.isWindows()) {
            String[] winPath = new String[paths.length];
            for (int i=0; i<paths.length; i++) {
                if (paths[i].contains("/")) {
                    winPath[i] = paths[i].replaceAll("/+", PATH_SEPARATOR_REGEX);
                } else {
                    winPath[i] = paths[i];
                }
            }
            paths = winPath;
        }
        if (paths.length == 1) {
            if (paths[0].lastIndexOf(PATH_SEPARATOR) > 0) {
                commonPath = paths[0].substring(0, paths[0].lastIndexOf(PATH_SEPARATOR));
            }
            if (Utils.isWindows() && paths[0].lastIndexOf("\\") > 0) {
                commonPath = paths[0].substring(0, paths[0].lastIndexOf("\\"));
            }
        } else if (paths.length > 1) {
            String[][] folders = new String[paths.length][];
            for(int i = 0; i < paths.length; i++){
                folders[i] = paths[i].split(PATH_SEPARATOR_REGEX);
            }
            for(int j = 0; j < folders[0].length; j++){
                String thisFolder = folders[0][j];
                boolean allMatched = true;
                for(int i = 1; i < folders.length && allMatched; i++){
                    if(folders[i].length < j){
                        allMatched = false;
                        break;
                    }
                    allMatched &= folders[i][j].equals(thisFolder);
                }
                if(allMatched){
                    commonPath += thisFolder + PATH_SEPARATOR;
                } else{
                    break;
                }
            }
        }
        return commonPath;
    }

    public static String getEnvironmentVariable(String name) {
        if (name == null || name.isEmpty()) {
            return null;
        }
        return System.getenv(name);
    }
}