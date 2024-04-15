package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.STRING_DELETE,
    sortOptions = false
)
class StringDeleteSubcommand extends ActCommandProject {

    @CommandLine.Parameters(descriptionKey = "crowdin.string.delete.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringDelete(id);
    }
}
