package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.BROWSE,
    sortOptions = false
)
class BundleBrowseSubcommand extends ActCommandBundle {

    @CommandLine.Parameters(descriptionKey = "crowdin.bundle.browse.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        ProjectClient projectClient = this.getProjectClient(this.getProperties(propertiesBuilders, out));
        return actions.bundleBrowse(id, projectClient);
    }
}
