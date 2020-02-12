package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.OrganizationNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ProjectNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.client.api.ProjectsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.ProjectSettings;

public class ProjectClient extends Client {

    public ProjectClient(Settings settings) {
        super(settings);
    }

    public ProjectSettings getProject(String projectId) throws ResponseException {
        try {
            return (new ProjectsApi(settings)).getProject(projectId).getResponseEntity().getEntity();
        } catch (Exception e) {
            if (e.getMessage().equalsIgnoreCase("Organization Not Found")) {
                throw new OrganizationNotFoundResponseException(e.getMessage());
            } else if (e.getMessage().contains("Not Found")) {
                throw new ProjectNotFoundResponseException(e.getMessage());
            } else {
                throw new ResponseException(e.getMessage());
            }
        }
    }
}
