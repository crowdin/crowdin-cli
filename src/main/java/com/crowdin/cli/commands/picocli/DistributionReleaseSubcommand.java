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

    @CommandLine.Option(names = {"--status"}, paramLabel = "...", descriptionKey = "crowdin.distribution.release.status", order = -2)
    protected String status;

    @CommandLine.Option(names = {"--progress"}, paramLabel = "...", descriptionKey = "crowdin.distribution.release.progress", order = -2)
    protected int progress;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", descriptionKey = "crowdin.distribution.release.language", order = -2)
    protected String language;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", descriptionKey = "crowdin.distribution.release.file", order = -2)
    protected int file;

    @Override
    protected NewAction<ProjectProperties, ClientDistribution> getAction(Actions actions) {
        return actions.distributionRelease(hash);
    }

}
