package com.crowdin.cli.commands.functionality;

import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translations.model.UploadTranslationsRequest;

import java.util.Map;

public class RequestBuilder {

    public static AddSourceStringRequest addString(String text, String identifier, Integer maxLength, String context, Long fileId, Boolean hidden) {
        AddSourceStringRequest request = new AddSourceStringRequest();
        request.setText(text);
        request.setIdentifier(identifier);
        request.setMaxLength(maxLength);
        request.setContext(context);
        request.setFileId(fileId);
        request.setIsHidden(hidden);
        return request;
    }

    public static UploadTranslationsRequest uploadTranslations(Long fileId, boolean importEqSuggestions, boolean autoApproveImported) {
        UploadTranslationsRequest request = new UploadTranslationsRequest();
        request.setFileId(fileId);
        request.setImportEqSuggestions(importEqSuggestions);
        request.setAutoApproveImported(autoApproveImported);
        return request;
    }

    public static PatchRequest patch(Object value, PatchOperation op, String path) {
        PatchRequest request = new PatchRequest();
        request.setValue(value);
        request.setOp(op);
        request.setPath(path);
        return request;
    }

    public static AddGlossaryRequest addGlossary(String name) {
        AddGlossaryRequest request = new AddGlossaryRequest();
        request.setName(name);
        return request;
    }

    public static ImportGlossaryRequest importGlossary(Long storageId, Map<String, Integer> scheme) {
        ImportGlossaryRequest request = new ImportGlossaryRequest();
        request.setStorageId(storageId);
        request.setScheme(scheme);
        return request;
    }

    public static ExportGlossaryRequest exportGlossary(GlossariesFormat format) {
        ExportGlossaryRequest request = new ExportGlossaryRequest();
        request.setFormat(format);
        return request;
    }

    public static AddTranslationMemoryRequest addTm(String name) {
        AddTranslationMemoryRequest request = new AddTranslationMemoryRequest();
        request.setName(name);
        return request;
    }

    public static TranslationMemoryImportRequest importTranslationMemory(Long storageId, Map<String, Integer> scheme) {
        TranslationMemoryImportRequest request = new TranslationMemoryImportRequest();
        request.setStorageId(storageId);
        request.setScheme(scheme);
        return request;
    }

    public static TranslationMemoryExportRequest exportTranslationMemory(
        String sourceLanguageId, String targetLanguageId, TranslationMemoryFormat format
    ) {
        TranslationMemoryExportRequest request = new TranslationMemoryExportRequest();
        request.setSourceLanguageId(sourceLanguageId);
        request.setTargetLanguageId(targetLanguageId);
        request.setFormat(format);
        return request;
    }

}
