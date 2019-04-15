package com.crowdin.cli.utils;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.ResourceBundle;

import org.yaml.snakeyaml.Yaml;

/**
 * @author ihor
 */
public class FileReader {

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    private static final String DEFAULT_CONFIG_FILE_NAME = "crowdin.yml";

    private static final String YAML_EXTENTION = ".yaml";

    private static final String YML_EXTENTION = ".yml";

    public HashMap<String, Object> readCliConfig(String pathname, boolean isDebug) throws FileNotFoundException {

        Yaml yaml = new Yaml();
        InputStream inputStream = null;
        File fileCfg;
        HashMap<String, Object> result = null;
        if (pathname != null && pathname.length() > 0) {
            fileCfg = new File(pathname);
        } else {
            fileCfg = new File(DEFAULT_CONFIG_FILE_NAME);
        }
        if (fileCfg.isFile()) {
            if (fileCfg.getAbsolutePath().endsWith(YAML_EXTENTION) || fileCfg.getAbsolutePath().endsWith(YML_EXTENTION)) {
                inputStream = new FileInputStream(fileCfg);
            } else {
                System.out.println("Configuration file with name '" + pathname + "' has different type from YAML");
            }
        } else {
            System.out.println("Configuration file with name '" + pathname + "' does not exist.");
        }
        try {
            result = (HashMap<String, Object>) yaml.load(inputStream);
        } catch (Exception e ) {
            System.out.println(RESOURCE_BUNDLE.getString("error_loading_config"));
            if (isDebug) {
                e.printStackTrace();
            }
            ConsoleUtil.exitError();
        }
        return result;
    }
}