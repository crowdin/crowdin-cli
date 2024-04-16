package com.crowdin.cli.client;

import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.Project;
import com.crowdin.client.projectsgroups.model.ProjectSettings;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.sourcestrings.model.*;
import com.crowdin.client.storage.model.Storage;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.translations.model.*;
import com.crowdin.client.translationstatus.model.LanguageProgress;
import org.apache.commons.lang3.StringUtils;

import java.io.InputStream;
import java.net.URL;
import java.util.*;
import java.util.function.BiPredicate;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

class CrowdinProjectClient extends CrowdinClientCore implements ProjectClient {

    private final com.crowdin.client.Client client;
    private final long projectId;
    private final String baseUrl;

    public CrowdinProjectClient(com.crowdin.client.Client client, long projectId, String baseUrl) {
        this.client = client;
        this.projectId = projectId;
        this.baseUrl = baseUrl;
    }

    @Override
    public List<Language> listSupportedLanguages() {
        return executeRequestFullList((limit, offset) -> this.client.getLanguagesApi()
                .listSupportedLanguages(limit, offset));
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

        boolean isStringsBasedProject = Objects.equals(project.getType(), Type.STRINGS_BASED);
        if (isStringsBasedProject) {
            return;
        }
        project.setFiles(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listFiles(this.projectId, branchId, null, null, true, limit, offset)));
        project.setDirectories(executeRequestFullList((limit, offset) -> this.client.getSourceFilesApi()
            .listDirectories(this.projectId, branchId, null, null, true, limit, offset)));
    }

    private void populateProjectWithLangs(CrowdinProject project) {
        project.setSupportedLanguages(this.listSupportedLanguages());
    }

    private void populateProjectWithInfo(CrowdinProjectInfo project) {
        com.crowdin.client.projectsgroups.model.Project projectModel = this.getProject();
        project.setProjectId(projectModel.getId());
        project.setType(projectModel.getType());
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
    public List<LanguageProgress> getFileProgress(Long fileId) {
        return executeRequestFullList((limit, offset) -> this.client.getTranslationStatusApi()
            .getFileProgress(this.projectId, fileId, limit, offset));
    }

    @Override
    public List<LanguageProgress> getDirectoryProgress(Long directoryId) {
        return executeRequestFullList((limit, offset) -> this.client.getTranslationStatusApi()
            .getDirectoryProgress(this.projectId, directoryId, limit, offset));
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
            put((code, message) -> code.equals("409"), new FileInUpdateException());
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
    public UploadStringsProgress addSourceStringsBased(UploadStringsRequest request) {
        return executeRequest(
            () -> this.client.getSourceStringsApi().uploadStrings(this.projectId, request).getData()
        );
    }

    @Override
    public UploadStringsProgress getUploadStringsStatus(String uploadId) {
        return executeRequest(
            () -> this.client.getSourceStringsApi().uploadStringsStatus(this.projectId, uploadId).getData()
        );
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
    public void uploadTranslationStringsBased(String languageId, UploadTranslationsStringsRequest request) {
        executeRequest(() -> this.client.getTranslationsApi()
            .uploadTranslationStringsBased(this.projectId, languageId, request));
    }

    @Override
    public ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request) throws ResponseException {
        Map<BiPredicate<String, String>, ResponseException> errorHandler = new LinkedHashMap<BiPredicate<String, String>, ResponseException>() {{
            put((code, message) -> code.equals("409") && message.contains("Another build is currently in progress"),
                new RepeatException());
        }};
        return executeRequestWithPossibleRetries(
            errorHandler,
            () -> this.client.getTranslationsApi().buildProjectTranslation(this.projectId, request).getData(),
            3,
            60 * 100
        );
    }

    @Override
    public ProjectBuild checkBuildingTranslation(Long buildId) {
        return executeRequest(() -> this.client.getTranslationsApi()
            .checkBuildStatus(projectId, buildId)
            .getData());
    }

    @Override
    public URL buildProjectFileTranslation(Long fileId, BuildProjectFileTranslationRequest request) {
        return url(executeRequest(() -> this.client.getTranslationsApi()
            .buildProjectFileTranslation(projectId, fileId, null, request)
            .getData()));
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
    public SourceString addSourcePluralString(AddSourcePluralStringRequest request) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .addSourcePluralString(this.projectId, request)
            .getData());
    }

    @Override
    public SourceString addSourceStringStringsBased(AddSourceStringStringsBasedRequest request) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .addSourceStringStringsBased(this.projectId, request)
            .getData());
    }

    @Override
    public SourceString addSourcePluralStringStringsBased(AddSourcePluralStringStringsBasedRequest request) {
        return executeRequest(() -> this.client.getSourceStringsApi()
            .addSourcePluralStringStringsBased(this.projectId, request)
            .getData());
    }

    @Override
    public List<SourceString> listSourceString(Long fileId, Long branchId, String labelIds, String filter, String croql, Long directory, String scope) {
        ListSourceStringsParams.ListSourceStringsParamsBuilder builder = ListSourceStringsParams.builder()
                .fileId(fileId)
                .branchId(branchId)
                .labelIds(labelIds)
                .filter(filter)
                .croql(croql)
                .directoryId(directory)
                .scope(scope);
        return executeRequestFullList((limit, offset) -> this.client.getSourceStringsApi()
            .listSourceStrings(this.projectId, builder.limit(limit).offset(offset).build()));
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
    public List<Label> listLabels() {
        return executeRequestFullList((limit, offset) -> this.client.getLabelsApi()
            .listLabels(this.projectId, limit, offset, null));
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
    public PreTranslationStatus startPreTranslationStringsBased(ApplyPreTranslationStringsBasedRequest request) {
        return executeRequest(() ->this.client.getTranslationsApi()
            .applyPreTranslationStringsBased(this.projectId, request)
            .getData());
    }

    @Override
    public PreTranslationStatus checkPreTranslation(String preTranslationId) {
        return executeRequest(() -> this.client.getTranslationsApi()
            .preTranslationStatus(this.projectId, preTranslationId)
            .getData());
    }

    @Override
    public String getProjectUrl() {
        if (PropertiesBeanUtils.isOrganization(this.baseUrl)) {
            String organization = PropertiesBeanUtils.getOrganization(baseUrl);
            return "https://" + organization +".crowdin.com/u/projects/" + this.projectId;
        } else {
            Project project = this.getProject();
            return "https://crowdin.com/project/" + project.getIdentifier();
        }
    }
}
