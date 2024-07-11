package com.crowdin.cli.commands.functionality;

import com.crowdin.client.core.model.PatchOperation;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.core.model.Priority;
import com.crowdin.client.distributions.model.AddDistributionRequest;
import com.crowdin.client.distributions.model.ExportMode;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcestrings.model.*;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.Type;
import com.crowdin.client.tasks.model.CreateTaskRequest;
import com.crowdin.client.tasks.model.CreateTaskEnterpriseRequest;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translations.model.*;

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

    public static AddSourcePluralStringRequest addPluralString(String text, String identifier, Integer maxLength, String context, Long fileId, Boolean hidden, List<Long> labelIds,
        String one, String two, String few, String many, String zero) {
        AddSourcePluralStringRequest request = new AddSourcePluralStringRequest();
        PluralText pluralText = buildPluralText(text, one, two, few, many, zero);
        request.setText(pluralText);
        request.setIdentifier(identifier);
        request.setMaxLength(maxLength);
        request.setContext(context);
        request.setFileId(fileId);
        request.setIsHidden(hidden);
        request.setLabelIds(labelIds);
        return request;
    }

    public static AddSourceStringStringsBasedRequest addStringStringsBased(String text, String identifier, Integer maxLength, String context, Long branchId, Boolean hidden, List<Long> labelIds) {
        AddSourceStringStringsBasedRequest request = new AddSourceStringStringsBasedRequest();
        request.setText(text);
        request.setIdentifier(identifier);
        request.setMaxLength(maxLength);
        request.setContext(context);
        request.setBranchId(branchId);
        request.setIsHidden(hidden);
        request.setLabelIds(labelIds);
        return request;
    }

    public static AddSourcePluralStringStringsBasedRequest addPluralStringStringsBased(String text, String identifier, Integer maxLength, String context, Long branchId, Boolean hidden, List<Long> labelIds,
        String one, String two, String few, String many, String zero) {
        AddSourcePluralStringStringsBasedRequest request = new AddSourcePluralStringStringsBasedRequest();
        PluralText pluralText = buildPluralText(text, one, two, few, many, zero);
        request.setText(pluralText);
        request.setIdentifier(identifier);
        request.setMaxLength(maxLength);
        request.setContext(context);
        request.setBranchId(branchId);
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

    public static AddDistributionRequest addDistribution(String name, ExportMode exportMode, List<Long> fileIds, List<Integer> bundleIds) {
        AddDistributionRequest request = new AddDistributionRequest();
        Optional.ofNullable(name).ifPresent(request::setName);
        Optional.ofNullable(exportMode).ifPresent(request::setExportMode);
        Optional.ofNullable(fileIds).ifPresent(request::setFileIds);
        Optional.ofNullable(bundleIds).ifPresent(request::setBundleIds);
        return request;
    }

    public static CreateTaskRequest addCrowdinTask(String title, com.crowdin.client.tasks.model.Type type, String languageId, List<Long> fileId, String description, boolean skipAssignedStrings, boolean skipUntranslatedStrings, boolean includePreTranslatedStringsOnly, List<Long> labelIds) {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle(title);
        request.setType(type);
        request.setLanguageId(languageId);
        request.setFileIds(fileId);
        request.setDescription(description);
        request.setSkipAssignedStrings(skipAssignedStrings);
        request.setSkipUntranslatedStrings(skipUntranslatedStrings);
        request.setIncludePreTranslatedStringsOnly(includePreTranslatedStringsOnly);
        request.setLabelIds(labelIds);
        return request;
    }

    public static CreateTaskEnterpriseRequest addEnterpriseTask(String title, String languageId, List<Long> fileId, String description, boolean skipAssignedStrings, boolean includePreTranslatedStringsOnly, List<Long> labelIds, Long workflowStepId) {
        CreateTaskEnterpriseRequest request = new CreateTaskEnterpriseRequest();
        request.setTitle(title);
        request.setLanguageId(languageId);
        request.setFileIds(fileId);
        request.setDescription(description);
        request.setSkipAssignedStrings(skipAssignedStrings);
        request.setIncludePreTranslatedStringsOnly(includePreTranslatedStringsOnly);
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

    public static UploadTranslationsStringsRequest uploadTranslationsStrings(Long branchId, boolean importEqSuggestions, boolean autoApproveImported, boolean translateHidden) {
        UploadTranslationsStringsRequest request = new UploadTranslationsStringsRequest();
        request.setBranchId(branchId);
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

    public static CrowdinTranslationCreateProjectPseudoBuildForm crowdinTranslationCreateProjectPseudoBuildForm(
        long branchId, Boolean pseudo, Integer lengthCorrection, String prefix, String suffix, CharTransformation charTransformation
    ) {
        CrowdinTranslationCreateProjectPseudoBuildForm request
            = crowdinTranslationCreateProjectPseudoBuildForm(pseudo, lengthCorrection, prefix, suffix, charTransformation);

        request.setBranchId(branchId);

        return request;
    }

    public static CrowdinTranslationCreateProjectPseudoBuildForm crowdinTranslationCreateProjectPseudoBuildForm(
        Boolean pseudo, Integer lengthCorrection, String prefix, String suffix, CharTransformation charTransformation
    ) {
        CrowdinTranslationCreateProjectPseudoBuildForm request = new CrowdinTranslationCreateProjectPseudoBuildForm();
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
        Boolean duplicateTranslations, Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, List<Long> labelIds, Long aiPrompt
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
        request.setLabelIds(labelIds);
        request.setAiPromptId(aiPrompt);
        return request;
    }

    public static ApplyPreTranslationStringsBasedRequest applyPreTranslationStringsBased(
        List<String> languageIds, List<Long> branchId, Method method, Long engineId, AutoApproveOption autoApproveOption,
        Boolean duplicateTranslations, Boolean translateUntranslatedOnly, Boolean translateWithPerfectMatchOnly, List<Long> labelIds
    ) {
        ApplyPreTranslationStringsBasedRequest request = new ApplyPreTranslationStringsBasedRequest();
        request.setLanguageIds(languageIds);
        request.setBranchIds(branchId);
        request.setMethod(method);
        request.setEngineId(engineId);
        request.setAutoApproveOption(autoApproveOption);
        request.setDuplicateTranslations(duplicateTranslations);
        request.setTranslateUntranslatedOnly(translateUntranslatedOnly);
        request.setTranslateWithPerfectMatchOnly(translateWithPerfectMatchOnly);
        request.setLabelIds(labelIds);
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

    private static PluralText buildPluralText(String text, String one, String two, String few, String many, String zero) {
        PluralText pluralText = new PluralText();
        Optional.ofNullable(text).ifPresent(pluralText::setOther);
        Optional.ofNullable(one).ifPresent(pluralText::setOne);
        Optional.ofNullable(two).ifPresent(pluralText::setTwo);
        Optional.ofNullable(few).ifPresent(pluralText::setFew);
        Optional.ofNullable(many).ifPresent(pluralText::setMany);
        Optional.ofNullable(zero).ifPresent(pluralText::setZero);
        return pluralText;
    }
}
