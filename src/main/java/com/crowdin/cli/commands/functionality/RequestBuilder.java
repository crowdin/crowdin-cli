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
import com.crowdin.client.translations.model.ExportPrjoectTranslationRequest;
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

    public static AddGlossaryRequest addGlossaryEnterprise(String name, Long groupId) {
        AddGlossaryRequest request = new AddGlossaryRequest();
        request.setName(name);
        request.setGroupId(groupId);
        return request;
    }

    public static ImportGlossaryRequest importGlossary(Long storageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader) {
        ImportGlossaryRequest request = new ImportGlossaryRequest();
        request.setStorageId(storageId);
        request.setScheme(scheme);
        request.setFirstLineContainsHeader(firstLineContainsHeader);
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

    public static AddTranslationMemoryRequest addTmEnterprise(String name, Long groupId) {
        AddTranslationMemoryRequest request = new AddTranslationMemoryRequest();
        request.setName(name);
        request.setGroupId(groupId);
        return request;
    }

    public static TranslationMemoryImportRequest importTranslationMemory(
        Long storageId, Map<String, Integer> scheme, Boolean firstLineContainsHeader
    ) {
        TranslationMemoryImportRequest request = new TranslationMemoryImportRequest();
        request.setStorageId(storageId);
        request.setScheme(scheme);
        request.setFirstLineContainsHeader(firstLineContainsHeader);
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

    public static ExportPrjoectTranslationRequest exportProjectTranslation(
        String format, Boolean skipUntranslatedStrings, Boolean skipUntranslatedFiles, Integer exportWithMinApprovalsCount
    ) {
        ExportPrjoectTranslationRequest request = new ExportPrjoectTranslationRequest();
        request.setFormat(format);
        request.setSkipUntranslatedStrings(skipUntranslatedStrings);
        request.setSkipUntranslatedFiles(skipUntranslatedFiles);
        request.setExportWithMinApprovalsCount(exportWithMinApprovalsCount);
        return request;
    }

    public static ExportPrjoectTranslationRequest exportProjectTranslation(ExportPrjoectTranslationRequest request) {
        ExportPrjoectTranslationRequest copy = new ExportPrjoectTranslationRequest();
        copy.setTargetLanguageId(request.getTargetLanguageId());
        copy.setFormat(request.getFormat());
        copy.setBranchIds(request.getBranchIds());
        copy.setDirectoryIds(request.getDirectoryIds());
        copy.setFileIds(request.getFileIds());
        copy.setSkipUntranslatedStrings(request.getSkipUntranslatedStrings());
        copy.setSkipUntranslatedFiles(request.getSkipUntranslatedFiles());
        copy.setExportWithMinApprovalsCount(request.getExportWithMinApprovalsCount());
        return copy;
    }

}
