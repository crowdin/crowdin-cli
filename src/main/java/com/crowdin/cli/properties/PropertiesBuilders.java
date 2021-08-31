package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.file.FileUtils;

import java.io.File;

public class PropertiesBuilders {

    public PropertiesWithFiles buildPropertiesWithFiles(Outputter out, File configFile, File identityFile, ParamsWithFiles params) {
        return new PropertiesWithFilesBuilder(out)
            .addConfigParams((fileExists(configFile) || params.isEmpty()) ? FileUtils.readYamlFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public PropertiesWithTargets buildPropertiesWithTargets(Outputter out, File configFile, File identityFile, ParamsWithTargets params) {
        return new PropertiesWithTargetsBuilder(out)
            .addConfigParams((configFile != null) ? FileUtils.readYamlFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public ProjectProperties buildProjectProperties(Outputter out, File configFile, File identityFile, ProjectParams params) {
        return new ProjectPropertiesBuilder(out)
            .addConfigParams((fileExists(configFile)) ? FileUtils.readYamlFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public BaseProperties buildBaseProperties(Outputter out, File configFile, File identityFile, BaseParams params) {
        return new BasePropertiesBuilder(out)
            .addConfigParams((fileExists(configFile)) ? FileUtils.readYamlFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    public AllProperties buildChecker(Outputter out, File configFile, File identityFile, NoParams params) {
        return new PropertiesBuilderChecker(out)
            .addConfigParams((fileExists(configFile)) ? FileUtils.readYamlFile(configFile) : null)
            .addIdentityParams((identityFile != null) ? FileUtils.readYamlFile(identityFile) : null)
            .addParams(params)
            .build();
    }

    private boolean fileExists(File file) {
        return file != null && file.exists();
    }

    public NoProperties buildNoProperties() {
        return new NoProperties();
    }
}
