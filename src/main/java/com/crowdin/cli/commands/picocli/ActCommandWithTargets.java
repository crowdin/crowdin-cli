package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ParamsWithTargets;
import com.crowdin.cli.properties.PropertiesBuilders;
import com.crowdin.cli.properties.PropertiesWithTargets;
import picocli.CommandLine;

public abstract class ActCommandWithTargets extends GenericActCommand<PropertiesWithTargets, ProjectClient> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

//    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private ParamsWithTargets params;

    @Override
    public PropertiesWithTargets getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        if (params == null) {
            params = new ParamsWithTargets();
        }
        this.updateParams(params);
        return propertiesBuilders.buildPropertiesWithTargets(out, properties.getConfigFile(), properties.getIdentityFile(), params);
    }

    @Override
    protected ProjectClient getClient(PropertiesWithTargets properties) {
        return Clients.getProjectClient(properties.getApiToken(), properties.getBaseUrl(), Long.parseLong(properties.getProjectId()));
    }

    protected void updateParams(ParamsWithTargets params) {
//        do nothing
    }
}
