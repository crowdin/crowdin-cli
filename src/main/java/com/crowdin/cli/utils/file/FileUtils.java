package com.crowdin.cli.utils.file;

import org.apache.commons.io.IOUtils;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class FileUtils {

    private static final String YAML_EXTENSION = ".yaml";
    private static final String YML_EXTENSION = ".yml";

    public static Map<String, Object> readYamlFile(File fileCfg) {
        if (fileCfg == null) {
            throw new NullPointerException("FileReader.readCliConfig has null args");
        }
        if (!(fileCfg.getName().endsWith(YAML_EXTENSION) || fileCfg.getName().endsWith(YML_EXTENSION))) {
            System.out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("message.warning.not_yml"), fileCfg.getAbsolutePath())));
        }

        Yaml yaml = new Yaml();
        try (InputStream inputStream = new FileInputStream(fileCfg)) {
            return (Map<String, Object>) yaml.load(inputStream);
        } catch (FileNotFoundException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"));
        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.reading_configuration_file"), e);
        }
    }

    public static void writeToFile(InputStream data, String filePath) throws IOException {
        Path parentDirectory = Paths.get(filePath).getParent();
        if (parentDirectory != null) {
            Files.createDirectories(parentDirectory);
        }
        FileOutputStream fileOutputStream = new FileOutputStream(filePath);
        IOUtils.copy(data, fileOutputStream);
        fileOutputStream.flush();
        fileOutputStream.close();
    }
}
