package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.file.FileUtils;

import java.io.File;
import java.util.Map;

import static com.crowdin.cli.properties.PropertiesBuilder.CONFIG_FILE_PATH;

public class PropertiesBuilders {

    public PropertiesWithFiles buildPropertiesWithFiles(Outputter out, File configFile, File identityFile, ParamsWithFiles params) {
        return new PropertiesWithFilesBuilder(out)
            .addConfigParams((fileExists(configFile) || params.isEmpty()) ? readConfigFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public PropertiesWithTargets buildPropertiesWithTargets(Outputter out, File configFile, File identityFile, ParamsWithTargets params) {
        return new PropertiesWithTargetsBuilder(out)
            .addConfigParams((configFile != null) ? readConfigFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public ProjectProperties buildProjectProperties(Outputter out, File configFile, File identityFile, ProjectParams params) {
        return new ProjectPropertiesBuilder(out)
            .addConfigParams((fileExists(configFile)) ? readConfigFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public BaseProperties buildBaseProperties(Outputter out, File configFile, File identityFile, BaseParams params) {
        return new BasePropertiesBuilder(out)
            .addConfigParams((fileExists(configFile)) ? readConfigFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public AllProperties buildChecker(Outputter out, File configFile, File identityFile, NoParams params) {
        return new PropertiesBuilderChecker(out)
            .addConfigParams((fileExists(configFile)) ? readConfigFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    private Map<String, Object> readConfigFile(File configFile) {
        Map<String, Object> configFileParams = FileUtils.readYamlFile(configFile);
        configFileParams.put(CONFIG_FILE_PATH, configFile.getAbsoluteFile().getParentFile().getAbsolutePath());
        return configFileParams;
    }

    private boolean fileExists(File file) {
        return file != null && file.exists();
    }

    public NoProperties buildNoProperties() {
        return new NoProperties();
    }
}
