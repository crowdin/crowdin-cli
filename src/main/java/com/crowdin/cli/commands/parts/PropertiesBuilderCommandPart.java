package com.crowdin.cli.commands.parts;

import com.crowdin.cli.commands.functionality.PropertiesBuilder;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

import java.io.File;

public abstract class PropertiesBuilderCommandPart extends Command {

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...", description = "Set a path to user-specific credentials")
    private File identityFile;

    @CommandLine.ArgGroup(exclusive = false, heading = "@|underline CONFIG OPTIONS|@(to use instead configuration file):%n")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...", description = "Set a path to the configuration file. Default: crowdin.yml", defaultValue = "crowdin.yml")
    private File configFile;

    protected PropertiesBean buildPropertiesBean() {
        return (new PropertiesBuilder(configFile, identityFile, params)).build();
    }
}
