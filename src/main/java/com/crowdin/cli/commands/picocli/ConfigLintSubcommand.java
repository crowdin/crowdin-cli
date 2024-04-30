package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.AllProperties;
import com.crowdin.cli.properties.NoParams;
import com.crowdin.cli.properties.PropertiesBuilders;
import picocli.CommandLine;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@CommandLine.Command(
    name = CommandNames.LINT)
class ConfigLintSubcommand extends GenericActCommand<AllProperties, NoClient> {

    @CommandLine.Mixin
    private ConfigurationFilesProperties properties;

    protected NewAction<AllProperties, NoClient> getAction(Actions actions) {
        return (out, pb, client) ->
            out.println(OK.withIcon(RESOURCE_BUNDLE.getString("message.configuration_ok")));
    }

    @Override
    protected AllProperties getProperties(PropertiesBuilders propertiesBuilders, Outputter out) {
        return propertiesBuilders.buildChecker(out, properties.getConfigFile(), properties.getIdentityFile(), new NoParams());
    }

    @Override
    protected NoClient getClient(AllProperties properties) {
        return Clients.noClient();
    }
}
