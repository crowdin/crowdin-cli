package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.ListSourcesAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

@CommandLine.Command(
    name = "sources")
public class ListSourcesSubcommand extends Command {

    @CommandLine.Option(names = {"-b", "--branch"})
    protected String branch;

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new ListSourcesAction(this.noProgress, this.treeView);
        action.act(pb, client);
    }
}
