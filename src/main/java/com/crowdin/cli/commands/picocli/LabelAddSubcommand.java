package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.LABEL_ADD
)
public class LabelAddSubcommand extends ActCommandLabel {

    @CommandLine.Parameters(descriptionKey = "crowdin.label.add.title")
    protected String title;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientLabel> getAction(Actions actions) {
        return actions.labelAdd(title, plainView);
    }
}
