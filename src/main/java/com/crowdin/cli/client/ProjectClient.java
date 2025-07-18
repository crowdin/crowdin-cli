package com.crowdin.cli.client;

import com.crowdin.client.applications.installations.model.ApplicationInstallation;
import com.crowdin.client.applications.model.ApplicationDataResponseObject;
import com.crowdin.client.branches.model.*;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.machinetranslationengines.model.MachineTranslation;
import com.crowdin.client.projectsgroups.model.AddProjectRequest;
import com.crowdin.client.projectsgroups.model.Project;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.sourcestrings.model.*;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.translations.model.*;
import com.crowdin.client.translationstatus.model.LanguageProgress;
import com.crowdin.client.users.model.User;

import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.Optional;

public interface ProjectClient extends Client {

    default CrowdinProjectFull downloadFullProject() {
        return this.downloadFullProject(null);
    }

    List<Language> listSupportedLanguages();

    CrowdinProjectFull downloadFullProject(String branchName);

    CrowdinProject downloadProjectWithLanguages();

    CrowdinProjectInfo downloadProjectInfo();

    Branch addBranch(AddBranchRequest request);

    BranchCloneStatus cloneBranch(Long branchId, CloneBranchRequest request) throws ResponseException;

    BranchCloneStatus checkCloneBranchStatus(Long branchId, String cloneId);

    ClonedBranch getClonedBranch(Long branchId, String cloneId);

    BranchMergeStatus mergeBranch(Long branchId, MergeBranchRequest request) throws ResponseException;

    BranchMergeStatus checkMergeBranchStatus(Long branchId, String mergeId);

    BranchMergeSummary getBranchMergeSummary(Long branchId, String mergeId);

    void deleteBranch(Long branchId);

    Branch editBranch(Long branchId, List<PatchRequest> requests);

    List<Branch> listBranches();

    Long uploadStorage(String fileName, InputStream content) throws ResponseException;

    Directory addDirectory(AddDirectoryRequest request) throws ResponseException;

    void deleteDirectory(Long directoryId);

    void updateSource(Long sourceId, UpdateFileRequest request) throws ResponseException;

    FileInfo addSource(AddFileRequest request) throws ResponseException;

    UploadStringsProgress addSourceStringsBased(UploadStringsRequest request);

    UploadStringsProgress getUploadStringsStatus(String uploadId);

    void editSource(Long fileId, List<PatchRequest> request);

    void deleteSource(Long fileId);

    void uploadTranslations(String languageId, UploadTranslationsRequest request) throws ResponseException;

    void uploadTranslationStringsBased(String languageId, UploadTranslationsStringsRequest request);

    ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request) throws ResponseException;

    ProjectBuild checkBuildingTranslation(Long buildId);

    URL buildProjectFileTranslation(Long fileId, BuildProjectFileTranslationRequest request);

    URL downloadBuild(Long buildId);

    ReviewedStringsBuild startBuildingReviewedSources(BuildReviewedSourceFilesRequest request);

    ReviewedStringsBuild checkBuildingReviewedSources(Long build);

    URL downloadReviewedSourcesBuild(Long buildId);

    List<LanguageProgress> getProjectProgress(String languageId);

    List<LanguageProgress> getBranchProgress(Long branchId);

    List<LanguageProgress> getFileProgress(Long fileId);

    List<LanguageProgress> getDirectoryProgress(Long directoryId);

    SourceString addSourceString(AddSourceStringRequest request);

    SourceString addSourcePluralString(AddSourcePluralStringRequest request);

    SourceString addSourceStringStringsBased(AddSourceStringStringsBasedRequest request);

    SourceString addSourcePluralStringStringsBased(AddSourcePluralStringStringsBasedRequest request);

    List<SourceString> listSourceString(Long fileId, Long branchId, String labelIds, String filter, String croql, Long directory, String scope);

    void deleteSourceString(Long id);

    StringComment commentString(AddStringCommentRequest request);

    SourceString editSourceString(Long sourceId, List<PatchRequest> requests);

    List<Label> listLabels();

    Label addLabel(AddLabelRequest request);

    URL downloadFile(Long fileId);

    PreTranslationStatus startPreTranslation(ApplyPreTranslationRequest request);

    PreTranslationStatus startPreTranslationStringsBased(ApplyPreTranslationStringsBasedRequest request);

    PreTranslationStatus checkPreTranslation(String preTranslationId);

    PreTranslationReportResponse getPreTranslationReport(String preTranslationId);

    MachineTranslation getMt(Long mtId) throws ResponseException;

    String getProjectUrl();

    List<? extends Project> listProjects();

    Project addProject(AddProjectRequest request);

    List<ApplicationInstallation> listApplications();

    void uninstallApplication(String id, boolean force);

    void installApplication(String url);

    Optional<String> findManifestUrl(String id);

    User getAuthenticatedUser();
}
