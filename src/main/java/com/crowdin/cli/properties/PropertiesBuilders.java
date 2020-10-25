package com.crowdin.cli.properties;

import com.crowdin.cli.utils.file.FileUtils;

import java.io.File;

public class PropertiesBuilders {

    public PropertiesWithFiles buildPropertiesWithFiles(File configFile, File identityFile, ParamsWithFiles params) {
        PropertiesWithFilesBuilder builder = new PropertiesWithFilesBuilder();
        if (!((configFile == null || !configFile.exists()) && params != null)) {
            builder.addConfigParams(FileUtils.readYamlFile(configFile));
        }
        if (identityFile != null) {
            builder.addIdentityParams(FileUtils.readYamlFile(identityFile));
        }
        if (params != null) {
            builder.addParams(params);
        }
        return builder.build();
    }

    public PropertiesWithTargets buildPropertiesWithTargets(File configFile, File identityFile, ProjectParams params) {
        PropertiesWithTargetsBuilder builder = new PropertiesWithTargetsBuilder();
        if (configFile != null) {
            builder.addConfigParams(FileUtils.readYamlFile(configFile));
        }
        if (identityFile != null) {
            builder.addIdentityParams(FileUtils.readYamlFile(identityFile));
        }
        if (params != null) {
            builder.addParams(params);
        }
        return builder.build();
    }

    public BaseProperties buildBaseProperties(File configFile, File identityFile, Params params) {
        BasePropertiesBuilder builder = new BasePropertiesBuilder();
        if (configFile != null) {
            builder.addConfigParams(FileUtils.readYamlFile(configFile));
        }
        if (identityFile != null) {
            builder.addIdentityParams(FileUtils.readYamlFile(identityFile));
        }
        if (params != null) {
            builder.addParams(params);
        }
        return builder.build();
    }

    public NewNoProperties buildNoProperties() {
        return new NewNoProperties();
    }
}
