package com.crowdin.cli.commands.parts;

import com.crowdin.cli.properties.CliProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.file.FileReader;
import picocli.CommandLine;

import java.nio.file.Path;

public abstract class PropertiesBuilderCommandPart extends Command {

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...", description = "Set path to user-specific credentials")
    private Path identityFilePath;

    @CommandLine.ArgGroup(exclusive = false, heading = "@|underline CONFIG OPTIONS|@(to use instead configuration file):%n")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...", description = "Set path to the configuration file (default: crowdin.yml)", defaultValue = "crowdin.yml")
    private Path configFilePath;

    protected PropertiesBean buildPropertiesBean() {
        PropertiesBean pb = (params != null && params.getSourceParam() != null && params.getTranslationParam() != null)
                ? CliProperties.buildFromParams(params)
                : CliProperties.buildFromMap(new FileReader().readCliConfig(configFilePath.toFile()));
        return CliProperties.processProperties(pb, configFilePath);
    }
}
