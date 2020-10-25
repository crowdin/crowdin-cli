package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

public abstract class ActCommand<C extends Client> extends GenericActCommand<BaseProperties, C> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private Params params;

    @Override
    protected BaseProperties getProperties(PropertiesBuilders propertiesBuilders) {
        return propertiesBuilders.buildBaseProperties(properties.getConfigFile(), properties.getIdentityFile(), params);
    }
}
