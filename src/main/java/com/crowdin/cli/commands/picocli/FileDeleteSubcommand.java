package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine.Command;
import picocli.CommandLine.Parameters;

@Command(
    name = CommandNames.FILE_DELETE,
    sortOptions = false
)
class FileDeleteSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.file.delete.file")
    protected String file;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.fileDelete(file);
    }
}
