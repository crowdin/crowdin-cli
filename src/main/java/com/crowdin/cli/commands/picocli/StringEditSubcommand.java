package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.StringEditAction;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

@CommandLine.Command(
    name = "edit"
)
public class StringEditSubcommand extends Command {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...")
    protected Long id;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...", hidden = true)
    protected String identifier;

    @CommandLine.Option(names = {"--text"}, paramLabel = "...")
    protected String newText;

    @CommandLine.Option(names = {"--context"}, paramLabel = "...")
    protected String newContext;

    @CommandLine.Option(names = {"--max-length"}, paramLabel = "...")
    protected Integer newMaxLength;

    @CommandLine.Option(names = {"--hidden"})
    protected Boolean newIsHidden;


    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        checkOptions();

        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new StringEditAction(noProgress, id, identifier, newText, newContext, newMaxLength, newIsHidden);
        action.act(pb, client);
    }

    private void checkOptions() {
        if (id == null && identifier == null) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.source_string_id_not_specified"));
        } else if (id != null && identifier != null) {
            throw new RuntimeException("You can't use both identifiers");
        }
        if (newText == null && newContext == null && newMaxLength == null && newIsHidden == null) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.source_string_no_edit"));
        }
    }


}
