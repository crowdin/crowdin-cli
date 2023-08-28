package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.DISTRIBUTION_RELEASE,
    sortOptions = false
)
class DistributionReleaseSubcommand extends ActCommandDistribution {

    @CommandLine.Parameters(descriptionKey = "crowdin.distribution.release.hash")
    protected String hash;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.distribution.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientDistribution> getAction(Actions actions) {
        return actions.distributionRelease(noProgress, plainView, hash);
    }
}
