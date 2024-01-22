package com.crowdin.cli.client;

import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.distributions.model.DistributionRelease;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.SourceString;
import com.crowdin.client.sourcestrings.model.UploadStringsProgress;
import com.crowdin.client.sourcestrings.model.UploadStringsRequest;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.translations.model.*;
import com.crowdin.client.translationstatus.model.LanguageProgress;

import java.io.InputStream;
import java.net.URL;
import java.util.List;

public interface ProjectClient extends Client {

    default CrowdinProjectFull downloadFullProject() {
        return this.downloadFullProject(null);
    }

    CrowdinProjectFull downloadFullProject(String branchName);

    CrowdinProject downloadProjectWithLanguages();

    CrowdinProjectInfo downloadProjectInfo();

    Branch addBranch(AddBranchRequest request);

    void deleteBranch(Long branchId);

    List<Branch> listBranches();

    Long uploadStorage(String fileName, InputStream content) throws ResponseException;

    Directory addDirectory(AddDirectoryRequest request) throws ResponseException;

    void deleteDirectory(Long directoryId);

    void updateSource(Long sourceId, UpdateFileRequest request) throws ResponseException;

    void addSource(AddFileRequest request) throws ResponseException;

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

    List<SourceString> listSourceString(Long fileId, Long branchId, String labelIds, String filter, String croql);

    void deleteSourceString(Long id);

    StringComment commentString(AddStringCommentRequest request);

    SourceString editSourceString(Long sourceId, List<PatchRequest> requests);

    URL exportProjectTranslation(ExportProjectTranslationRequest request);

    List<Label> listLabels();

    Label addLabel(AddLabelRequest request);

    URL downloadFile(Long fileId);

    PreTranslationStatus startPreTranslation(ApplyPreTranslationRequest request);

    PreTranslationStatus checkPreTranslation(String preTranslationId);
}
