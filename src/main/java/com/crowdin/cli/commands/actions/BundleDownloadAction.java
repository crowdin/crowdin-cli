package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.client.MaxNumberOfRetriesException;
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
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.*;

public class BundleDownloadAction implements NewAction<ProjectProperties, ClientBundle> {

    private final Long id;
    private final FilesInterface files;
    private final boolean noProgress;
    private final boolean plainView;
    private final boolean keepArchive;
    private final boolean dryrun;
    private File to;

    private Outputter out;

    public BundleDownloadAction(Long id, FilesInterface files, boolean plainView, boolean keepArchive, boolean noProgress, boolean dryrun) {
        this.id = id;
        this.files = files;
        this.plainView = plainView;
        this.keepArchive = keepArchive;
        this.noProgress = noProgress;
        this.dryrun = dryrun;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ClientBundle client) {
        this.out = out;
        Bundle bundle = getBundle(client);
        BundleExport status = this.buildBundle(out, client, bundle.getId());
        if (status == null) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.bundle.build_bundle"));
        }
        to = new File("bundle-" + status.getIdentifier() + ".zip");
        downloadBundle(client, bundle.getId(), status.getIdentifier());
        out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.bundle.download_success"), bundle.getId(), bundle.getName())));

        List<String> extractedPaths;
        String baseTemp = StringUtils.removeEnd(pb.getBasePath(), Utils.PATH_SEPARATOR) + Utils.PATH_SEPARATOR;
        File baseTempDir = new File(baseTemp + Utils.PATH_SEPARATOR);
        if (dryrun) {
            extractedPaths = files.zipArchiveContent(to);
        } else {
            List<File> downloadedFiles = extractArchive(to, baseTempDir);
            extractedPaths = downloadedFiles.stream().map(File::getAbsolutePath).collect(Collectors.toList());
        }

        for (String file: extractedPaths) {
            String filePath = Utils.noSepAtStart(StringUtils.removeStart(file, baseTempDir.getAbsolutePath()));
            out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.file_path"), filePath)));
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
        return client.getBundle(id);
    }

    private BundleExport buildBundle(Outputter out, ClientBundle client, Long bundleId) {
        return ConsoleSpinner.execute(
                out,
                "message.spinner.building_bundle",
                "error.bundle.build_bundle",
                this.noProgress,
                false,
                () -> {
                    BundleExport status = null;
                    try {
                        status = client.startExportingBundle(bundleId);

                        while (!status.getStatus().equalsIgnoreCase("finished")) {
                            ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_bundle_percents"), status.getProgress()));
                            Thread.sleep(1000);

                            status = client.checkExportingBundle(bundleId, status.getIdentifier());

                            if (status.getStatus().equalsIgnoreCase("failed")) {
                                throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                            }
                        }

                        ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_bundle_percents"), 100));
                    } catch (MaxNumberOfRetriesException e) {
                        ConsoleSpinner.stop(ERROR);
                        throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("message.warning.maximum_retries_exceeded"), 3));
                    }
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
