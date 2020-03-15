package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.file.FileReader;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class PropertiesBuilder {

    private File configFile;
    private File identityFile;
    private Params params;

    public PropertiesBuilder(File configFile, File identityFile, Params params) {
        this.configFile = configFile;
        this.identityFile = identityFile;
        this.params = params;
    }

    public PropertiesBean build() {
        PropertiesBean pb = (!(Files.notExists(configFile.toPath()) && params != null))
            ? CliProperties.buildFromMap(new FileReader().readCliConfig(configFile))
            : new PropertiesBean();
        if (identityFile != null) {
            CliProperties.populateWithCredentials(pb, new FileReader().readCliConfig(identityFile));
        }
        if (params != null) {
            if (new File(params.getSourceParam()).isAbsolute()) {
                pb.setPreserveHierarchy(false);
                pb.setBasePath(configFile.toPath().getRoot().toString());
                params.setSourceParam(StringUtils.removePattern(params.getSourceParam(), "^([a-zA-Z]:)?[\\\\/]+"));
            }
            CliProperties.populateWithParams(pb, params);
        }
        String basePathIfEmpty = new File(configFile.getAbsolutePath()).getParent();
        return CliProperties.processProperties(pb, basePathIfEmpty);
    }
}
