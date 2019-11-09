package com.crowdin.cli.client;

import com.crowdin.cli.utils.CacheUtil;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.BranchesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Branch;
import com.crowdin.common.response.Page;
import com.crowdin.util.PaginationUtil;
import org.apache.commons.lang3.tuple.Pair;

import java.util.List;
import java.util.Optional;

public class BranchClient extends Client {

    private static final String CACHE_NAME = "branch";

    public BranchClient(Settings settings) {
        super(settings);
    }

    public Optional<Branch> getProjectBranchByName(Long projectId, String name) {
        Branch branch = CacheUtil.computeIfAbsent(
                CACHE_NAME,
                Pair.of(projectId, name),
                key -> getAllSupportedBranches(projectId.toString()).stream()
                        .filter(b -> b.getName().equalsIgnoreCase(name))
                        .findFirst()
                        .orElse(null)
        );
        return Optional.ofNullable(branch);
    }

    private List<Branch> getAllSupportedBranches(String projectId) {
        CrowdinRequestBuilder<Page<Branch>> branches = new BranchesApi(settings).getBranches(projectId, null);
        return PaginationUtil.unpaged(branches);
    }
}
