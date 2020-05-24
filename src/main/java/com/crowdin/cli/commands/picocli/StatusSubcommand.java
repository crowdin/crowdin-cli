package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.ListTranslationsAction;
import com.crowdin.cli.commands.actions.StatusAction;
import com.crowdin.cli.commands.actions.UploadTranslationsAction;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

@CommandLine.Command(
    name = "status",
    sortOptions = false,
    subcommands = {
        StatusTranslationSubcommand.class,
        StatusProofreadingSubcommand.class
    }
)
public class StatusSubcommand extends Command {

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new StatusAction(languageId, isVerbose, true, true);
        action.act(pb, client);
    }
}
