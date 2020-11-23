package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

public abstract class ActCommandWithFiles extends GenericActCommand<PropertiesWithFiles, ProjectClient> {

    @CommandLine.ArgGroup(exclusive = false, headingKey = "params.heading")
    private ParamsWithFiles params;

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    @Override
    protected PropertiesWithFiles getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        if (params == null) {
            params = new ParamsWithFiles();
        }
        this.updateParams(params);
        return propertiesBuilders.buildPropertiesWithFiles(out, properties.getConfigFile(), properties.getIdentityFile(), params);
    }

    @Override
    protected ProjectClient getClient(PropertiesWithFiles props) {
        return Clients.getProjectClient(props.getApiToken(), props.getBaseUrl(), Long.parseLong(props.getProjectId()));
    }

    protected void updateParams(ParamsWithFiles params) {
//        do nothing
    }
}
