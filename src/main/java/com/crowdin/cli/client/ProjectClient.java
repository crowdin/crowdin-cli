package com.crowdin.cli.client;

import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.SourceString;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ExportProjectTranslationRequest;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translationstatus.model.LanguageProgress;

import java.io.InputStream;
import java.net.URL;
import java.util.List;

public interface ProjectClient extends Client {

    CrowdinProjectFull downloadFullProject();

    CrowdinProject downloadProjectWithLanguages();

    CrowdinProjectInfo downloadProjectInfo();

    Branch addBranch(AddBranchRequest request);

    Long uploadStorage(String fileName, InputStream content);

    Directory addDirectory(AddDirectoryRequest request) throws ResponseException;

    void updateSource(Long sourceId, UpdateFileRequest request);

    void addSource(AddFileRequest request) throws ResponseException;

    void editSource(Long fileId, List<PatchRequest> request);

    void uploadTranslations(String languageId, UploadTranslationsRequest request);

    ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request);

    ProjectBuild checkBuildingTranslation(Long buildId);

    URL downloadBuild(Long buildId);

    List<LanguageProgress> getProjectProgress(String languageId);

    SourceString addSourceString(AddSourceStringRequest request);

    List<SourceString> listSourceString(Long fileId, String labelIds, String filter);

    void deleteSourceString(Long id);

    SourceString editSourceString(Long sourceId, List<PatchRequest> requests);

    URL exportProjectTranslation(ExportProjectTranslationRequest request);

    List<Label> listLabels();

    Label addLabel(AddLabelRequest request);

    URL downloadFile(Long fileId);
}
