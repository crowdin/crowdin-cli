package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.Project;
import com.crowdin.cli.commands.functionality.DryrunTranslations;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;

import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class ListTranslationsAction implements Action {

    private boolean noProgress;
    private boolean treeView;
    private boolean isLocal;
    private boolean plainView;

    public ListTranslationsAction(boolean noProgress, boolean treeView, boolean isLocal, boolean plainView) {
        this.noProgress = noProgress;
        this.treeView = treeView;
        this.isLocal = isLocal;
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

        if (!project.isManagerAccess()) {
            if (!plainView) {
                System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(
            project.getSupportedLanguages(), project.getProjectLanguages(!isLocal), pb.getBasePath());

        (new DryrunTranslations(pb, project.getLanguageMapping(), placeholderUtil, Optional.empty(), false))
            .run(treeView, plainView);
    }
}
