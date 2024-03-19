package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class ListBranchesAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean noProgress;
    private final boolean plainView;

    public ListBranchesAction(boolean noProgress, boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        List<String> branchNames = project.getBranches()
                .values()
                .stream()
                .map(Branch::getName)
                .map(f -> f.replaceAll("^[/\\\\]+", ""))
                .sorted()
                .collect(Collectors.toList());
        if (!plainView) {
            branchNames.forEach(file -> out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch"), file))));
        } else {
            branchNames.forEach(out::println);
        }
    }
}
