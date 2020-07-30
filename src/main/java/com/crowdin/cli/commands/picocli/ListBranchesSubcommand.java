package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.ListBranchesAction;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

@CommandLine.Command(
    name = "branches"
)
public class ListBranchesSubcommand extends Command {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new ListBranchesAction(this.noProgress, this.plainView);
        action.act(pb, client);
    }
}
