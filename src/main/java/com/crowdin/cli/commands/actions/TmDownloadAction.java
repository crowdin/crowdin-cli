package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class TmDownloadAction implements NewAction<BaseProperties, ClientTm> {

    private final Long id;
    private final String name;
    private final TranslationMemoryFormat format;
    private final String sourceLanguageId;
    private final String targetLanguageId;
    private final boolean noProgress;
    private File to;
    private final FilesInterface files;

    public TmDownloadAction(
        Long id, String name, TranslationMemoryFormat format, String sourceLanguageId,
        String targetLanguageId, boolean noProgress, File to, FilesInterface files
    ) {
        this.id = id;
        this.name = name;
        this.format = format;
        this.sourceLanguageId = sourceLanguageId;
        this.targetLanguageId = targetLanguageId;
        this.noProgress = noProgress;
        this.to = to;
        this.files = files;
    }

    @Override
    public void act(Outputter out, BaseProperties pb, ClientTm client) {
        TranslationMemory targetTm = getTranslationMemory(client);

        if (to == null) {
            to = new File(targetTm.getName() + "."
                + ((format != null) ? format.toString().toLowerCase() : TranslationMemoryFormat.TMX.toString().toLowerCase()));
        }

        TranslationMemoryExportStatus status =
            this.buildTranslationMemory(out, client, targetTm.getId(), RequestBuilder.exportTranslationMemory(sourceLanguageId, targetLanguageId, format));
        downloadTm(client, targetTm.getId(), status.getIdentifier());

        out.println(String.format(RESOURCE_BUNDLE.getString("message.tm.download_success"), to));
    }

    private TranslationMemory getTranslationMemory(ClientTm client) {
        if (id != null) {
            return client.getTm(id)
                .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.tm.not_found_by_id")));
        } else if (name != null) {
            List<TranslationMemory> foundTranslationMemories = client.listTms().stream()
                .filter(gl -> gl.getName() != null && gl.getName().equals(name))
                .collect(Collectors.toList());
            if (foundTranslationMemories.isEmpty()) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.tm.not_found_by_name"));
            } else if (foundTranslationMemories.size() == 1) {
                return foundTranslationMemories.get(0);
            } else {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.tm.more_than_one_tm_by_that_name"));
            }
        } else {
            throw new RuntimeException("Unexpected error: " + RESOURCE_BUNDLE.getString("error.tm.no_identifiers"));
        }
    }

    private TranslationMemoryExportStatus buildTranslationMemory(Outputter out, ClientTm client, Long tmId, TranslationMemoryExportRequest request) {
        return ConsoleSpinner.execute(
            out,
            "message.spinner.building_tm",
            "error.tm.build_tm",
            this.noProgress,
            false,
            () -> {
                TranslationMemoryExportStatus status = client.startExportingTm(tmId, request);

                while (!status.getStatus().equalsIgnoreCase("finished")) {
                    ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_tm_percents"), status.getProgress()));
                    Thread.sleep(1000);

                    status = client.checkExportingTm(tmId, status.getIdentifier());

                    if (status.getStatus().equalsIgnoreCase("failed")) {
                        throw new RuntimeException(RESOURCE_BUNDLE.getString("message.spinner.build_has_failed"));
                    }
                }

                ConsoleSpinner.update(String.format(RESOURCE_BUNDLE.getString("message.spinner.building_tm_percents"), 100));

                return status;
            }
        );
    }

    private void downloadTm(ClientTm client, Long tmId, String exportId) {
        URL url = client.downloadTm(tmId, exportId);
        try (InputStream data = url.openStream()) {
            files.writeToFile(to.toString(), data);
        } catch (IOException e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.write_file"), e);
        }
    }
}
