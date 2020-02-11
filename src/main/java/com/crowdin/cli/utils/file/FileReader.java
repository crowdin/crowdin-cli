package com.crowdin.cli.utils.file;

import com.crowdin.cli.utils.MessageSource;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.util.Map;
import java.util.ResourceBundle;


public class FileReader {

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    private static final String DEFAULT_CONFIG_FILE_NAME = "crowdin.yml";

    private static final String YAML_EXTENSION = ".yaml";

    private static final String YML_EXTENSION = ".yml";

    public Map<String, Object> readCliConfig(File fileCfg) {
        if (fileCfg == null) {
            throw new NullPointerException("FileReader.readCliConfig has null args");
        }
        if (!(fileCfg.getName().endsWith(YAML_EXTENSION) || fileCfg.getName().endsWith(YML_EXTENSION))) {
            System.out.println("WARN: file with name '" + fileCfg.getAbsolutePath() + "' has different type from YAML");
        }

        Yaml yaml = new Yaml();
        InputStream inputStream = null;
        try {
            inputStream = new FileInputStream(fileCfg);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("configuration_file_empty"));
        }
        Map<String, Object> result = null;
        try {
            result = (Map<String, Object>) yaml.load(inputStream);
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error_reading_configuration_file"), e);
        }
        return result;
    }
}