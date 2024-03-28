package com.crowdin.cli.client;

import com.crowdin.client.storage.model.Storage;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportStatus;

import java.io.InputStream;
import java.net.URL;
import java.util.List;

public class CrowdinClientTm extends CrowdinClientCore implements ClientTm {

    private final com.crowdin.client.Client client;

    public CrowdinClientTm(com.crowdin.client.Client client) {
        this.client = client;
    }

    @Override
    public List<TranslationMemory> listTms() {
        return executeRequestFullList((limit, offset) -> this.client.getTranslationMemoryApi()
            .listTms(null, limit, offset, null));
    }

    @Override
    public TranslationMemory getTm(Long tmId) {
        return executeRequest(() -> this.client.getTranslationMemoryApi()
                .getTm(tmId)
                .getData());
    }

    @Override
    public TranslationMemory addTm(AddTranslationMemoryRequest request) {
        return executeRequest(() -> this.client.getTranslationMemoryApi()
            .addTm(request)
            .getData());
    }

    @Override
    public TranslationMemoryImportStatus importTm(Long tmId, TranslationMemoryImportRequest request) {
        return executeRequest(() -> this.client.getTranslationMemoryApi()
            .importTm(tmId, request)
            .getData());
    }

    @Override
    public TranslationMemoryExportStatus startExportingTm(Long tmId, TranslationMemoryExportRequest request) {
        return executeRequest(() -> this.client.getTranslationMemoryApi()
            .exportTm(tmId, request)
            .getData());
    }

    @Override
    public TranslationMemoryExportStatus checkExportingTm(Long tmId, String exportId) {
        return executeRequest(() -> this.client.getTranslationMemoryApi()
            .checkTmExportStatus(tmId, exportId)
            .getData());
    }

    @Override
    public URL downloadTm(Long tmId, String exportId) {
        return url(executeRequest(() -> this.client.getTranslationMemoryApi()
            .downloadTm(tmId, exportId)
            .getData()));
    }

    @Override
    public Long uploadStorage(String fileName, InputStream content) {
        Storage storage = executeRequest(() -> this.client.getStorageApi()
            .addStorage(fileName, content)
            .getData());
        return storage.getId();
    }
}
