package com.crowdin.cli.client;

import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.Distribution;
import com.crowdin.client.distributions.model.DistributionRelease;

import java.util.List;

public interface ClientDistribution extends Client {

    List<Distribution> listDistribution();

    Distribution addDistribution(AddDistributionRequest request);

    DistributionRelease release(String hash);


}
