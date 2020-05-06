package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.ListSourcesAction;
import com.crowdin.cli.commands.actions.UploadSourcesAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

public class UploadSourcesCommand extends Command {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true)
    protected boolean autoUpdate = true;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = (dryrun)
            ? new ListSourcesAction(this.noProgress, this.treeView)
            : new UploadSourcesAction(this.branch, this.noProgress, this.autoUpdate);
        action.act(pb, client);
    }
}
