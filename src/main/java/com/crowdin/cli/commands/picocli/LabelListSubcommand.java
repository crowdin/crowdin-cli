package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    sortOptions = false,
    name = CommandNames.LABEL_LIST
)
class LabelListSubcommand extends ActCommandLabel {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientLabel> getAction(Actions actions) {
        return actions.labelList(this.plainView, this.isVerbose);
    }
}
