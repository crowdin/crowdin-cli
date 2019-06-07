package com.crowdin.cli.client;

import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.response.Page;
import com.crowdin.util.PaginationUtil;

import java.util.List;
import java.util.Optional;

public class BranchClient extends Client {

    public BranchClient(Settings settings) {
        super(settings);
    }

    public Optional<Branch> getProjectBranchByName(Long projectId, String name) {
        return getAllSupportedBranches(projectId.toString()).stream()
                .filter(branch -> branch.getName().equalsIgnoreCase(name))
                .findFirst();
    }

    public List<Branch> getAllSupportedBranches(String projectId) {
        CrowdinRequestBuilder<Page<Branch>> branches = new BranchesApi(settings).getBranches(projectId, null);
        return PaginationUtil.unpaged(branches);
    }
}
