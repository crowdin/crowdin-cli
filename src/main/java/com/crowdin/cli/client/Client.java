package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translationstatus.model.LanguageProgress;

import java.io.InputStream;
import java.util.List;

public interface Client {

    Project downloadFullProject() throws ResponseException;
    Project downloadProjectWithLanguages() throws ResponseException;

    Branch addBranch(AddBranchRequest request);

    Long uploadStorage(String fileName, InputStream content);

    Directory addDirectory(AddDirectoryRequest request) throws ResponseException;

    void updateSource(Long sourceId, UpdateFileRequest request);
    void addSource(AddFileRequest request);

    void uploadTranslations(String languageId, UploadTranslationsRequest request);

    ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request);
    ProjectBuild checkBuildingTranslation(Long buildId);
    InputStream downloadBuild(Long buildId);

    List<LanguageProgress> getProjectProgress(String languageId);

}
