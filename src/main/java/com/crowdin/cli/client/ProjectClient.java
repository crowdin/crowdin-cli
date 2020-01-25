package com.crowdin.cli.client;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.DirectoriesApi;
import com.crowdin.client.api.ProjectsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.*;
import com.crowdin.common.response.Page;
import com.crowdin.exception.CrowdinException;
import com.crowdin.util.PaginationUtil;

import java.util.Collections;
import java.util.List;

import static com.crowdin.cli.utils.MessageSource.Messages.ERROR_PROJECT_NOT_FOUND;

public class ProjectClient extends Client {

    public ProjectClient(Settings settings) {
        super(settings);
    }

    public ProjectWrapper getProjectInfo(String projectId, boolean isDebug) {
        ProjectSettings project = getProject(projectId, isDebug);
        List<Language> supportedLanguages = Collections.emptyList();
        LanguagesClient languagesClient = new LanguagesClient(settings);
        try {
            supportedLanguages = languagesClient.getAllSupportedLanguages();
            System.out.println("\n" + MessageSource.RESOURCE_BUNDLE.getString("error_getting_supported_languages"));
        } catch (Exception e) {
            if (isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }

        List<Language> projectLanguages = languagesClient.getProjectLanguages(project);

        if (project.isInContext()) {
            Language pseudoLang = languagesClient.getLanguage(project.getInContextPseudoLanguageId());
            projectLanguages.add(pseudoLang);
        }

        List<FileEntity> projectFiles = new FileClient(settings).getProjectFiles(project.getId());
        CrowdinRequestBuilder<Page<Directory>> projectDirectories = new DirectoriesApi(this.settings)
                .getProjectDirectories(project.getId().toString(), Pageable.unpaged());
        List<Directory> directories = PaginationUtil.unpaged(projectDirectories);

        return new ProjectWrapper(project, projectFiles, directories, supportedLanguages, projectLanguages);
    }

    private ProjectSettings getProject(String projectId, boolean isDebug) {
        ProjectsApi api = new ProjectsApi(settings);
        ProjectSettings project = null;

        if (projectId == null || projectId.isEmpty()) {
            ConsoleSpinner.stop(ExecutionStatus.ERROR);
            System.out.println("message : project id is not defined");
            ConsoleUtils.exitError();
        }

        try {
            project = api.getProject(projectId).getResponseEntity().getEntity();
        } catch (Exception e) {
            ConsoleSpinner.stop(ExecutionStatus.ERROR);
            if (e instanceof CrowdinException && e.getMessage().toLowerCase().contains("404") && e.getMessage().toLowerCase().contains("not found")) {
                System.out.printf(ERROR_PROJECT_NOT_FOUND.getString(), projectId);
            } else {
                System.out.println("message : " + e.getMessage());
            }

            if (isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }

        return project;
    }
}
