package com.crowdin.cli.commands.functionality;

import com.crowdin.client.core.model.Format;
import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
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

    public static ExportGlossaryRequest exportGlossary(Format format) {
        ExportGlossaryRequest request = new ExportGlossaryRequest();
        request.setFormat(format);
        return request;
    }

}
