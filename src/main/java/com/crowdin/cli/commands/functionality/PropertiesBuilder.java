package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.file.FileUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

public class PropertiesBuilder {

    private Path userDir;
    private File configFile;
    private File identityFile;
    private Params params;

    public PropertiesBuilder(Path userDir, File configFile, File identityFile, Params params) {
        if (configFile == null) {
            throw new NullPointerException("null arg in PropertiesBuilder.constructor");
        }
        this.userDir = userDir;
        this.configFile = configFile;
        this.identityFile = identityFile;
        this.params = params;
    }

    public PropertiesBean build() {
        PropertiesBean pb = (!(Files.notExists(configFile.toPath()) && params != null))
            ? CliProperties.buildFromMap(FileUtils.readYamlFile(configFile))
            : new PropertiesBean();
        if (identityFile != null) {
            CliProperties.populateWithCredentials(pb, FileUtils.readYamlFile(identityFile));
        }
        if (params != null) {
            if (params.getSourceParam() != null && new File(params.getSourceParam()).isAbsolute()) {
                pb.setPreserveHierarchy(false);
                pb.setBasePath(configFile.toPath().getRoot().toString());
                params.setSourceParam(StringUtils.removePattern(params.getSourceParam(), "^([a-zA-Z]:)?[\\\\/]+"));
            }
            CliProperties.populateWithParams(pb, params);
        }
        String basePathIfEmpty = userDir.toString();
        return CliProperties.processProperties(pb, basePathIfEmpty);
    }
}
