package com.crowdin.cli.client;

import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import com.crowdin.client.glossaries.model.GlossaryImportStatus;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.glossaries.model.Term;
import com.crowdin.client.storage.model.Storage;

import java.io.InputStream;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiPredicate;

public class CrowdinClientGlossary extends CrowdinClientCore implements ClientGlossary {

    private final com.crowdin.client.Client client;

    public CrowdinClientGlossary(com.crowdin.client.Client client) {
        this.client = client;
    }

    @Override
    public List<Glossary> listGlossaries() {
        return executeRequestFullList((limit, offset) -> this.client.getGlossariesApi()
            .listGlossaries(null, limit, offset));
    }

    @Override
    public Optional<Glossary> getGlossary(Long glossaryId) {
        try {
            return Optional.of(executeRequest(() -> this.client.getGlossariesApi()
                .getGlossary(glossaryId)
                .getData()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Glossary addGlossary(AddGlossaryRequest request) {
        return executeRequest(() -> this.client.getGlossariesApi()
            .addGlossary(request)
            .getData());
    }

    @Override
    public GlossaryImportStatus importGlossary(Long glossaryId, ImportGlossaryRequest request) {
        Map<BiPredicate<String, String>, RuntimeException> errorHandler = new LinkedHashMap<BiPredicate<String, String>, RuntimeException>() {{
                put((code, message) -> code.equals("409") && message.contains("Another import is currently in progress"),
                    new RuntimeException("Another import is currently in progress. Please wait until it's finished."));
            }};
        return executeRequest(errorHandler, () -> this.client.getGlossariesApi()
            .importGlossary(glossaryId, request)
            .getData());
    }

    @Override
    public GlossaryExportStatus startExportingGlossary(Long glossaryId, ExportGlossaryRequest request) {
        return executeRequest(() -> this.client.getGlossariesApi()
            .exportGlossary(glossaryId, request)
            .getData());
    }

    @Override
    public GlossaryExportStatus checkExportingGlossary(Long glossaryId, String exportId) {
        return executeRequest(() -> this.client.getGlossariesApi()
            .checkGlossaryExportStatus(glossaryId, exportId)
            .getData());
    }

    @Override
    public URL downloadGlossary(Long glossaryId, String exportId) {
        return url(executeRequest(() -> this.client.getGlossariesApi()
            .downloadGlossary(glossaryId, exportId)
            .getData()));
    }

    @Override
    public List<Term> listTerms(Long glossaryId) {
        return executeRequestFullList((limit, offset) -> this.client.getGlossariesApi()
            .listTerms(glossaryId, null, null, null, null, limit, offset));
    }

    @Override
    public Long uploadStorage(String fileName, InputStream content) {
        Storage storage = executeRequest(() -> this.client.getStorageApi()
            .addStorage(fileName, content)
            .getData());
        return storage.getId();
    }
}
