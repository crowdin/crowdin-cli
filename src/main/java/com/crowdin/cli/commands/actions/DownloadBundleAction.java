package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.*;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleExport;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public class DownloadBundleAction implements NewAction<ProjectProperties, ClientBundle> {

    private final Long id;
    private FilesInterface files;
    private boolean noProgress;
    private boolean plainView;
    private boolean keepArchive;
    private File to;

    private Outputter out;

    public DownloadBundleAction(Long id, FilesInterface files, boolean plainView, boolean keepArchive, boolean noProgress) {
        this.id = id;
        this.files = files;
        this.plainView = plainView;
        this.keepArchive = keepArchive;
        this.noProgress = noProgress;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        this.out = out;
        Bundle bundle = getBundle(client);
        BundleExport status = this.buildBundle(out, client, bundle.getId(), bundle);
        to = new File("bundle-" + status.getIdentifier() + ".zip");
        downloadBundle(client, bundle.getId(), status.getIdentifier());
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.bundle.download_success"), bundle.getId(), bundle.getName())));

        String baseTemp = StringUtils.removeEnd(pb.getBasePath(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR;
        java.io.File baseTempDir = new java.io.File(baseTemp + Utils.PATH_SEPARATOR);
        List<java.io.File> downloadedFiles = extractArchive(to, baseTempDir);

        for (File file: downloadedFiles) {
            String filePath = Utils.noSepAtStart(StringUtils.removeStart(file.getAbsolutePath(), baseTempDir.getAbsolutePath()));
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.extracted_file"), filePath)));
        }

        if (!keepArchive) {
            try {
                files.deleteFile(to);
            } catch (IOException e) {
                out.println(ERROR.withIcon(String.format(RESOURCE_BUNDLE.getString("error.deleting_archive"), to)));
            }
        } else {
            if (!plainView) {
                out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.archive"), to.getAbsolutePath())));
            } else {
                out.println(to.getAbsolutePath());
            }
        }
    }

    private Bundle getBundle(ClientBundle client) {
        return client.getBundle(id)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.bundle.not_found_by_id")));
    }

    private BundleExport buildBundle(Outputter out, ClientBundle client, Long bundleId, Bundle request) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.building_bundle",
                "error.bundle.build_bundle",
                this.noProgress,
                false,
                () -> {
                    BundleExport status = client.startExportingBundle(bundleId, request);

                    while (!status.getStatus().equalsIgnoreCase("finished")) {
                        ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_bundle_percents"), status.getProgress()));
                        Thread.sleep(1000);

                        status = client.checkExportingBundle(bundleId, status.getIdentifier());

                        if (status.getStatus().equalsIgnoreCase("failed")) {
                            throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                        }
                    }

                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_bundle_percents"), 100));

                    return status;
                }
        );
    }

    private void downloadBundle(ClientBundle client, Long bundleId, String exportId) {
        URL url = client.downloadBundle(bundleId, exportId);
        try (InputStream data = url.openStream()) {
            files.writeToFile(to.toString(), data);
        } catch (IOException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.write_file"), e);
        }
    }

    private List<File> extractArchive(java.io.File zipArchive, java.io.File dir) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.extracting_archive",
                "error.extracting_files",
                this.noProgress,
                this.plainView,
                () -> files.extractZipArchive(zipArchive, dir)
        );
    }
}
