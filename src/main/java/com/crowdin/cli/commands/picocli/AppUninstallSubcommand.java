package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
        sortOptions = false,
        name = CommandNames.UNINSTALL
)
class AppUninstallSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.app.uninstall.identifier")
    protected String identifier;

    @CommandLine.Option(names = {"--force"}, descriptionKey = "crowdin.app.uninstall.force", order = -2)
    protected boolean force;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.uninstallApp(identifier, force);
    }
}
