package com.crowdin.cli.client;


import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleExport;
import com.crowdin.client.glossaries.model.Glossary;

import java.net.URL;
import java.util.List;
import java.util.Optional;

public class CrowdinClientBundle extends CrowdinClientCore implements ClientBundle {

    private final com.crowdin.client.Client client;
    private final String projectId;

    public CrowdinClientBundle(com.crowdin.client.Client client, String projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    public List<Bundle> listBundle() {
        return executeRequestFullList((limit, offset) -> this.client.getBundlesApi()
                .listBundles(Long.valueOf(projectId)));
    }

    @Override
    public Bundle addBundle(Bundle bundleRequest) {
        return executeRequest(() -> this.client.getBundlesApi()
                .addBundle(Long.valueOf(projectId), bundleRequest)
                .getData());
    }

    @Override
    public Optional<Bundle> getBundle(Long bundleId) {
        try {
            return Optional.of(executeRequest(() -> this.client.getBundlesApi()
                    .getBundle(Long.valueOf(projectId), bundleId))
                    .getData());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public URL downloadBundle(Long id, String exportId) {
        return url(executeRequest(() -> this.client.getBundlesApi()
                .downloadBundle(Long.valueOf(projectId), id, exportId)
                .getData()));
    }

    @Override
    public BundleExport startExportingBundle(Long id, Bundle bundle) {
        return executeRequest(() -> this.client.getBundlesApi()
                .exportBundle(Long.valueOf(projectId), id, bundle)
                .getData());
    }

    @Override
    public BundleExport checkExportingBundle(Long id, String exportId) {
        return executeRequest(() -> this.client.getBundlesApi()
                .checkBundleExportStatus(Long.valueOf(projectId), id, exportId)
                .getData());
    }

}