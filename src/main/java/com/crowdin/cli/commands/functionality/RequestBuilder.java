package com.crowdin.cli.commands.functionality;

import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.Type;
import com.crowdin.client.tasks.model.CrowdinTaskCreateFormRequest;
import com.crowdin.client.tasks.model.EnterpriseTaskCreateFormRequest;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translations.model.ApplyPreTranslationRequest;
import com.crowdin.client.translations.model.AutoApproveOption;
import com.crowdin.client.translations.model.CharTransformation;
import com.crowdin.client.translations.model.CrowdinTranslationCraeteProjectPseudoBuildForm;
import com.crowdin.client.translations.model.CrowdinTranslationCreateProjectBuildForm;
import com.crowdin.client.translations.model.ExportProjectTranslationRequest;
import com.crowdin.client.translations.model.Method;
import com.crowdin.client.translations.model.UploadTranslationsRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class RequestBuilder {

    public static AddSourceStringRequest addString(String text, String identifier, Integer maxLength, String context, Long fileId, Boolean hidden, List<Long> labelIds) {
        AddSourceStringRequest request = new AddSourceStringRequest();
        request.setText(text);
        request.setIdentifier(identifier);
        request.setMaxLength(maxLength);
        request.setContext(context);
        request.setFileId(fileId);
        request.setIsHidden(hidden);
        request.setLabelIds(labelIds);
        return request;
    }

    public static AddStringCommentRequest addComment(String text, String type, String language, String issueType,
                                                     String stringId) {
        AddStringCommentRequest request = new AddStringCommentRequest();
        Optional.ofNullable(type).ifPresent(t -> request.setType(Type.from(t)));
        Optional.ofNullable(stringId).ifPresent(id -> request.setStringId(Long.valueOf(id)));
        request.setText(text);
        request.setTargetLanguageId(language);
        request.setIssueType(issueType);
        return request;
    }

    public static CrowdinTaskCreateFormRequest addCrowdinTask(String title, Integer type, String languageId, List<Long> fileId, String description, boolean skipAssignedStrings, boolean skipUntranslatedStrings, List<Long> labelIds) {
        CrowdinTaskCreateFormRequest request = new CrowdinTaskCreateFormRequest();
        request.setTitle(title);
        request.setType(type);
        request.setLanguageId(languageId);
        request.setFileIds(fileId);
        request.setDescription(description);
        request.setSkipAssignedStrings(skipAssignedStrings);
        request.setSkipUntranslatedStrings(skipUntranslatedStrings);
        request.setLabelIds(labelIds);
        return request;
    }

    public static EnterpriseTaskCreateFormRequest addEnterpriseTask(String title, String languageId, List<Long> fileId, String description, boolean skipAssignedStrings, List<Long> labelIds, Long workflowStepId) {
        EnterpriseTaskCreateFormRequest request = new EnterpriseTaskCreateFormRequest();
        request.setTitle(title);
        request.setLanguageId(languageId);
        request.setFileIds(fileId);
        request.setDescription(description);
        request.setSkipAssignedStrings(skipAssignedStrings);
        request.setLabelIds(labelIds);
        request.setWorkflowStepId(workflowStepId);
        return request;
    }

    public static UploadTranslationsRequest uploadTranslations(Long fileId, boolean importEqSuggestions, boolean autoApproveImported, boolean translateHidden) {
        UploadTranslationsRequest request = new UploadTranslationsRequest();
        request.setFileId(fileId);
        request.setImportEqSuggestions(importEqSuggestions);
        request.setAutoApproveImported(autoApproveImported);
        request.setTranslateHidden(translateHidden);
        return request;
    }

    public static PatchRequest patch(Object value, PatchOperation op, String path) {
        PatchRequest request = new PatchRequest();
        request.setValue(value);
        request.setOp(op);
        request.setPath(path);
        return request;
    }

    public static AddGlossaryRequest addGlossary(String name, String languageId) {
        AddGlossaryRequest request = new AddGlossaryRequest();
        request.setName(name);
        request.setLanguageId(languageId);
        return request;
    }

    public static AddGlossaryRequest addGlossaryEnterprise(String name, String languageId, Long groupId) {
        AddGlossaryRequest request = new AddGlossaryRequest();
        request.setName(name);
        request.setLanguageId(languageId);
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

    public static AddTranslationMemoryRequest addTm(String name, String languageId) {
        AddTranslationMemoryRequest request = new AddTranslationMemoryRequest();
        request.setName(name);
        request.setLanguageId(languageId);
        return request;
    }

    public static AddTranslationMemoryRequest addTmEnterprise(String name, String languageId, Long groupId) {
        AddTranslationMemoryRequest request = new AddTranslationMemoryRequest();
        request.setName(name);
        request.setLanguageId(languageId);
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

    public static ExportProjectTranslationRequest exportProjectTranslation(
        String format, Boolean skipUntranslatedStrings, Boolean skipUntranslatedFiles, Boolean exportApprovedOnly
    ) {
        ExportProjectTranslationRequest request = new ExportProjectTranslationRequest();
        request.setFormat(format);
        request.setSkipUntranslatedStrings(skipUntranslatedStrings);
        request.setSkipUntranslatedFiles(skipUntranslatedFiles);
        request.setExportApprovedOnly(exportApprovedOnly);
        return request;
    }

    public static ExportProjectTranslationRequest exportProjectTranslation(
        String format, Boolean skipUntranslatedStrings, Boolean skipUntranslatedFiles, Integer exportWithMinApprovalsCount, Boolean exportStringsThatPassedWorkflow
    ) {
        ExportProjectTranslationRequest request = new ExportProjectTranslationRequest();
        request.setFormat(format);
        request.setSkipUntranslatedStrings(skipUntranslatedStrings);
        request.setSkipUntranslatedFiles(skipUntranslatedFiles);
        request.setExportWithMinApprovalsCount(exportWithMinApprovalsCount);
        request.setExportStringsThatPassedWorkflow(exportStringsThatPassedWorkflow);
        return request;
    }

    public static ExportProjectTranslationRequest exportProjectTranslation(ExportProjectTranslationRequest request) {
        ExportProjectTranslationRequest copy = new ExportProjectTranslationRequest();
        copy.setTargetLanguageId(request.getTargetLanguageId());
        copy.setFormat(request.getFormat());
        copy.setLabelIds(request.getLabelIds());
        copy.setBranchIds(request.getBranchIds());
        copy.setDirectoryIds(request.getDirectoryIds());
        copy.setFileIds(request.getFileIds());
        copy.setSkipUntranslatedStrings(request.getSkipUntranslatedStrings());
        copy.setSkipUntranslatedFiles(request.getSkipUntranslatedFiles());
        copy.setExportApprovedOnly(request.getExportApprovedOnly());
        copy.setExportWithMinApprovalsCount(request.getExportWithMinApprovalsCount());
        copy.setExportStringsThatPassedWorkflow(request.getExportStringsThatPassedWorkflow());
        return copy;
    }

    public static CrowdinTranslationCraeteProjectPseudoBuildForm crowdinTranslationCreateProjectPseudoBuildForm(
        long branchId, Boolean pseudo, Integer lengthCorrection, String prefix, String suffix, CharTransformation charTransformation
    ) {
        CrowdinTranslationCraeteProjectPseudoBuildForm request
            = crowdinTranslationCreateProjectPseudoBuildForm(pseudo, lengthCorrection, prefix, suffix, charTransformation);

        request.setBranchId(branchId);

        return request;
    }

    public static CrowdinTranslationCraeteProjectPseudoBuildForm crowdinTranslationCreateProjectPseudoBuildForm(
        Boolean pseudo, Integer lengthCorrection, String prefix, String suffix, CharTransformation charTransformation
    ) {
        CrowdinTranslationCraeteProjectPseudoBuildForm request = new CrowdinTranslationCraeteProjectPseudoBuildForm();
        request.setPseudo(pseudo);
        request.setLengthTransformation(lengthCorrection);
        request.setPrefix(prefix);
        request.setSuffix(suffix);
        request.setCharTransformation(charTransformation);
        return request;
    }

    public static CrowdinTranslationCreateProjectBuildForm crowdinTranslationCreateProjectBuildForm(
        CrowdinTranslationCreateProjectBuildForm request
    ) {
        CrowdinTranslationCreateProjectBuildForm requestCopy = new CrowdinTranslationCreateProjectBuildForm();
        requestCopy.setBranchId(request.getBranchId());
        requestCopy.setTargetLanguageIds(request.getTargetLanguageIds());
        requestCopy.setSkipUntranslatedStrings(request.getSkipUntranslatedStrings());
        requestCopy.setSkipUntranslatedFiles(request.getSkipUntranslatedFiles());
        requestCopy.setExportApprovedOnly(request.getExportApprovedOnly());
        requestCopy.setExportWithMinApprovalsCount(request.getExportWithMinApprovalsCount());
        requestCopy.setExportStringsThatPassedWorkflow(request.getExportStringsThatPassedWorkflow());
        return requestCopy;
    }

    public static AddLabelRequest addLabel(String title) {
        AddLabelRequest request = new AddLabelRequest();
        request.setTitle(title);
        return request;
    }

    public static List<PatchRequest> updateExcludedTargetLanguages(List<String> excludedTargetLanguages) {
        List<PatchRequest> request = new ArrayList<>();
        PatchRequest patchRequest = new PatchRequest();
        patchRequest.setPath("/excludedTargetLanguages");
        patchRequest.setOp(PatchOperation.REPLACE);
        patchRequest.setValue(excludedTargetLanguages);
        request.add(patchRequest);
        return request;
    }

    public static ApplyPreTranslationRequest applyPreTranslation(
        List<String> languageIds, List<Long> fileIds, Method method, Long engineId, AutoApproveOption autoApproveOption,
        Boolean duplicateTranslations, Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly
    ) {
        ApplyPreTranslationRequest request = new ApplyPreTranslationRequest();
        request.setLanguageIds(languageIds);
        request.setFileIds(fileIds);
        request.setMethod(method);
        request.setEngineId(engineId);
        request.setAutoApproveOption(autoApproveOption);
        request.setDuplicateTranslations(duplicateTranslations);
        request.setTranslateUntranslatedOnly(translateUntranslatedOnly);
        request.setTranslateWithPerfectMatchOnly(translateWithPerfectMatchOnly);
        return request;
    }

    public static AddBranchRequest addBranch(String name, String title, String exportPattern, Priority priority) {
        AddBranchRequest request = new AddBranchRequest();
        request.setName(name);
        request.setTitle(title);
        request.setExportPattern(exportPattern);
        request.setPriority(priority);
        return request;
    }

}
