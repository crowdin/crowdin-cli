package com.crowdin.cli.client;

import com.crowdin.client.api.FilesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.request.FilePayload;
import com.crowdin.common.request.UpdateFilePayload;

import java.util.List;

public class FileClient extends Client {

    public FileClient(Settings settings) {
        super(settings);
    }

    public List<FileEntity> getProjectFiles(String projectId) {
        return executePage((new FilesApi(settings)).getProjectFiles(projectId, Pageable.unpaged()));
    }

    public FileEntity updateFile(String projectId, String fileId, UpdateFilePayload updateFilePayload) {
        return execute((new FilesApi(settings)).updateFile(projectId, fileId, updateFilePayload));
    }

    public FileEntity uploadFile(String projectId, FilePayload filePayload) {
        return execute((new FilesApi(settings)).createFile(projectId, filePayload));
    }
}
