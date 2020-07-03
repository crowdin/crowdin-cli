package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.DryrunSources;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class ListSourcesAction implements Action {

    private boolean noProgress;
    private boolean treeView;
    private boolean plainView;

    public ListSourcesAction(boolean noProgress, boolean treeView, boolean plainView) {
        this.noProgress = noProgress || plainView;
        this.treeView = treeView;
        this.plainView = plainView;
    }

    @Override
    public void act(PropertiesBean pb, Client client) {
        Project project;
        try {
            if (!plainView) {
                ConsoleSpinner.start(RESOURCE_BUNDLE.getString("message.spinner.fetching_project_info"), this.noProgress);
            }
            project = client.downloadProjectWithLanguages();
            ConsoleSpinner.stop(OK);
        } catch (Exception e) {
            ConsoleSpinner.stop(ERROR);
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.collect_project_info"), e);
        }
        PlaceholderUtil placeholderUtil = new PlaceholderUtil(project.getSupportedLanguages(), project.getProjectLanguages(false), pb.getBasePath());

        (new DryrunSources(pb, placeholderUtil)).run(treeView, plainView);
    }
}
