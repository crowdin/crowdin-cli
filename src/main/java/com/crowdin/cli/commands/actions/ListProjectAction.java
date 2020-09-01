package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.DryrunProjectFiles;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;
import org.apache.commons.lang3.StringUtils;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class ListProjectAction implements ClientAction {

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
    public void act(Outputter out, PropertiesBean pb, Client client) {
        CrowdinProjectFull project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadFullProject);

        Long branchId = (StringUtils.isNotEmpty(this.branchName))
            ? project.findBranchByName(this.branchName)
                .map(Branch::getId)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch")))
            : null;

        (new DryrunProjectFiles(project.getFileInfos(), project.getDirectories(), project.getBranches(), branchId)).run(out, treeView, plainView);
    }
}
