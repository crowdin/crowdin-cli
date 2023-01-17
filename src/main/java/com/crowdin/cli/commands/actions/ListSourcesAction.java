package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.DryrunObsoleteSources;
import com.crowdin.cli.commands.functionality.DryrunSources;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.Branch;

import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class ListSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private boolean deleteObsolete;
    private String branchName;
    private boolean noProgress;
    private boolean treeView;
    private boolean plainView;

    public ListSourcesAction(boolean deleteObsolete, String branchName, boolean noProgress, boolean treeView, boolean plainView) {
        this.deleteObsolete = deleteObsolete && !plainView;
        this.branchName = branchName;
        this.noProgress = noProgress || plainView;
        this.treeView = treeView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        CrowdinProject project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, (deleteObsolete) ? () -> client.downloadFullProject(this.branchName) : client::downloadProjectWithLanguages);
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), pb.getBasePath());

        if (!project.isManagerAccess() && deleteObsolete) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access_in_upload_sources_dryrun")));
                return;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_manager_access_in_upload_sources_dryrun"));
            }
        }

        if (deleteObsolete) {
            CrowdinProjectFull projectFull = (CrowdinProjectFull) project;
            Long branchId = Optional.ofNullable(((CrowdinProjectFull) project).getBranch())
                .map(Branch::getId)
                .orElse(null);
            (new DryrunObsoleteSources(pb, placeholderUtil, projectFull.getDirectories(branchId), projectFull.getFiles(branchId))).run(out, treeView, plainView);
        }
        (new DryrunSources(pb, placeholderUtil)).run(out, treeView, plainView);
    }
}
