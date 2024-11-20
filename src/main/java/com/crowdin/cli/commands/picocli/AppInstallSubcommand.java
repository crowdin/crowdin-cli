package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
        sortOptions = false,
        name = CommandNames.INSTALL
)
class AppInstallSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.app.install.identifier")
    protected String identifier;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.installApp(identifier);
    }
}
