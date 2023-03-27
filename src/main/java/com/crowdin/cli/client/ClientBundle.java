package com.crowdin.cli.client;

import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleExport;
import com.crowdin.client.tasks.model.Status;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;

import java.net.URL;
import java.util.List;
import java.util.Optional;

public interface ClientBundle extends Client {

    List<Bundle> listBundle();

    Bundle addBundle(Bundle request);

    Optional<Bundle> getBundle(Long id);

    URL downloadBundle(Long id, String exportId);

    BundleExport startExportingBundle(Long id, Bundle bundle);

    BundleExport checkExportingBundle(Long tmId, String exportId);

}
