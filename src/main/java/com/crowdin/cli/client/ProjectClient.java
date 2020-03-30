package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.OrganizationNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ProjectNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.UnauthorizedResponseException;
import com.crowdin.client.api.ProjectsApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.ProjectSettings;

public class ProjectClient extends Client {

    public ProjectClient(Settings settings) {
        super(settings);
    }

    public ProjectSettings getProject(String projectId) throws ResponseException {
        try {
            return execute((new ProjectsApi(settings)).getProject(projectId));
        } catch (Exception e) {
            if (e.getMessage().contains("Organization Not Found")) {
                throw new OrganizationNotFoundResponseException();
            } else if (e.getMessage().contains("Not Found")) {
                throw new ProjectNotFoundResponseException();
            } else if (e.getMessage().contains("Unauthorized")) {
                throw new UnauthorizedResponseException();
            } else {
                throw new ResponseException(e.getMessage());
            }
        }
    }
}
