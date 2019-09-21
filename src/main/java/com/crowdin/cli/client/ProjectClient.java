package com.crowdin.cli.client;

import com.crowdin.cli.utils.ConsoleSpinner;
import com.crowdin.cli.utils.ConsoleUtils;
import com.crowdin.cli.utils.MessageSource;
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
        Project project = getProject(projectId, isDebug);
        List<Language> supportedLanguages = Collections.emptyList();
        try {
            supportedLanguages = new LanguagesClient(settings).getAllSupportedLanguages();
        } catch (Exception e) {
            System.out.println("\n" + MessageSource.RESOURCE_BUNDLE.getString("error_getting_supported_languages"));
            if (isDebug) {
                e.printStackTrace();
            }
            ConsoleUtils.exitError();
        }

        List<Language> projectLanguages = new LanguagesClient(settings).getProjectLanguages(project);
        List<FileEntity> projectFiles = new FileClient(settings).getProjectFiles(project.getId());
        CrowdinRequestBuilder<Page<Directory>> projectDirectories = new DirectoriesApi(this.settings)
                .getProjectDirectories(project.getId().toString(), Pageable.unpaged());
        List<Directory> directories = PaginationUtil.unpaged(projectDirectories);

        return new ProjectWrapper(project, projectFiles, directories, supportedLanguages, projectLanguages);
    }

    private Project getProject(String projectId, boolean isDebug) {
        ProjectsApi api = new ProjectsApi(settings);
        Project project = null;

        try {
            project = api.getProject(projectId).getResponseEntity().getEntity();
        } catch (Exception e) {
            ConsoleSpinner.stop();
            System.out.println(" - error");
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
