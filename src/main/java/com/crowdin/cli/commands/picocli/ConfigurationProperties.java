package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.properties.Params;
import picocli.CommandLine;

import java.io.File;

class ConfigurationProperties {

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...")
    private File identityFile;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...")
    private File configFile;

    public File getIdentityFile() {
        return identityFile;
    }

    public Params getParams() {
        return params;
    }

    public File getConfigFile() {
        return configFile;
    }
}
