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

    @CommandLine.Option(names = {"--id"}, required = true)
    protected Long id;

    @CommandLine.Option(names = {"--new-text"})
    protected String newText;

    @CommandLine.Option(names = {"--new-context"})
    protected String newContext;

    @CommandLine.Option(names = {"--new-max-len"})
    protected Integer newMaxLength;

    @CommandLine.Option(names = {"--new-hidden"})
    protected Boolean newIsHidden;


    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        checkOptions();

        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new StringEditAction(noProgress, id, newText, newContext, newMaxLength, newIsHidden);
        action.act(pb, client);
    }

    private void checkOptions() {
        if (newText == null && newContext == null && newMaxLength == null && newIsHidden == null) {
            throw new RuntimeException("There's nothing to do");
        }
    }


}
