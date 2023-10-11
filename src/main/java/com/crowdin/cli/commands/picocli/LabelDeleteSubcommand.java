package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.LABEL_DELETE
)
public class LabelDeleteSubcommand extends ActCommandLabel {

    @CommandLine.Parameters(descriptionKey = "crowdin.label.title")
    protected String title;

    @Override
    protected NewAction<ProjectProperties, ClientLabel> getAction(Actions actions) {
        return actions.labelDelete(title);
    }
}
