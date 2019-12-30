package com.crowdin.cli.client;

import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.FilesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.request.FilePayload;
import com.crowdin.common.request.UpdateFilePayload;
import com.crowdin.common.response.Page;
import com.crowdin.util.PaginationUtil;

import javax.ws.rs.core.Response;
import java.util.List;

public class FileClient extends Client {

    public FileClient(Settings settings) {
        super(settings);
    }

    public List<FileEntity> getProjectFiles(Long projectId) {
        FilesApi filesApi = new FilesApi(settings);
        CrowdinRequestBuilder<Page<FileEntity>> getProjectFilesRequest = filesApi.getProjectFiles(projectId.toString(), Pageable.unpaged());
        return PaginationUtil.unpaged(getProjectFilesRequest);
    }

    public Response updateFile(String projectId, String fileId, UpdateFilePayload updateFilePayload) {
        FilesApi filesApi = new FilesApi(settings);
        return filesApi
                .updateFile(projectId, fileId, updateFilePayload)
                .execute();
    }

    public Response uploadFile(String projectId, FilePayload filePayload) {
        FilesApi filesApi = new FilesApi(settings);
        return filesApi
                .createFile(projectId, filePayload)
                .execute();
    }
}
