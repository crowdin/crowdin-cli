package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine.Option;
import picocli.CommandLine.Command;
import picocli.CommandLine.Parameters;

@Command(
    sortOptions = false,
    name = CommandNames.CLONE
)
class BranchCloneSubcommand extends ActCommandProject {

    @Parameters(descriptionKey = "crowdin.branch.clone.source")
    protected String source;

    @Parameters(descriptionKey = "crowdin.branch.clone.target")
    protected String target;

    @Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.branchClone(source, target, noProgress, plainView);
    }
}
