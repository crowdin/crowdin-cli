package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;

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

        project
                .getBranches()
                .forEach((key, value) -> {
                    String name = value.getName().replaceAll("^[/\\\\]+", "");
                    if (!plainView) {
                        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.branch.list"), key, name)));
                    } else {
                        out.println(name);
                    }
                });
    }
}
