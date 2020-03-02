package com.crowdin.cli.commands.parts;

import com.crowdin.cli.commands.functionality.PropertiesBuilder;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

import java.io.File;

public abstract class PropertiesBuilderCommandPart extends Command {

    @CommandLine.Option(names = {"--identity"}, paramLabel = "...")
    private File identityFile;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private Params params;

    @CommandLine.Option(names = {"-c", "--config"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private File configFile;

    protected PropertiesBean buildPropertiesBean() {
        return (new PropertiesBuilder(new File(configFile.getAbsolutePath()), identityFile, params)).build();
    }
}
