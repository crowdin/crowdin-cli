package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.request.BranchPayload;
import com.crowdin.common.response.Page;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.PaginationUtil;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;

import javax.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public class BranchClient extends Client {

    private static final String CACHE_NAME = "branch";

    public BranchClient(Settings settings) {
        super(settings);
    }

    public Optional<Branch> getProjectBranchByName(String projectId, String name) {
        return getAllSupportedBranches(projectId)
            .stream()
            .filter(br -> br.getName().equals(name))
            .findFirst();
    }

    public Branch createBranch(String projectId, BranchPayload branchPayload) throws ResponseException {
        try {
            Response response = new BranchesApi(settings).createBranch(projectId, branchPayload).execute();
            return ResponseUtil.getResponceBody(response, new TypeReference<SimpleResponse<Branch>>() {
            }).getEntity();
        } catch (Exception e) {
            throw new ResponseException("Exception while creating branch", e);
        }
    }

    public List<Branch> getAllSupportedBranches(String projectId) {
        CrowdinRequestBuilder<Page<Branch>> branches = new BranchesApi(settings).getBranches(projectId, null);
        return PaginationUtil.unpaged(branches);
    }

    public Map<Long, String> getBranchesMapIdName(String projectId) throws ResponseException {
        try {
            return getAllSupportedBranches(projectId)
                    .stream()
                    .collect(Collectors.toMap(Branch::getId, Branch::getName));
        } catch (Exception e) {
            throw new ResponseException(e.getMessage());
        }
    }
}
