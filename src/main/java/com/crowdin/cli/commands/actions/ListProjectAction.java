package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.DryrunProjectFiles;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.Optional;

class ListProjectAction implements NewAction<ProjectProperties, ProjectClient> {

    private boolean noProgress;
    private String branchName;
    private boolean treeView;
    private boolean plainView;

    public ListProjectAction(boolean noProgress, String branchName, boolean treeView, boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.branchName = branchName;
        this.treeView = treeView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, () -> client.downloadFullProject(this.branchName));

        Long branchId = Optional.ofNullable(project.getBranch()).map(Branch::getId).orElse(null);

        (new DryrunProjectFiles(project.getFileInfos(), project.getDirectories(), project.getBranches(), branchId)).run(out, treeView, plainView);
    }
}
