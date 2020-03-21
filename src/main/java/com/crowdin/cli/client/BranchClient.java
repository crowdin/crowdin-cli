package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.request.BranchPayload;

import java.util.List;
import java.util.Optional;

public class BranchClient extends Client {

    private String projectId;

    public BranchClient(Settings settings, String projectId) {
        super(settings);
        this.projectId = projectId;
    }

    public Branch createBranch(BranchPayload branchPayload) throws ResponseException {
        try {
            return execute(new BranchesApi(settings).createBranch(projectId, branchPayload));
        } catch (Exception e) {
            throw new ResponseException("Exception while creating branch", e);
        }
    }

    public List<Branch> getAllSupportedBranches() {
        return executePage(new BranchesApi(settings).getBranches(projectId, null));
    }
}
