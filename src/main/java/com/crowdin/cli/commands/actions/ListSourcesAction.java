package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.DryrunSources;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;

class ListSourcesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private boolean noProgress;
    private boolean treeView;
    private boolean plainView;

    public ListSourcesAction(boolean noProgress, boolean treeView, boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.treeView = treeView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        CrowdinProject project = ConsoleSpinner
            .execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
                this.noProgress, this.plainView, client::downloadProjectWithLanguages);
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), pb.getBasePath());

        (new DryrunSources(pb, placeholderUtil)).run(out, treeView, plainView);
    }
}
