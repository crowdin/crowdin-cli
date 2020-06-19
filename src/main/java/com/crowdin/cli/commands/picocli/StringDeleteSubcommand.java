package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.StringDeleteAction;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

import java.util.List;

@CommandLine.Command(
    name = "delete"
)
public class StringDeleteSubcommand extends Command {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...")
    protected List<Long> ids;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...")
    protected List<String> texts;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", hidden = true)
    protected List<String> identifiers;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        checkOptions();

        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new StringDeleteAction(noProgress, ids, texts, identifiers);
        action.act(pb, client);
    }

    private void checkOptions() {
        if ((ids == null || ids.isEmpty()) && (texts == null || texts.isEmpty()) && (identifiers == null || identifiers.isEmpty())) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.source_string_id_not_specified"));
        }
    }
}
