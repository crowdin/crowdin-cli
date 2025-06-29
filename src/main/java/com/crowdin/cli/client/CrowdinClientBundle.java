package com.crowdin.cli.client;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.bundles.model.AddBundleRequest;
import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleExport;
import lombok.SneakyThrows;

import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiPredicate;

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
    public Bundle addBundle(AddBundleRequest addBundleRequest) {
        return executeRequest(() -> this.client.getBundlesApi()
                .addBundle(Long.valueOf(projectId), addBundleRequest)
                .getData());
    }

    @SneakyThrows
    @Override
    public Bundle getBundle(Long bundleId) {
        return executeRequest(() -> this.client.getBundlesApi()
                .getBundle(Long.valueOf(projectId), bundleId))
                .getData();
    }

    @Override
    public void deleteBundle(Long bundleId) {
        executeRequest(() -> this.client.getBundlesApi()
            .deleteBundle(Long.valueOf(projectId), bundleId));
    }

    @Override
    public URL downloadBundle(Long id, String exportId) {
        return url(executeRequest(() -> this.client.getBundlesApi()
                .downloadBundle(Long.valueOf(projectId), id, exportId)
                .getData()));
    }

    @Override
    public BundleExport startExportingBundle(Long id) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandler = new LinkedHashMap<>() {{
            put((code, message) -> message.contains("Another export is currently in progress. Please wait until it's finished."),
                new RepeatException("Another export is currently in progress. Please wait until it's finished."));
            put((code, message) -> Utils.isServerErrorCode(code), new RepeatException("Server Error"));
            put((code, message) -> message.contains("Request aborted"), new RepeatException("Request aborted"));
            put((code, message) -> message.contains("Connection reset"), new RepeatException("Connection reset"));
        }};
        return executeRequestWithPossibleRetries(
            errorHandler,
            () -> this.client.getBundlesApi()
                .exportBundle(Long.valueOf(projectId), id)
                .getData(),
            3,
            3 * 1000
        );
    }

    @Override
    public BundleExport checkExportingBundle(Long id, String exportId) {
        return executeRequest(() -> this.client.getBundlesApi()
                .checkBundleExportStatus(Long.valueOf(projectId), id, exportId)
                .getData());
    }

    @Override
    public String getBundleUrl(Long bundleId) {
        return this.getBundle(bundleId).getWebUrl();
    }

}