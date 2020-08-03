package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.commands.functionality.DryrunTranslations;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;

import java.util.Optional;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class ListTranslationsAction implements ClientAction {

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
    public void act(Outputter out, PropertiesBean pb, Client client) {
        CrowdinProject project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, client::downloadProjectWithLanguages);

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
            .run(out, treeView, plainView);
    }
}
