package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.file.FileUtils;

import java.io.File;

public class PropertiesBuilders {

    public PropertiesWithFiles buildPropertiesWithFiles(Outputter out, File configFile, File identityFile, ParamsWithFiles params) {
        PropertiesWithFilesBuilder builder = new PropertiesWithFilesBuilder(out);
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

    public PropertiesWithTargets buildPropertiesWithTargets(Outputter out, File configFile, File identityFile, ParamsWithTargets params) {
        PropertiesWithTargetsBuilder builder = new PropertiesWithTargetsBuilder(out);
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

    public BaseProperties buildBaseProperties(Outputter out, File configFile, File identityFile, BaseParams params) {
        BasePropertiesBuilder builder = new BasePropertiesBuilder(out);
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

    public AllProperties buildChecker(Outputter out, File configFile, File identityFile, NoParams params) {
        PropertiesBuilderChecker builder = new PropertiesBuilderChecker(out);
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

    public NoProperties buildNoProperties() {
        return new NoProperties();
    }
}
