package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class GlossaryDownloadAction implements NewAction<BaseProperties, ClientGlossary> {

    private final Long id;
    private final String name;
    private final GlossariesFormat format;
    private final boolean noProgress;
    private File to;
    private final FilesInterface files;

    public GlossaryDownloadAction(Long id, String name, GlossariesFormat format, boolean noProgress, File to, FilesInterface files) {
        this.id = id;
        this.name = name;
        this.format = format;
        this.noProgress = noProgress;
        this.to = to;
        this.files = files;
    }

    @Override
    public void act(Outputter out, BaseProperties pb, ClientGlossary client) {
        Glossary targetGlossary = getGlossary(client);
        if (to == null) {
            to = new File(targetGlossary.getName() + "." + ((format != null) ? format.toString().toLowerCase() : "tbx"));
        }
        GlossaryExportStatus status = this.buildGlossary(out, client, targetGlossary.getId(), RequestBuilder.exportGlossary(format));
        downloadGlossary(client, targetGlossary.getId(), status.getIdentifier());
        out.println(String.format(RESOURCE_BUNDLE.getString("message.glossary.download_success"), to));
    }

    private Glossary getGlossary(ClientGlossary client) {
        if (id != null) {
            return client.getGlossary(id)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.not_found_by_id")));
        } else if (name != null) {
            List<Glossary> foundGlossaries = client.listGlossaries().stream()
                .filter(gl -> gl.getName() != null && gl.getName().equals(name))
                .collect(Collectors.toList());
            if (foundGlossaries.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.not_found_by_name"));
            } else if (foundGlossaries.size() == 1) {
                return foundGlossaries.get(0);
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.more_than_one_glossary_by_that_name"));
            }
        } else {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.glossary.no_identifiers"));
        }
    }

    private GlossaryExportStatus buildGlossary(Outputter out, ClientGlossary client, Long glossaryId, ExportGlossaryRequest request) {
        return ConsoleSpinner.execute(
            out,
            "message.spinner.building_glossary",
            "error.glossary.build_glossary",
            this.noProgress,
            false,
            () -> {
                GlossaryExportStatus status = client.startExportingGlossary(glossaryId, request);

                while (!status.getStatus().equalsIgnoreCase("finished")) {
                    ConsoleSpinner.update(
                        String.format(RESOURCE_BUNDLE.getString("message.spinner.building_glossary_percents"),
                            status.getProgress()));
                    Thread.sleep(1000);

                    status = client.checkExportingGlossary(glossaryId, status.getIdentifier());

                    if (status.getStatus().equalsIgnoreCase("failed")) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                    }
                }

                ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_glossary_percents"), 100));

                return status;
            }
        );
    }

    private void downloadGlossary(ClientGlossary client, Long glossaryId, String exportId) {
        URL url = client.downloadGlossary(glossaryId, exportId);
        try (InputStream data = url.openStream()) {
            files.writeToFile(to.toString(), data);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), to), e);
        }
    }
}
