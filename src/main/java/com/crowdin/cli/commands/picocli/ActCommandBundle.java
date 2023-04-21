package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.client.Clients;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectParams;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

public abstract class ActCommandBundle extends GenericActCommand<ProjectProperties, ClientBundle> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private ProjectParams params;

    @Override
    protected ProjectProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildProjectProperties(out, properties.getConfigFile(), properties.getIdentityFile(), params);
    }

    @Override
    protected ClientBundle getClient(ProjectProperties properties) {
        return Clients.getClientBundle(properties.getApiToken(), properties.getBaseUrl(), properties.getProjectId());
    }
}
