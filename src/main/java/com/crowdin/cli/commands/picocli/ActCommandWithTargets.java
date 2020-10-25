package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.properties.ProjectParams;
import com.crowdin.cli.properties.PropertiesWithTargets;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

public abstract class ActCommandWithTargets extends GenericActCommand<PropertiesWithTargets, ProjectClient> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private ProjectParams params;

    @Override
    public PropertiesWithTargets getProperties(PropertiesBuilders propertiesBuilders) {
        return propertiesBuilders.buildPropertiesWithTargets(properties.getConfigFile(), properties.getIdentityFile(), params);
    }

    @Override
    protected ProjectClient getClient(PropertiesWithTargets properties) {
        return Clients.getProjectClient(properties.getApiToken(), properties.getBaseUrl(), Long.parseLong(properties.getProjectId()));
    }
}
