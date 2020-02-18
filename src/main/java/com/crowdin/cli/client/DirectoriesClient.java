package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.client.api.DirectoriesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.request.DirectoryPayload;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

public class DirectoriesClient extends Client {

    private String projectId;

    public DirectoriesClient(Settings settings, String projectId) {
        super(settings);
        this.projectId = projectId;
    }

    public Directory createDirectory(DirectoryPayload directoryPayload) throws ResponseException {
        try {
            return execute(new DirectoriesApi(settings).createDirectory(projectId, directoryPayload));
        } catch(Exception e) {
            if (StringUtils.containsAny(e.getMessage(), "Name must be unique", "This file is currently being updated")) {
                throw new ExistsResponseException();
            } else if (StringUtils.contains(e.getMessage(), "Already creating directory")) {
                throw new WaitResponseException();
            } else {
                throw new ResponseException(e.getMessage());
            }
        }
    }

    public List<Directory> getProjectDirectories() throws ResponseException {
        try {
            return executePage((new DirectoriesApi(settings)).getProjectDirectories(projectId, Pageable.of(0, 500)));
        } catch (Exception e) {
            throw new ResponseException(e.getMessage());
        }
    }
}
