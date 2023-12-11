package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.DryrunBranches;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;

class ListBranchesAction implements NewAction<ProjectProperties, ProjectClient> {

    private boolean noProgress;
    private boolean plainView;

    public ListBranchesAction(boolean noProgress,  boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        new DryrunBranches(project.getBranches())
            .run(out, false, plainView);
    }
}
