package com.crowdin.cli.commands;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.file.FileReader;
import picocli.CommandLine;

import java.io.File;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Callable;

import static com.crowdin.cli.utils.MessageSource.Messages.MISSING_PROPERTY_BEAN;

@CommandLine.Command(name = "lint", description = "Check your configuration file")
public class LintSubcommand extends Command implements Callable<Integer> {

    @CommandLine.Option(names = {"-c", "--config"}, description = "Set path to the configuration file", defaultValue = "crowdin.yml")
    protected Path configFilePath;

    @Override
    public Integer call() throws Exception {
        System.out.println("configFilePath: " + configFilePath);
        FileReader fileReader = new FileReader();
        Map<String, Object> cliConfig = fileReader.readCliConfig(configFilePath.toFile());
        CliProperties cliProperties = new CliProperties();
        PropertiesBean propertiesBean = cliProperties.loadProperties(cliConfig);
//        Map<String, Object> identityCliConfig = new HashMap<>();


        if (cliConfig == null) {
            throw new RuntimeException("configuration_file_empty");
        }
//            System.out.println(RESOURCE_BUNDLE.getString("configuration_file_empty"));
//            ConsoleUtils.exitError();
//        CliProperties cliProperties = new CliProperties();
//        PropertiesBean propertiesBean = cliProperties.loadProperties(cliConfig);
        PropertiesBean propertiesBeanIdentity = null;
//        if (identityCliConfig != null) {
//            propertiesBeanIdentity = cliProperties.loadProperties(identityCliConfig);
//        }
        if (propertiesBean == null && propertiesBeanIdentity == null) {
//                System.out.println(RESOURCE_BUNDLE.getString("configuration_file_empty"));
//                ConsoleUtils.exitError();
        }

        if (propertiesBean == null || propertiesBean.getProjectId() == null) {
            if (propertiesBeanIdentity == null || propertiesBeanIdentity.getProjectId() == null) {
//                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_project_id"));
//                    ConsoleUtils.exitError();
            }
        }

        if (propertiesBean == null || propertiesBean.getApiToken() == null) {
            if (propertiesBeanIdentity == null || propertiesBeanIdentity.getApiToken() == null) {
//                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_api_token"));
//                    ConsoleUtils.exitError();
            }
        }

        if (propertiesBean == null || propertiesBean.getBaseUrl() == null) {
            if (propertiesBeanIdentity == null || propertiesBeanIdentity.getBaseUrl() == null) {
                String baseUrl = Utils.getBaseUrl();
                if (baseUrl == null || baseUrl.isEmpty()) {
//                        System.out.println(RESOURCE_BUNDLE.getString("missed_base_url"));
//                        ConsoleUtils.exitError();
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
//                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
//                    ConsoleUtils.exitError();
            }
        }
        if (propertiesBean == null) {
            System.out.println(MISSING_PROPERTY_BEAN.getString());
        } else {
            if (propertiesBean.getFiles() == null) {
//                    System.out.println(RESOURCE_BUNDLE.getString("error_missed_section_files"));
//                    ConsoleUtils.exitError();
            } else if (propertiesBean.getFiles().isEmpty()) {
//                    System.out.println(RESOURCE_BUNDLE.getString("empty_section_file"));
//                    ConsoleUtils.exitError();
            } else {
                for (FileBean fileBean : propertiesBean.getFiles()) {
                    if (fileBean.getSource() == null || fileBean.getSource().isEmpty()) {
//                            System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_source_or_translation"));
//                            ConsoleUtils.exitError();
                    }
                    if (fileBean.getTranslation() == null || fileBean.getTranslation().isEmpty()) {
//                            System.out.println(RESOURCE_BUNDLE.getString("error_empty_section_source_or_translation"));
//                            ConsoleUtils.exitError();
                    }
                }
            }
        }
//        System.out.println(RESOURCE_BUNDLE.getString("configuration_ok"));
        return 42;
    }
}
