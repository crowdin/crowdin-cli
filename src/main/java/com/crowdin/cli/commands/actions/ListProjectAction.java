package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.DryrunProjectFiles;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import org.apache.commons.lang3.StringUtils;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class ListProjectAction implements Action {

    private boolean noProgress;
    private String branchName;
    private boolean treeView;

    public ListProjectAction(boolean noProgress, String branchName, boolean treeView) {
        this.noProgress = noProgress;
        this.branchName = branchName;
        this.treeView = treeView;
    }

    @Override
    public void act(PropertiesBean pb, Client client) {
        Project project;
        try {
            ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            project = client.downloadFullProject();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }

        Long branchId = (StringUtils.isNotEmpty(this.branchName))
            ? project.findBranch(this.branchName)
                .map(Branch::getId)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch")))
            : null;

        (new DryrunProjectFiles(project.getFiles(), project.getDirectories(), project.getBranches(), branchId)).run(treeView);
    }
}
