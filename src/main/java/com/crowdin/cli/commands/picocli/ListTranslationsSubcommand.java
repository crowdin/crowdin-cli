package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.ListTranslationsAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

@CommandLine.Command(
    name = "translations")
public class ListTranslationsSubcommand extends Command {

    @CommandLine.Option(names = {"--tree"})
    protected boolean treeView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new ListTranslationsAction(noProgress, treeView, false);
        action.act(pb, client);
    }
}
