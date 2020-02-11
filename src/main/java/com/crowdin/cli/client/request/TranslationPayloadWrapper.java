package com.crowdin.cli.client.request;

import com.crowdin.common.request.TranslationPayload;

public class TranslationPayloadWrapper extends TranslationPayload {

    public TranslationPayloadWrapper(Long fileId,
                                     boolean importDuplicates,
                                     boolean importEqSuggestions,
                                     boolean autoApproveImported,
                                     Long storageId) {
        setFileId(fileId);
        setImportDuplicates(importDuplicates);
        setImportEqSuggestions(importEqSuggestions);
        setAutoApproveImported(autoApproveImported);
        setStorageId(storageId);
    }

    public TranslationPayloadWrapper(Long fileId,
                                     boolean importDuplicates,
                                     boolean importEqSuggestions,
                                     boolean autoApproveImported) {
        setFileId(fileId);
        setImportDuplicates(importDuplicates);
        setImportEqSuggestions(importEqSuggestions);
        setAutoApproveImported(autoApproveImported);
    }

}
