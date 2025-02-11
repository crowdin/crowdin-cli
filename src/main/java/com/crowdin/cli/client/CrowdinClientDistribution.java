package com.crowdin.cli.client;

import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.distributions.model.*;

import java.util.List;

public class CrowdinClientDistribution extends CrowdinClientCore implements ClientDistribution {

    private final com.crowdin.client.Client client;
    private final String projectId;

    public CrowdinClientDistribution(com.crowdin.client.Client client, String projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    @Override
    public List<Distribution> listDistribution() {
        return executeRequestFullList((limit, offset) -> this.client.getDistributionsApi()
            .listDistributions(Long.valueOf(projectId), limit, offset));
    }

    @Override
    public Distribution addDistribution(AddDistributionRequest distributionRequest) {
        return executeRequest(() -> this.client.getDistributionsApi()
            .addDistribution(Long.valueOf(projectId), distributionRequest)
            .getData());
    }

    @Override
    public Distribution addDistributionStringsBased(AddDistributionStringsBasedRequest distributionRequest) {
        return executeRequest(() -> this.client.getDistributionsApi()
            .addDistributionStringsBased(Long.valueOf(projectId), distributionRequest)
            .getData());
    }

    @Override
    public DistributionRelease release(String hash) {
        return executeRequest(() -> this.client.getDistributionsApi()
                                               .createDistributionRelease(Long.valueOf(projectId), hash)
                                               .getData());
    }

    @Override
    public DistributionStringsBasedRelease releaseStringsBased(String hash) {
        return executeRequest(() -> this.client.getDistributionsApi()
                                               .createDistributionStringsBasedRelease(Long.valueOf(projectId), hash)
                                               .getData());
    }

    @Override
    public DistributionRelease getDistributionRelease(String hash) {
        return executeRequest(() -> this.client.getDistributionsApi()
                                               .getDistributionRelease(Long.valueOf(projectId), hash)
                                               .getData());
    }

    @Override
    public DistributionStringsBasedRelease getDistributionStringsBasedRelease(String hash) {
        return executeRequest(() -> this.client.getDistributionsApi()
                                               .getDistributionStringsBasedRelease(Long.valueOf(projectId), hash)
                                               .getData());
    }

    @Override
    public Distribution editDistribution(String hash, List<PatchRequest> request) {
        return executeRequest(() -> this.client.getDistributionsApi()
                                               .editDistribution(Long.valueOf(projectId), hash, request)
                                               .getData());
    }
}
