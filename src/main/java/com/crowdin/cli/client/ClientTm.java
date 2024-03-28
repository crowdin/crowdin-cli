package com.crowdin.cli.client;

import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportStatus;

import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.Optional;

public interface ClientTm extends Client {

    List<TranslationMemory> listTms();

    TranslationMemory getTm(Long tmId);

    TranslationMemory addTm(AddTranslationMemoryRequest request);

    TranslationMemoryImportStatus importTm(Long tmId, TranslationMemoryImportRequest request);

    TranslationMemoryExportStatus startExportingTm(Long tmId, TranslationMemoryExportRequest request);

    TranslationMemoryExportStatus checkExportingTm(Long tmId, String exportId);

    URL downloadTm(Long tmId, String exportId);

    Long uploadStorage(String fileName, InputStream content);
}
