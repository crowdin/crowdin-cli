package com.crowdin.cli.client;

import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.projectsgroups.model.ProjectSettings;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.BuildReviewedSourceFilesRequest;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.ReviewedStringsBuild;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.SourceString;
import com.crowdin.client.storage.model.Storage;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.translations.model.ApplyPreTranslationRequest;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ExportProjectTranslationRequest;
import com.crowdin.client.translations.model.PreTranslationStatus;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translationstatus.model.LanguageProgress;
import org.apache.commons.lang3.StringUtils;

import java.io.InputStream;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiPredicate;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class CrowdinProjectClient extends CrowdinClientCore implements ProjectClient {

    private final com.crowdin.client.Client client;
    private final long projectId;

    public CrowdinProjectClient(com.crowdin.client.Client client, long projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    @Override
    public CrowdinProjectFull downloadFullProject(String branchName) {
        CrowdinProjectFull project = new CrowdinProjectFull();
        this.populateProjectWithInfo(project);
        this.populateProjectWithLangs(project);
        this.populateProjectWithStructure(project, branchName);
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

    private void populateProjectWithStructure(CrowdinProjectFull project, String branchName) {
        project.setBranches(this.listBranches());
        Optional.ofNullable(branchName)
                .map(name -> project.findBranchByName(name)
                        .orElseThrow(() -> new RuntimeException(RESOURCE_BUNDLE.getString("error.not_found_branch")))
                )
                .ifPresent(project::setBranch);
        Long branchId = Optional.ofNullable(project.getBranch()).map(Branch::getId).orElse(null);
        project.setFiles(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listFiles(this.projectId, branchId, null, null, true, limit, offset)));
        project.setDirectories(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listDirectories(this.projectId, branchId, null, null, true, limit, offset)));
    }

    private void populateProjectWithLangs(CrowdinProject project) {
        project.setSupportedLanguages(executeRequestFullList((limit, offset) -> this.client.getLanguagesApi()
            .listSupportedLanguages(limit, offset)));
    }

    private void populateProjectWithInfo(CrowdinProjectInfo project) {
        com.crowdin.client.projectsgroups.model.Project projectModel = this.getProject();
        project.setProjectId(projectModel.getId());
        project.setSourceLanguageId(projectModel.getSourceLanguageId());
        project.setProjectLanguages(projectModel.getTargetLanguages());
        if (projectModel instanceof ProjectSettings) {
            project.setAccessLevel(CrowdinProjectInfo.Access.MANAGER);
            ProjectSettings projectSettings = (ProjectSettings) projectModel;
            if (projectSettings.getInContext() != null && projectSettings.getInContext()) {
                project.setInContextLanguage(projectSettings.getInContextPseudoLanguage());
            }
            if (projectSettings.getSkipUntranslatedFiles() != null && projectSettings.getSkipUntranslatedFiles()) {
                project.setSkipUntranslatedFiles(projectSettings.getSkipUntranslatedFiles());
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
    public List<LanguageProgress> getBranchProgress(Long branchId) {
        return executeRequestFullList((limit, offset) -> this.client.getTranslationStatusApi()
            .getBranchProgress(this.projectId, branchId, limit, offset));
    }

    @Override
    public Branch addBranch(AddBranchRequest request) {
        return executeRequest(() -> this.client.getSourceFilesApi()
            .addBranch(this.projectId, request)
            .getData());
    }

    @Override
    public void deleteBranch(Long branchId) {
        executeRequest(() -> {
            this.client.getSourceFilesApi()
                .deleteBranch(this.projectId, branchId);
            return null;
        });
    }

    @Override
    public List<Branch> listBranches() {
        return executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listBranches(this.projectId, null, limit, offset));
    }

    @Override
    public Long uploadStorage(String fileName, InputStream content) throws  ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandlers = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
            put((code, message) -> StringUtils.containsAny(message, "streamIsEmpty", "Stream size is null. Not empty content expected"),
                    new EmptyFileException("Not empty content expected"));
        }};
        Storage storage = executeRequest(errorHandlers, () -> this.client.getStorageApi()
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
    public void deleteDirectory(Long directoryId) {
        executeRequest(() -> {
            this.client.getSourceFilesApi()
                .deleteDirectory(this.projectId, directoryId);
            return null;
        });
    }

    @Override
    public void updateSource(Long sourceId, UpdateFileRequest request) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandlers = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
            put((code, message) -> message.contains("File from storage with id #" + request.getStorageId() + " was not found"), new RepeatException());
            put((code, message) -> StringUtils.contains(message, "Invalid SRX specified"), new ResponseException("Invalid SRX file specified"));
        }};
        executeRequestWithPossibleRetry(
            errorHandlers,
            () -> this.client.getSourceFilesApi()
                .updateOrRestoreFile(this.projectId, sourceId, request));
    }

    @Override
    public void addSource(AddFileRequest request) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandlers = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
            put((code, message) -> message.contains("File from storage with id #" + request.getStorageId() + " was not found"), new RepeatException());
            put((code, message) -> StringUtils.contains(message, "Name must be unique"), new ExistsResponseException());
            put((code, message) -> StringUtils.contains(message, "Invalid SRX specified"), new ResponseException("Invalid SRX file specified"));
            put((code, message) -> StringUtils.containsAny(message, "isEmpty", "Value is required and can't be empty"), new EmptyFileException("Value is required and can't be empty"));
        }};
        executeRequestWithPossibleRetry(
            errorHandlers,
            () -> this.client.getSourceFilesApi()
                .addFile(this.projectId, request));
    }

    @Override
    public void editSource(Long fileId, List<PatchRequest> request) {
        executeRequest(() -> this.client.getSourceFilesApi()
            .editFile(this.projectId, fileId, request));
    }

    @Override
    public void deleteSource(Long fileId) {
        executeRequest(() -> {
            this.client.getSourceFilesApi()
                .deleteFile(this.projectId, fileId);
            return null;
        });
    }

    @Override
    public void uploadTranslations(String languageId, UploadTranslationsRequest request) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorhandlers = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
            put((code, message) -> code.equals("0") && message.equals("File is not allowed for language"),
                new WrongLanguageException());
            put((code, message) -> message.contains("File from storage with id #" + request.getStorageId() + " was not found"),
                new RepeatException());
        }};
        executeRequestWithPossibleRetry(
            errorhandlers,
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
    public ReviewedStringsBuild startBuildingReviewedSources(BuildReviewedSourceFilesRequest request) {
        return executeRequest(() -> this.client.getSourceFilesApi()
                .buildReviewedSourceFiles(this.projectId, request)
                .getData());
    }

    @Override
    public ReviewedStringsBuild checkBuildingReviewedSources(Long buildId) {
        return executeRequest(() -> this.client.getSourceFilesApi()
                .checkReviewedSourceFilesBuildStatus(projectId, buildId)
                .getData());
    }

    @Override
    public URL downloadReviewedSourcesBuild(Long buildId) {
        return url(executeRequest(() -> this.client.getSourceFilesApi()
                .downloadReviewedSourceFiles(this.projectId, buildId)
                .getData()));
    }

    @Override
    public SourceString addSourceString(AddSourceStringRequest request) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .addSourceString(this.projectId, request)
            .getData());
    }

    @Override
    public List<SourceString> listSourceString(Long fileId, Long branchId, String labelIds, String filter, String croql) {
        return executeRequestFullList((limit, offset) -> this.client.getSourceStringsApi()
            .listSourceStrings(this.projectId, fileId, null, branchId, labelIds, croql, filter, null, limit, offset));
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
    public StringComment commentString(AddStringCommentRequest request) {
        return executeRequest(() -> this.client.getStringCommentsApi()
                                               .addStringComment(this.projectId, request)
                                               .getData());
    }

    @Override
    public SourceString editSourceString(Long sourceId, List<PatchRequest> requests) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .editSourceString(this.projectId, sourceId, requests)
            .getData());
    }

    @Override
    public URL exportProjectTranslation(ExportProjectTranslationRequest request) {
        return url(executeRequest(() -> this.client.getTranslationsApi()
            .exportProjectTranslation(this.projectId, request)
            .getData()));
    }

    @Override
    public List<Label> listLabels() {
        return executeRequestFullList((limit, offset) -> this.client.getLabelsApi()
            .listLabels(this.projectId, limit, offset));
    }

    @Override
    public Label addLabel(AddLabelRequest request) {
        return executeRequest(() -> this.client.getLabelsApi()
            .addLabel(this.projectId, request)
            .getData());
    }

    @Override
    public URL downloadFile(Long fileId) {
        return url(executeRequest(() -> this.client.getSourceFilesApi()
            .downloadFile(this.projectId, fileId)
            .getData()));
    }

    @Override
    public PreTranslationStatus startPreTranslation(ApplyPreTranslationRequest request) {
        return executeRequest(() ->this.client.getTranslationsApi()
            .applyPreTranslation(this.projectId, request)
            .getData());
    }

    @Override
    public PreTranslationStatus checkPreTranslation(String preTranslationId) {
        return executeRequest(() -> this.client.getTranslationsApi()
            .preTranslationStatus(this.projectId, preTranslationId)
            .getData());
    }
}
