package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
        sortOptions = false,
        name = CommandNames.DISTRIBUTION_LIST
)
class DistributionListSubcommand extends ActCommandDistribution {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientDistribution> getAction(Actions actions) {
        return actions.distributionList(this.plainView);
    }

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
