package com.crowdin.cli.client;

import com.crowdin.client.bundles.model.AddBundleRequest;
import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleExport;

import java.net.URL;
import java.util.List;
import java.util.Optional;

public interface ClientBundle extends Client {

    List<Bundle> listBundle();

    Bundle addBundle(AddBundleRequest addBundleRequest);

    Optional<Bundle> getBundle(Long id);

    URL downloadBundle(Long id, String exportId);

    BundleExport startExportingBundle(Long id);

    BundleExport checkExportingBundle(Long tmId, String exportId);

}
