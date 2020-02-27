package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.StorageNotFoundResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.client.api.FilesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.request.FilePayload;
import com.crowdin.common.request.UpdateFilePayload;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

public class FileClient extends Client {

    public FileClient(Settings settings) {
        super(settings);
    }

    public List<FileEntity> getProjectFiles(String projectId) {
        return executePage((new FilesApi(settings)).getProjectFiles(projectId, Pageable.unpaged()));
    }

    public FileEntity updateFile(String projectId, String fileId, UpdateFilePayload updateFilePayload) throws ResponseException {
        try {
            return execute((new FilesApi(settings)).updateFile(projectId, fileId, updateFilePayload));
        } catch (Exception e) {
            if (StringUtils.contains(e.getMessage(), "File from storage with id #" + updateFilePayload.getStorageId() + " was not found")) {
                throw new StorageNotFoundResponseException();
            } else {
                throw new ResponseException(e.getMessage());
            }
        }
    }

    public FileEntity uploadFile(String projectId, FilePayload filePayload) throws ResponseException {
        try {
            return execute((new FilesApi(settings)).createFile(projectId, filePayload));
        } catch (Exception e) {
            if (StringUtils.contains(e.getMessage(), "File from storage with id #" + filePayload.getStorageId() + " was not found")) {
                throw new StorageNotFoundResponseException();
            } else {
                throw new ResponseException(e.getMessage());
            }
        }
    }
}
