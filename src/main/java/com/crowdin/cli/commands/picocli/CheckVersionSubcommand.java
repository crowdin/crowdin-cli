package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.CHECK_NEW_VERSION,
    hidden = true
)
class CheckVersionSubcommand extends GenericActCommand<NoProperties, NoClient> {

    @Override
    protected NewAction<NoProperties, NoClient> getAction(Actions actions) {
        return actions.checkNewVersion();
    }

    protected NoProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildNoProperties();
    }

    protected NoClient getClient(NoProperties properties) {
        return Clients.noClient();
    }
}
