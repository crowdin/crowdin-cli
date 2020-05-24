package com.crowdin.cli.client;

import com.crowdin.cli.client.exceptions.*;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.http.exceptions.HttpBadRequestException;
import com.crowdin.client.core.http.exceptions.HttpException;
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
import com.crowdin.client.translationstatus.model.LanguageProgress;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.BiFunction;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class CrowdinClient implements Client {

    private final com.crowdin.client.Client client;
    private final long projectId;
    private final static long millisToRetry = 100;

    public CrowdinClient(String apiToken, String baseUrl, long projectId) {
        boolean isTesting = PropertiesBeanUtils.isUrlForTesting(baseUrl);
        String organization = PropertiesBeanUtils.getOrganization(baseUrl);
        Credentials credentials = (isTesting)
            ? new Credentials(apiToken, organization, baseUrl)
            : new Credentials(apiToken, organization);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .userAgent(Utils.buildUserAgent())
            .build();
        this.client = new com.crowdin.client.Client(credentials, clientConfig);
        this.projectId = projectId;
    }

    @Override
    public CrowdinProject downloadFullProject() throws ResponseException {
        com.crowdin.client.projectsgroups.model.Project projectInfo = downloadProjectInfo();
        List<File> files = executeRequestFullList((limit, offset) -> unwrap(executeRequest(() -> this.client.getSourceFilesApi()
            .listFiles(this.projectId, null, null, null, limit, offset))));
        List<Directory> directories = executeRequestFullList((limit, offset) -> unwrap(executeRequest(() -> this.client.getSourceFilesApi()
            .listDirectories(this.projectId, null, null, null, limit, offset))));
        List<Branch> branches = executeRequestFullList((limit, offset) -> unwrap(executeRequest(() -> this.client.getSourceFilesApi()
            .listBranches(this.projectId, null, limit, offset))));
        List<Language> supportedLanguages = unwrap(executeRequest(() -> this.client.getLanguagesApi()
            .listSupportedLanguages(499, 0)));
        List<Language> projectLanguages = supportedLanguages.stream()
            .filter(language -> projectInfo.getTargetLanguageIds().contains(language.getId()))
            .collect(Collectors.toList());
        CrowdinProject project = new CrowdinProject();
        project.setFiles(files);
        project.setDirectories(directories);
        project.setBranches(branches);
        project.setSupportedLanguages(supportedLanguages);
        project.setProjectLanguages(projectLanguages);
        if (projectInfo instanceof ProjectSettings) {
            ProjectSettings projectSettings = (ProjectSettings) projectInfo;
            if (projectSettings.isInContext()) {
                project.setPseudoLanguageId(projectSettings.getInContextPseudoLanguageId());
            }
            project.setLanguageMapping(projectSettings.getLanguageMapping());
        }
        return project;
    }

    @Override
    public Project downloadProjectWithLanguages() throws ResponseException {
        com.crowdin.client.projectsgroups.model.Project projectInfo = downloadProjectInfo();
        List<Language> supportedLanguages = unwrap(executeRequest(() -> this.client.getLanguagesApi()
            .listSupportedLanguages(499, 0)));
        List<Language> projectLanguages = supportedLanguages.stream()
            .filter(language -> projectInfo.getTargetLanguageIds().contains(language.getId()))
            .collect(Collectors.toList());
        CrowdinProject project = new CrowdinProject();
        project.setSupportedLanguages(supportedLanguages);
        project.setProjectLanguages(projectLanguages);
        if (projectInfo instanceof ProjectSettings) {
            ProjectSettings projectSettings = (ProjectSettings) projectInfo;
            if (projectSettings.isInContext()) {
                project.setPseudoLanguageId(projectSettings.getInContextPseudoLanguageId());
            }
            project.setLanguageMapping(projectSettings.getLanguageMapping());
        }
        return project;
    }

    public List<LanguageProgress> getProjectProgress(String langaugeId) {
        return unwrap(this.client.getTranslationStatusApi()
                .getProjectProgress(this.projectId, 500, 0, langaugeId));
    }

    private com.crowdin.client.projectsgroups.model.Project downloadProjectInfo() throws ResponseException {
        try {
            return executeRequest(() -> (com.crowdin.client.projectsgroups.model.Project) this.client.getProjectsGroupsApi()
                .getProject(this.projectId)
                .getData());
        } catch (Exception e) {
            if (e.getMessage().contains("Organization Not Found")) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.response.organization_not_found"));
            } else if (e.getMessage().contains("Not Found")) {
                throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.response.project_not_found"), projectId));
            } else if (e.getMessage().contains("Unauthorized")) {
                throw new RuntimeException(RESOURCE_BUNDLE.getString("error.response.unauthorized"));
            } else {
                throw new RuntimeException("Unhandled Exception: " + e.getMessage());
            }
        }
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
        try {
            return executeRequest(() -> this.client.getSourceFilesApi()
                .addDirectory(this.projectId, request)
                .getData());
        } catch (Exception e) {
            if (StringUtils.containsAny(e.getMessage(), "Name must be unique", "This file is currently being updated")) {
                throw new ExistsResponseException();
            } else if (StringUtils.contains(e.getMessage(), "Already creating directory")) {
                throw new WaitResponseException();
            } else {
                throw new RuntimeException(e.getMessage());
            }
        }
    }

    @Override
    public void updateSource(Long sourceId, UpdateFileRequest request) {
        executeRequestWithRetryIfErrorContains(
            () -> this.client.getSourceFilesApi()
                .updateOrRestoreFile(this.projectId, sourceId, request),
            "File from storage with id #" + request.getStorageId() + " was not found");
    }

    @Override
    public void addSource(AddFileRequest request) {
        executeRequestWithRetryIfErrorContains(
            () -> this.client.getSourceFilesApi()
                .addFile(this.projectId, request),
            "File from storage with id #" + request.getStorageId() + " was not found");
    }

    @Override
    public void uploadTranslations(String languageId, UploadTranslationsRequest request) {
        executeRequestWithRetryIfErrorContains(
            () -> this.client.getTranslationsApi()
                .uploadTranslations(this.projectId, languageId, request),
            "File from storage with id #" + request.getStorageId() + " was not found");
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
    public InputStream downloadBuild(Long buildId) {
        String url = executeRequest(() -> this.client.getTranslationsApi()
            .downloadProjectTranslations(this.projectId, buildId)
            .getData()
            .getUrl());
        try {
            return new URL(url).openStream();
        } catch (IOException e) {
            throw new RuntimeException("Unexpected exception: malformed download url: " + url, e);
        }
    }

    /**
     *
     * @param request represents function with two args (limit, offset)
     * @param <T> represents model
     * @return list of models accumulated from request function
     */
    private static <T> List<T> executeRequestFullList(BiFunction<Integer, Integer, List<T>> request) {
        List<T> directories = new ArrayList<>();
        long counter;
        int limit = 500;
        do {
            List<T> dirs = executeRequest(() -> request.apply(limit, directories.size()));
            directories.addAll(dirs);
            counter = dirs.size();
        } while (counter == limit);
        return directories;
    }

    private static <T> T executeRequestWithRetryIfErrorContains(Callable<T> request, String errorMessageContains) {
        try {
            return executeRequest(request);
        } catch (Exception e) {
            if (StringUtils.contains(e.getMessage(), errorMessageContains)) {
                try {
                    Thread.sleep(millisToRetry);
                } catch (InterruptedException ee) {
                }
                return executeRequest(request);
            } else {
                throw new RuntimeException(e.getMessage());
            }
        }
    }

    private static <T> T executeRequest(Callable<T> r){
        try {
            return r.call();
        } catch (HttpBadRequestException e) {
            String errorMessage = e.getErrors()
                .stream()
                .flatMap(holder -> holder.getError().getErrors()
                    .stream()
                    .map(error -> holder.getError().getKey() + ": " + error.getCode() + ": " + error.getMessage()))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(errorMessage);
        } catch (HttpException e) {
            throw new RuntimeException(e.getError().code + ": " + e.getError().message);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
