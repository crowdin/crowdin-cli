package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.BaseParams;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

public abstract class ActCommand<C extends Client> extends GenericActCommand<BaseProperties, C> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private BaseParams params;

    @Override
    protected BaseProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildBaseProperties(out, properties.getConfigFile(), properties.getIdentityFile(), params);
    }
}
