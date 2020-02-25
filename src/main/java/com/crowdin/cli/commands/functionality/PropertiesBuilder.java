package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.file.FileReader;

import java.io.File;
import java.nio.file.Files;

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
            CliProperties.populateWithCredentials(pb, new FileReader().readCliConfig(configFile));
        }
        if (params != null) {
            CliProperties.populateWithParams(pb, params);
        }
        String basePathIfEmpty = (Files.exists(configFile.toPath()))
            ? new File(configFile.getAbsolutePath()).getParent()
            : System.getProperty("user.dir");
        return CliProperties.processProperties(pb, basePathIfEmpty);
    }
}
