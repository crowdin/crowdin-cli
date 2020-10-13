package com.crowdin.cli.client;

import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.core.model.ResponseObject;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import com.crowdin.client.glossaries.model.GlossaryImportStatus;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.glossaries.model.Term;
import com.crowdin.client.projectsgroups.model.ProjectSettings;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.SourceString;
import com.crowdin.client.storage.model.Storage;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportStatus;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ExportPrjoectTranslationRequest;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translationstatus.model.LanguageProgress;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiPredicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;

class CrowdinClient extends CrowdinClientCore implements Client {

    private final com.crowdin.client.Client client;
    private final long projectId;

    public CrowdinClient(com.crowdin.client.Client client, long projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    @Override
    public CrowdinProjectFull downloadFullProject() {
        CrowdinProjectFull project = new CrowdinProjectFull();
        this.populateProjectWithInfo(project);
        this.populateProjectWithLangs(project);
        this.populateProjectWithStructure(project);
        return project;
    }

    @Override
    public CrowdinProject downloadProjectWithLanguages() {
        CrowdinProject project = new CrowdinProject();
        this.populateProjectWithInfo(project);
        this.populateProjectWithLangs(project);
        return project;
    }

    @Override
    public CrowdinProjectInfo downloadProjectInfo() {
        CrowdinProjectInfo project = new CrowdinProjectInfo();
        this.populateProjectWithInfo(project);
        return project;
    }

    private void populateProjectWithStructure(CrowdinProjectFull project) {
        project.setFiles(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listFiles(this.projectId, null, null, null, limit, offset)));
        project.setDirectories(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listDirectories(this.projectId, null, null, null, limit, offset)));
        project.setBranches(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listBranches(this.projectId, null, limit, offset)));
    }

    private void populateProjectWithLangs(CrowdinProject project) {
        project.setSupportedLanguages(executeRequestFullList((limit, offset) -> this.client.getLanguagesApi()
            .listSupportedLanguages(limit, offset)));
    }

    private void populateProjectWithInfo(CrowdinProjectInfo project) {
        com.crowdin.client.projectsgroups.model.Project projectModel = this.getProject();
        project.setProjectId(projectModel.getId());
        project.setProjectLanguages(projectModel.getTargetLanguages());
        if (projectModel instanceof ProjectSettings) {
            project.setAccessLevel(CrowdinProjectInfo.Access.MANAGER);
            ProjectSettings projectSettings = (ProjectSettings) projectModel;
            if (projectSettings.isInContext()) {
                project.setInContextLanguage(projectSettings.getInContextPseudoLanguage());
            }
            project.setLanguageMapping(LanguageMapping.fromServerLanguageMapping(projectSettings.getLanguageMapping()));
        } else {
            project.setAccessLevel(CrowdinProjectInfo.Access.TRANSLATOR);
        }
    }

    private com.crowdin.client.projectsgroups.model.Project getProject() {
        return executeRequest(
            () -> (com.crowdin.client.projectsgroups.model.Project) this.client.getProjectsGroupsApi()
                .getProject(this.projectId)
                .getData());
    }

    @Override
    public List<LanguageProgress> getProjectProgress(String languageId) {
        return executeRequestFullList((limit, offset) -> this.client.getTranslationStatusApi()
            .getProjectProgress(this.projectId, limit, offset, languageId));
    }

    @Override
    public Branch addBranch(AddBranchRequest request) {
        return executeRequest(() -> this.client.getSourceFilesApi()
            .addBranch(this.projectId, request)
            .getData());
    }

    @Override
    public Long uploadStorage(String fileName, InputStream content) {
        Storage storage = executeRequest(() -> this.client.getStorageApi()
            .addStorage(fileName, content)
            .getData());
        return storage.getId();
    }

    @Override
    public Directory addDirectory(AddDirectoryRequest request) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandlers = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
                put((code, message) -> StringUtils.containsAny(message, "Name must be unique", "This file is currently being updated"),
                    new ExistsResponseException());
                put((code, message) -> StringUtils.contains(message, "Already creating directory"),
                    new WaitResponseException());
            }};
        return executeRequest(errorHandlers, () -> this.client.getSourceFilesApi()
            .addDirectory(this.projectId, request)
            .getData());
    }

    @Override
    public void updateSource(Long sourceId, UpdateFileRequest request) {
        executeRequestWithPossibleRetry(
            (code, message) -> message.contains("File from storage with id #" + request.getStorageId() + " was not found"),
            () -> this.client.getSourceFilesApi()
                .updateOrRestoreFile(this.projectId, sourceId, request));
    }

    @Override
    public void addSource(AddFileRequest request) {
        executeRequestWithPossibleRetry(
            (code, message) -> message.contains("File from storage with id #" + request.getStorageId() + " was not found"),
            () -> this.client.getSourceFilesApi()
                .addFile(this.projectId, request));
    }

    @Override
    public void uploadTranslations(String languageId, UploadTranslationsRequest request) {
        executeRequestWithPossibleRetry(
            (code, message) -> message.contains("File from storage with id #" + request.getStorageId() + " was not found"),
            () -> this.client.getTranslationsApi()
                .uploadTranslations(this.projectId, languageId, request));
    }

    @Override
    public ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request) {
        return executeRequest(() -> this.client.getTranslationsApi()
            .buildProjectTranslation(this.projectId, request)
            .getData());
    }

    @Override
    public ProjectBuild checkBuildingTranslation(Long buildId) {
        return executeRequest(() -> this.client.getTranslationsApi()
            .checkBuildStatus(projectId, buildId)
            .getData());
    }

    @Override
    public URL downloadBuild(Long buildId) {
        return url(executeRequest(() -> this.client.getTranslationsApi()
            .downloadProjectTranslations(this.projectId, buildId)
            .getData()));
    }

    @Override
    public SourceString addSourceString(AddSourceStringRequest request) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .addSourceString(this.projectId, request)
            .getData());
    }

    @Override
    public List<SourceString> listSourceString(Long fileId, String filter) {
        return executeRequestFullList((limit, offset) -> this.client.getSourceStringsApi()
            .listSourceStrings(this.projectId, fileId, filter, limit, offset));
    }

    @Override
    public void deleteSourceString(Long sourceId) {
        executeRequest(() -> {
            this.client.getSourceStringsApi()
                .deleteSourceString(this.projectId, sourceId);
            return true;
        });
    }

    @Override
    public SourceString editSourceString(Long sourceId, List<PatchRequest> requests) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .editSourceString(this.projectId, sourceId, requests)
            .getData());
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
    public List<TranslationMemory> listTms() {
        return executeRequestFullList((limit, offset) -> this.client.getTranslationMemoryApi()
            .listTms(null, limit, offset));
    }

    @Override
    public Optional<TranslationMemory> getTm(Long tmId) {
        try {
            return Optional.of(executeRequest(() -> this.client.getTranslationMemoryApi()
                .getTm(tmId)
                .getData()));
        } catch (Exception e) {
            return Optional.empty();
        }
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
    public List<Term> listTerms(Long glossaryId) {
        return executeRequestFullList((limit, offset) -> this.client.getGlossariesApi()
            .listTerms(glossaryId, null, null, null, limit, offset));
    }

    @Override
    public URL exportProjectTranslation(ExportPrjoectTranslationRequest request) {
        return url(executeRequest(() -> this.client.getTranslationsApi()
            .exportProjectTranslation(this.projectId, request)
            .getData()));
    }

    private URL url(DownloadLink downloadLink) {
        try {
            return new URL(downloadLink.getUrl());
        } catch (IOException e) {
            throw new RuntimeException("Unexpected exception: malformed download url: " + downloadLink.getUrl(), e);
        }
    }

}
