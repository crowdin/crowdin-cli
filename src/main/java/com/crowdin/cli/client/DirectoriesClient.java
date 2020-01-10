package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.DirectoriesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.request.DirectoryPayload;
import com.crowdin.common.response.Page;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.PaginationUtil;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import org.apache.commons.lang3.StringUtils;

import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class DirectoriesClient extends Client {

    private String projectId;

    public DirectoriesClient(Settings settings, String projectId) {
        super(settings);
        this.projectId = projectId;
    }

    public Directory createDirectory(DirectoryPayload directoryPayload) throws ResponseException {
        DirectoriesApi api = new DirectoriesApi(settings);
        try {
            Response response = api.createDirectory(projectId, directoryPayload).execute();
            return ResponseUtil.getResponceBody(response, new TypeReference<SimpleResponse<Directory>>() {
            }).getEntity();
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
        DirectoriesApi api = new DirectoriesApi(settings);
        try {
            CrowdinRequestBuilder<Page<Directory>> directoriesApi = api.getProjectDirectories(projectId, Pageable.of(0, 500));
            return PaginationUtil.unpaged(directoriesApi);
        } catch (Exception e) {
            throw new ResponseException(e.getMessage());
        }
    }

    public Map<String, Long> getProjectDirectoriesMapPathId() throws ResponseException {
        Map<String, Long> directoryIdMap = new HashMap<>();
        Map<Long, Directory> directories = getProjectDirectories()
            .stream()
            .collect(Collectors.toMap(Directory::getId, Function.identity()));
        for (Long id : directories.keySet()) {
            Directory dir = directories.get(id);
            StringBuilder sb = new StringBuilder(dir.getName()).append(Utils.PATH_SEPARATOR);
            while (dir.getDirectoryId() != null) {
                dir = directories.get(dir.getDirectoryId());
                sb.insert(0, dir.getName() + Utils.PATH_SEPARATOR);
            }
            if (dir.getBranchId() != null) {
                sb.insert(0, dir.getBranchId() + Utils.PATH_SEPARATOR);
            }
            directoryIdMap.put(sb.toString(), id);
        }
        return directoryIdMap;
    }
}
