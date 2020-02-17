package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.request.BranchPayload;

import java.util.List;
import java.util.Optional;

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
            return execute(new BranchesApi(settings).createBranch(projectId, branchPayload));
        } catch (Exception e) {
            throw new ResponseException("Exception while creating branch", e);
        }
    }

    public List<Branch> getAllSupportedBranches(String projectId) {
        return executePage(new BranchesApi(settings).getBranches(projectId, null));
    }
}
