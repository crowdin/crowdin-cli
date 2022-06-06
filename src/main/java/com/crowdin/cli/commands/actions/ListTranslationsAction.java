package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.BranchLogic;
import com.crowdin.cli.commands.functionality.DryrunTranslations;
import com.crowdin.cli.commands.functionality.ProjectFilesUtils;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.sourcefiles.model.File;

import java.util.Map;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class ListTranslationsAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private boolean noProgress;
    private boolean treeView;
    private boolean isLocal;
    private boolean plainView;
    private boolean useServerSources;
    private boolean withInContextLang;

    public ListTranslationsAction(boolean noProgress, boolean treeView, boolean isLocal, boolean plainView, boolean useServerSources, boolean withInContextLang) {
        this.noProgress = noProgress;
        this.treeView = treeView;
        this.isLocal = isLocal;
        this.plainView = plainView;
        this.useServerSources = useServerSources;
        this.withInContextLang = withInContextLang;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles pb, ProjectClient client) {
        BranchLogic<CrowdinProjectFull> branchLogic = BranchLogic.noBranch();
        CrowdinProjectFull project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, () -> client.downloadFullProject(branchLogic));

        if (!project.isManagerAccess()) {
            if (!plainView) {
                System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        Map<String, File> files = ProjectFilesUtils.buildFilePaths(project.getDirectories(), project.getBranches(), project.getFiles());

        PlaceholderUtil placeholderUtil = new PlaceholderUtil(
            project.getSupportedLanguages(), project.getProjectLanguages(!isLocal), pb.getBasePath());

        (new DryrunTranslations(pb, project.getLanguageMapping(), placeholderUtil, project.getProjectLanguages(withInContextLang), false, files, useServerSources))
            .run(out, treeView, plainView);
    }
}
