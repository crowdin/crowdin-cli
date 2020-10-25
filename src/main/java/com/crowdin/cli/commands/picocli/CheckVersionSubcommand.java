package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.NewNoProperties;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.CHECK_NEW_VERSION,
    hidden = true
)
class CheckVersionSubcommand extends GenericActCommand<NewNoProperties, NoClient> {

    @Override
    protected NewAction<NewNoProperties, NoClient> getAction(Actions actions) {
        return actions.checkNewVersion();
    }

    protected NewNoProperties getProperties(PropertiesBuilders propertiesBuilders) {
        return propertiesBuilders.buildNoProperties();
    }

    protected NoClient getClient(NewNoProperties properties) {
        return Clients.noClient();
    }
}
