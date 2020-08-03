package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.commands.functionality.DryrunBranches;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;

public class ListBranchesAction implements ClientAction {

    private boolean noProgress;
    private boolean plainView;

    public ListBranchesAction(boolean noProgress,  boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesBean pb, Client client) {
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        new DryrunBranches(project.getBranches())
            .run(out, false, plainView);
    }
}
