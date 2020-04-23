package com.crowdin.cli.client;

import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.core.model.ResponseList;
import com.crowdin.client.core.model.ResponseObject;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.projectsgroups.model.ProjectSettings;
import com.crowdin.client.sourcefiles.model.*;
import com.crowdin.client.storage.model.Storage;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.UploadTranslationsRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.*;
import java.util.stream.Collectors;

public class CrowdinClient implements Client {

    private com.crowdin.client.Client client;
    private long projectId;

    public CrowdinClient(com.crowdin.client.Client client, long projectId) {
        this.client = client;
        this.projectId = projectId;
    }

    @Override
    public CrowdinProject downloadFullProject() {
        ProjectSettings projectSettings = (ProjectSettings) this.client.getProjectsGroupsApi()
            .getProject(this.projectId)
            .getData();
        List<File> files = unwrap(this.client.getSourceFilesApi()
            .listFiles(this.projectId, null, null, null, 499, 0));
        List<Directory> directories = unwrap(this.client.getSourceFilesApi()
            .listDirectories(this.projectId, null, null, null, 499, 0));
        List<Branch> branches = unwrap(this.client.getSourceFilesApi()
            .listBranches(this.projectId, null, 499, 0));
        List<Language> supportedLanguages = unwrap(this.client.getLanguagesApi()
            .listSupportedLanguages(499, 0));
        List<Language> projectLanguages = supportedLanguages.stream()
            .filter(language -> projectSettings.getTargetLanguageIds().contains(language.getId()))
            .collect(Collectors.toList());
        CrowdinProject project = new CrowdinProject();
        project.setProjectInfo(projectSettings);
        project.setFiles(files);
        project.setDirectories(directories);
        project.setBranches(branches);
        project.setSupportedLanguages(supportedLanguages);
        project.setProjectLanguages(projectLanguages);
//        todo do i need to add pseudoLanguage here?
//        Optional<Language> pseudoLanguage = (this.projectInfo.isInContext())
//            ? this.findLanguage(projectInfo.getInContextPseudoLanguageId())
//            : Optional.empty();
        return project;
    }

    @Override
    public Project downloadProjectWithLanguages() {
        ProjectSettings projectSettings = (ProjectSettings) this.client.getProjectsGroupsApi()
            .getProject(this.projectId)
            .getData();
        List<Language> supportedLanguages = unwrap(this.client.getLanguagesApi()
            .listSupportedLanguages(499, 0));
        List<Language> projectLanguages = supportedLanguages.stream()
            .filter(language -> projectSettings.getTargetLanguageIds().contains(language.getId()))
            .collect(Collectors.toList());
        CrowdinProject project = new CrowdinProject();
        project.setProjectInfo(projectSettings);
        project.setSupportedLanguages(supportedLanguages);
        project.setProjectLanguages(projectLanguages);
        return project;
    }

    private static <T> List<T> unwrap(ResponseList<T> list) {
        return list
            .getData()
            .stream()
            .map(ResponseObject::getData)
            .collect(Collectors.toList());
    }

    @Override
    public Branch addBranch(AddBranchRequest request) {
        return this.client.getSourceFilesApi()
            .addBranch(this.projectId, request)
            .getData();
    }

    @Override
    public Long uploadStorage(String fileName, InputStream content) {
        Storage storage = this.client.getStorageApi()
            .addStorage(fileName, content)
            .getData();
        return storage.getId();
    }

    @Override
    public Directory addDirectory(AddDirectoryRequest request) {
        return this.client.getSourceFilesApi()
            .addDirectory(this.projectId, request)
            .getData();
    }

    @Override
    public void updateSource(Long sourceId, UpdateFileRequest request) {
        this.client.getSourceFilesApi()
            .updateOrRestoreFile(this.projectId, sourceId, request);
    }

    @Override
    public void addSource(AddFileRequest request) {
        this.client.getSourceFilesApi()
            .addFile(this.projectId, request);
    }

    @Override
    public void uploadTranslations(String languageId, UploadTranslationsRequest request) {
        this.client.getTranslationsApi()
            .uploadTranslations(this.projectId, languageId, request);
    }

    @Override
    public ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request) {
        return this.client.getTranslationsApi()
            .buildProjectTranslation(this.projectId, request)
            .getData();
    }

    @Override
    public ProjectBuild checkBuildingTranslation(Long buildId) {
        return this.client.getTranslationsApi()
            .checkBuildStatus(projectId, buildId)
            .getData();
    }

    @Override
    public InputStream downloadBuild(Long buildId) {
        String url = this.client.getTranslationsApi()
            .downloadProjectTranslations(this.projectId, buildId)
            .getData()
            .getUrl();
        try {
            return new URL(url).openStream();
        } catch (IOException e) {
            throw new RuntimeException("Unexpected exception: malformed download url: " + url, e);
        }
    }
}
