package com.crowdin.cli.client;

import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.FilesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.FileEntity;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.response.Page;
import com.crowdin.util.PaginationUtil;

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
}
