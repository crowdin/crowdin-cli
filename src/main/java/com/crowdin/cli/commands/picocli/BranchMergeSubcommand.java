package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Parameters;

@Command(
        sortOptions = false,
        name = CommandNames.BRANCH_MERGE
)
class BranchMergeSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.branch.merge.source")
    protected String source;

    @Parameters(descriptionKey = "crowdin.branch.merge.target")
    protected String target;

    @CommandLine.Option(names = {"--dryrun"}, descriptionKey = "crowdin.branch.merge.dryrun", order = -2)
    protected boolean dryrun;

    @CommandLine.Option(names = {"--delete-after-merge"}, descriptionKey = "crowdin.branch.merge.delete-after-merge", order = -2)
    protected boolean deleteAfterMerge;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.branchMerge(source, target, dryrun, deleteAfterMerge, noProgress, plainView);
    }
}
