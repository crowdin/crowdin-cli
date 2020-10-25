package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.LINT)
class LintSubcommand extends ActCommandWithFiles {

    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (out, pb, client) ->
            out.println(CommandLine.Help.Ansi.AUTO.string(RESOURCE_BUNDLE.getString("message.configuration_ok")));
    }

    @Override
    protected ProjectClient getClient(PropertiesWithFiles properties) {
        return Clients.getProjectClient(properties.getApiToken(), properties.getBaseUrl(), Long.parseLong(properties.getProjectId()));
    }
}
