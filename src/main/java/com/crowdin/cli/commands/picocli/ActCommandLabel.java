package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectParams;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

public abstract class ActCommandLabel extends GenericActCommand<ProjectProperties, ClientLabel> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private ProjectParams params;

    @Override
    protected ProjectProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildProjectProperties(out, properties.getConfigFile(), properties.getIdentityFile(), params);
    }

    @Override
    protected ClientLabel getClient(ProjectProperties properties) {
        return GenericActCommand.getLabelClient(properties);
    }
}
