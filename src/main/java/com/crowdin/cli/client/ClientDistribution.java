package com.crowdin.cli.client;

import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.distributions.model.*;

import java.util.List;

public interface ClientDistribution extends Client {

    List<Distribution> listDistribution();

    Distribution addDistribution(AddDistributionRequest request);

    Distribution addDistributionStringsBased(AddDistributionStringsBasedRequest request);

    DistributionRelease release(String hash);

    DistributionStringsBasedRelease releaseStringsBased(String hash);

    DistributionRelease getDistributionRelease(String hash);

    DistributionStringsBasedRelease getDistributionStringsBasedRelease(String hash);

    Distribution editDistribution(String hash, List<PatchRequest> request);
}
