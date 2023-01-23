package com.crowdin.cli.client;

import com.crowdin.cli.client.models.HttpExceptionBuilder;
import com.crowdin.cli.utils.LanguageBuilder;
import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.DownloadLinkResponseObject;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.languages.model.LanguageResponseList;
import com.crowdin.client.languages.model.LanguageResponseObject;
import com.crowdin.client.projectsgroups.model.Project;
import com.crowdin.client.projectsgroups.model.ProjectResponseObject;
import com.crowdin.client.projectsgroups.model.ProjectSettings;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.BranchResponseList;
import com.crowdin.client.sourcefiles.model.BranchResponseObject;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.DirectoryResponseList;
import com.crowdin.client.sourcefiles.model.DirectoryResponseObject;
import com.crowdin.client.sourcefiles.model.File;
import com.crowdin.client.sourcefiles.model.FileInfoResponseList;
import com.crowdin.client.sourcefiles.model.FileResponseObject;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.SourceString;
import com.crowdin.client.sourcestrings.model.SourceStringResponseList;
import com.crowdin.client.sourcestrings.model.SourceStringResponseObject;
import com.crowdin.client.storage.model.Storage;
import com.crowdin.client.storage.model.StorageResponseObject;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.ProjectBuildResponseObject;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translations.model.UploadTranslationsResponse;
import com.crowdin.client.translations.model.UploadTranslationsResponseObject;
import com.crowdin.client.translationstatus.model.LanguageProgressResponseList;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class CrowdinProjectClientTest {

    private HttpClient httpClientMock;
    private ProjectClient client;

    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final long projectId = 42;
    private static final long fileId = 82;
    private static final String languageId = "uk";
    private static final long buildId = 62;
    private static final long stringId = 52;
    private static final String downloadUrl = "https://downloadme.crowdin.com";
    private static final String downloadUrlMalformed = "https";

    private static final String listFilesUrl =
        String.format("%s/projects/%d/files", url, projectId);
    private static final String listDirectoriesUrl =
        String.format("%s/projects/%d/directories", url, projectId);
    private static final String listBranchesUrl =
        String.format("%s/projects/%d/branches", url, projectId);
    private static final String listSupportedLanguagesUrl =
        String.format("%s/languages", url);
    private static final String getProjectUrl =
        String.format("%s/projects/%d", url, projectId);

    private static final String getProjectProgressUrl =
        String.format("%s/projects/%d/languages/progress", url, projectId);
    private static final String addBranchUrl =
        String.format("%s/projects/%d/branches", url, projectId);
    private static final String uploadStorageUrl =
        String.format("%s/storages", url);
    private static final String addDirectoryUrl =
        String.format("%s/projects/%d/directories", url, projectId);
    private static final String updateSourceUrl =
        String.format("%s/projects/%d/files/%d", url, projectId, fileId);
    private static final String addSourceUrl =
        String.format("%s/projects/%d/files", url, projectId);
    private static final String uploadTranslationsUrl =
        String.format("%s/projects/%d/translations/%s", url, projectId, languageId);
    private static final String startBuildingTranslationsUrl =
        String.format("%s/projects/%d/translations/builds", url, projectId);
    private static final String checkBuildingTranslationUrl =
        String.format("%s/projects/%d/translations/builds/%d", url, projectId, buildId);
    private static final String downloadBuildUrl =
        String.format("%s/projects/%d/translations/builds/%d/download", url, projectId, buildId);

    private static final String addSourceStringUrl =
        String.format("%s/projects/%d/strings", url, projectId);
    private static final String listSourceStringUrl =
        String.format("%s/projects/%d/strings", url, projectId);
    private static final String deleteSourceStringUrl =
        String.format("%s/projects/%d/strings/%d", url, projectId, stringId);
    private static final String editSourceStringUrl =
        String.format("%s/projects/%d/strings/%d", url, projectId, stringId);

    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .httpClient(httpClientMock)
            .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinProjectClient(internalClient, 42);
    }

    @Test
    public void testDownloadProjectFull() {
        Project project = new Project() {{
                setId(projectId);
                setTargetLanguages(Arrays.asList(LanguageBuilder.ENG.build()));
            }};
        List<LanguageResponseObject> supportedLangs = Arrays.asList(
            new LanguageResponseObject() {{
                    setData(LanguageBuilder.ENG.build());
                }},
            new LanguageResponseObject() {{
                    setData(LanguageBuilder.UKR.build());
                }}
        );
        List<FileResponseObject> files = Arrays.asList(
            new FileResponseObject() {{
                    setData(new File());
                }}
        );
        List<DirectoryResponseObject> directories = Arrays.asList(
            new DirectoryResponseObject() {{
                    setData(new Directory());
                }}
        );
        List<BranchResponseObject> branches = Arrays.asList(
            new BranchResponseObject() {{
                    setData(new Branch());
                }}
        );
        ProjectResponseObject projectResponse = new ProjectResponseObject() {{
                setData(project);
            }};
        LanguageResponseList langsResponse = new LanguageResponseList() {{
                setData(supportedLangs);
            }};
        FileInfoResponseList filesResponse = new FileInfoResponseList() {{
                setData(files);
            }};
        DirectoryResponseList directoriesResponse = new DirectoryResponseList() {{
                setData(directories);
            }};
        BranchResponseList branchesResponse = new BranchResponseList() {{
                setData(branches);
            }};
        when(httpClientMock.get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class)))
            .thenReturn(projectResponse);
        when(httpClientMock.get(eq(listSupportedLanguagesUrl), any(), eq(LanguageResponseList.class)))
            .thenReturn(langsResponse);
        when(httpClientMock.get(eq(listFilesUrl), any(), eq(FileInfoResponseList.class)))
            .thenReturn(filesResponse);
        when(httpClientMock.get(eq(listDirectoriesUrl), any(), eq(DirectoryResponseList.class)))
            .thenReturn(directoriesResponse);
        when(httpClientMock.get(eq(listBranchesUrl), any(), eq(BranchResponseList.class)))
            .thenReturn(branchesResponse);

        CrowdinProject crowdinProject = client.downloadFullProject(null);
        assertEquals(1, crowdinProject.getProjectLanguages(false).size());
        assertEquals(2, crowdinProject.getSupportedLanguages().size());
        assertTrue(crowdinProject.findLanguageById("ua", false).isPresent());
        assertFalse(crowdinProject.findLanguageById("ua", true).isPresent());

        verify(httpClientMock).get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class));
        verify(httpClientMock).get(eq(listSupportedLanguagesUrl), any(), eq(LanguageResponseList.class));
        verify(httpClientMock).get(eq(listFilesUrl), any(), eq(FileInfoResponseList.class));
        verify(httpClientMock).get(eq(listDirectoriesUrl), any(), eq(DirectoryResponseList.class));
        verify(httpClientMock).get(eq(listBranchesUrl), any(), eq(BranchResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadProjectWithLangs() {
        Project project = new Project() {{
                setId(projectId);
                setTargetLanguages(Arrays.asList(LanguageBuilder.ENG.build()));
            }};
        List<LanguageResponseObject> supportedLangs = Arrays.asList(
            new LanguageResponseObject() {{
                    setData(LanguageBuilder.ENG.build());
                }},
            new LanguageResponseObject() {{
                    setData(LanguageBuilder.UKR.build());
                }}
        );
        ProjectResponseObject projectResponse = new ProjectResponseObject() {{
                setData(project);
            }};
        LanguageResponseList langsResponse = new LanguageResponseList() {{
                setData(supportedLangs);
            }};
        when(httpClientMock.get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class)))
            .thenReturn(projectResponse);
        when(httpClientMock.get(eq(listSupportedLanguagesUrl), any(), eq(LanguageResponseList.class)))
            .thenReturn(langsResponse);

        CrowdinProject crowdinProject = client.downloadProjectWithLanguages();
        assertEquals(1, crowdinProject.getProjectLanguages(false).size());

        verify(httpClientMock).get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class));
        verify(httpClientMock).get(eq(listSupportedLanguagesUrl), any(), eq(LanguageResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadProjectInfoManagerAccess() {
        Project project = new ProjectSettings() {{
                setId(projectId);
                setTargetLanguageIds(Arrays.asList("en", "ua"));
                setLanguageMapping(new HashMap<>());
            }};
        ProjectResponseObject response = new ProjectResponseObject() {{
                setData(project);
            }};
        when(httpClientMock.get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class)))
            .thenReturn(response);

        CrowdinProjectInfo projectInfo = client.downloadProjectInfo();

        assertTrue(projectInfo.isManagerAccess());
        assertFalse(projectInfo.getInContextLanguage().isPresent());

        verify(httpClientMock).get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadProjectInfoManagerAccessWithInContext() {
        Project project = new ProjectSettings() {{
                setId(projectId);
                setTargetLanguageIds(Arrays.asList("uk", "ua"));
                setLanguageMapping(new HashMap<>());
                setInContext(true);
                setInContextPseudoLanguage(LanguageBuilder.ENG.build());
            }};
        ProjectResponseObject response = new ProjectResponseObject() {{
                setData(project);
            }};
        when(httpClientMock.get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class)))
            .thenReturn(response);

        CrowdinProjectInfo projectInfo = client.downloadProjectInfo();
        assertTrue(projectInfo.getInContextLanguage().isPresent());

        verify(httpClientMock).get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadProjectInfoTranslatorAccess() {
        Project project = new Project() {{
                setId(projectId);
                setTargetLanguageIds(Arrays.asList("uk", "ua"));
            }};
        ProjectResponseObject response = new ProjectResponseObject() {{
                setData(project);
            }};
        when(httpClientMock.get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class)))
            .thenReturn(response);

        CrowdinProjectInfo projectInfo = client.downloadProjectInfo();

        assertFalse(projectInfo.isManagerAccess());

        verify(httpClientMock).get(eq(getProjectUrl), any(), eq(ProjectResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testGetProjectProgress() {
        LanguageProgressResponseList response = new LanguageProgressResponseList() {{
                setData(new ArrayList<>());
            }};
        when(httpClientMock.get(eq(getProjectProgressUrl), any(), eq(LanguageProgressResponseList.class)))
            .thenReturn(response);

        client.getProjectProgress(languageId);

        verify(httpClientMock).get(eq(getProjectProgressUrl), any(), eq(LanguageProgressResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddBranch() {
        AddBranchRequest request = new AddBranchRequest();
        BranchResponseObject response = new BranchResponseObject() {{
                setData(new Branch());
            }};
        when(httpClientMock.post(eq(addBranchUrl), any(), any(), eq(BranchResponseObject.class)))
            .thenReturn(response);

        client.addBranch(request);

        verify(httpClientMock).post(eq(addBranchUrl), any(), any(), eq(BranchResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testUploadStorage() throws IOException, ResponseException {
        InputStream requestData = IOUtils.toInputStream("Something to send", "UTF-8");
        StorageResponseObject response = new StorageResponseObject() {{
                setData(new Storage());
            }};
        when(httpClientMock.post(eq(uploadStorageUrl), any(), any(), eq(StorageResponseObject.class)))
            .thenReturn(response);

        client.uploadStorage("filename", requestData);

        verify(httpClientMock).post(eq(uploadStorageUrl), any(), any(), eq(StorageResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddDirectory() throws ResponseException {
        AddDirectoryRequest request = new AddDirectoryRequest();
        DirectoryResponseObject response = new DirectoryResponseObject() {{
                setData(new Directory());
            }};
        when(httpClientMock.post(eq(addDirectoryUrl), any(), any(), eq(DirectoryResponseObject.class)))
            .thenReturn(response);

        client.addDirectory(request);

        verify(httpClientMock).post(eq(addDirectoryUrl), any(), any(), eq(DirectoryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddDirectoryThrows() throws ResponseException {
        AddDirectoryRequest request = new AddDirectoryRequest();
        when(httpClientMock.post(eq(addDirectoryUrl), any(), any(), eq(DirectoryResponseObject.class)))
            .thenThrow(HttpExceptionBuilder.build("unknown", "problem"));

        assertThrows(RuntimeException.class, () -> client.addDirectory(request));

        verify(httpClientMock).post(eq(addDirectoryUrl), any(), any(), eq(DirectoryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testUpdateSource() throws ResponseException {
        FileResponseObject response = new FileResponseObject() {{
                setData(new File());
            }};
        UpdateFileRequest request = new UpdateFileRequest();
        request.setStorageId(100L);
        when(httpClientMock.put(eq(updateSourceUrl), any(), any(), eq(FileResponseObject.class)))
            .thenThrow(HttpExceptionBuilder.build("-", "File from storage with id #" + request.getStorageId() + " was not found"))
            .thenReturn(response);

        client.updateSource(fileId, request);

        verify(httpClientMock, times(2)).put(eq(updateSourceUrl), any(), any(), eq(FileResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddSource() throws ResponseException {
        FileResponseObject response = new FileResponseObject() {{
                setData(new File());
            }};
        AddFileRequest request = new AddFileRequest();
        request.setStorageId(100L);
        when(httpClientMock.post(eq(addSourceUrl), any(), any(), eq(FileResponseObject.class)))
            .thenThrow(HttpExceptionBuilder.build("-", "File from storage with id #" + request.getStorageId() + " was not found"))
            .thenReturn(response);

        client.addSource(request);

        verify(httpClientMock, times(2)).post(eq(addSourceUrl), any(), any(), eq(FileResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testUploadTranslations() throws ResponseException {
        UploadTranslationsResponseObject response = new UploadTranslationsResponseObject() {{
                setData(new UploadTranslationsResponse());
            }};
        when(httpClientMock.post(eq(uploadTranslationsUrl), any(), any(), eq(UploadTranslationsResponseObject.class)))
            .thenReturn(response);
        UploadTranslationsRequest request = new UploadTranslationsRequest();

        client.uploadTranslations(languageId, request);

        verify(httpClientMock).post(eq(uploadTranslationsUrl), any(), any(), eq(UploadTranslationsResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testUploadTranslationsWithRepeat() throws ResponseException {
        UploadTranslationsResponseObject response = new UploadTranslationsResponseObject() {{
                setData(new UploadTranslationsResponse());
            }};
        UploadTranslationsRequest request = new UploadTranslationsRequest();
        request.setStorageId(100L);
        when(httpClientMock.post(eq(uploadTranslationsUrl), any(), any(), eq(UploadTranslationsResponseObject.class)))
            .thenThrow(HttpExceptionBuilder.build("-", "File from storage with id #" + request.getStorageId() + " was not found"))
            .thenReturn(response);

        client.uploadTranslations(languageId, request);

        verify(httpClientMock, times(2)).post(eq(uploadTranslationsUrl), any(), any(), eq(UploadTranslationsResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testStartBuildingTranslation() {
        ProjectBuildResponseObject response = new ProjectBuildResponseObject() {{
                setData(new ProjectBuild());
            }};
        when(httpClientMock.post(eq(startBuildingTranslationsUrl), any(), any(), eq(ProjectBuildResponseObject.class)))
            .thenReturn(response);
        BuildProjectTranslationRequest request = new BuildProjectTranslationRequest() {
        };

        client.startBuildingTranslation(request);

        verify(httpClientMock).post(eq(startBuildingTranslationsUrl), any(), any(), eq(ProjectBuildResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testCheckBuildingTranslation() {
        ProjectBuildResponseObject response = new ProjectBuildResponseObject() {{
                setData(new ProjectBuild());
            }};
        when(httpClientMock.get(eq(checkBuildingTranslationUrl), any(), eq(ProjectBuildResponseObject.class)))
            .thenReturn(response);

        client.checkBuildingTranslation(this.buildId);

        verify(httpClientMock).get(eq(checkBuildingTranslationUrl), any(), eq(ProjectBuildResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadBuild() {
        DownloadLinkResponseObject response = new DownloadLinkResponseObject() {{
                setData(new DownloadLink() {{
                            setUrl(downloadUrl);
                        }}
                );
            }};
        when(httpClientMock.get(eq(downloadBuildUrl), any(), eq(DownloadLinkResponseObject.class)))
            .thenReturn(response);

        client.downloadBuild(this.buildId);

        verify(httpClientMock).get(eq(downloadBuildUrl), any(), eq(DownloadLinkResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadBuildMalformed() {
        DownloadLinkResponseObject response = new DownloadLinkResponseObject() {{
                setData(new DownloadLink() {{
                            setUrl(downloadUrlMalformed);
                        }}
                );
            }};
        when(httpClientMock.get(eq(downloadBuildUrl), any(), eq(DownloadLinkResponseObject.class)))
            .thenReturn(response);

        assertThrows(RuntimeException.class, () -> client.downloadBuild(this.buildId));

        verify(httpClientMock).get(eq(downloadBuildUrl), any(), eq(DownloadLinkResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddSourceString() {
        SourceStringResponseObject response = new SourceStringResponseObject() {{
                setData(new SourceString());
            }};
        when(httpClientMock.post(eq(addSourceStringUrl), any(), any(), eq(SourceStringResponseObject.class)))
            .thenReturn(response);
        AddSourceStringRequest request = new AddSourceStringRequest();

        client.addSourceString(request);

        verify(httpClientMock).post(eq(addSourceStringUrl), any(), any(), eq(SourceStringResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testListSourceString() {
        SourceStringResponseList response = new SourceStringResponseList() {{
                setData(new ArrayList<>());
            }};
        when(httpClientMock.get(eq(listSourceStringUrl), any(), eq(SourceStringResponseList.class)))
            .thenReturn(response);

        client.listSourceString(fileId, null, null, "FiLtEr", null);

        verify(httpClientMock).get(eq(listSourceStringUrl), any(), eq(SourceStringResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDeleteSourceString() {
        client.deleteSourceString(stringId);

        verify(httpClientMock).delete(eq(deleteSourceStringUrl), any(), eq(Void.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testEditSourceString() {
        List<PatchRequest> request = new ArrayList<>();
        SourceStringResponseObject response = new SourceStringResponseObject() {{
                setData(new SourceString());
            }};
        when(httpClientMock.patch(eq(editSourceStringUrl), eq(request), any(), eq(SourceStringResponseObject.class)))
            .thenReturn(response);

        client.editSourceString(stringId, request);

        verify(httpClientMock).patch(eq(editSourceStringUrl), eq(request), any(), eq(SourceStringResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }



    @Test
    public void testHttpBadRequestException() {
        Mockito.doThrow(HttpExceptionBuilder.buildBadRequest("some-key", "987", "Some error"))
            .when(httpClientMock)
            .delete(eq(deleteSourceStringUrl), any(), eq(Void.class));

        assertThrows(RuntimeException.class, () -> client.deleteSourceString(stringId));

        verify(httpClientMock).delete(eq(deleteSourceStringUrl), any(), eq(Void.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testHttpExceptionUnknown() {
        Mockito.doThrow(HttpExceptionBuilder.build("unknown", "unknown exception"))
            .when(httpClientMock)
            .delete(eq(deleteSourceStringUrl), any(), eq(Void.class));

        assertThrows(RuntimeException.class, () -> client.deleteSourceString(stringId));

        verify(httpClientMock).delete(eq(deleteSourceStringUrl), any(), eq(Void.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testRuntimeException() {
        Mockito.doThrow(new RuntimeException("must be rethrown"))
            .when(httpClientMock)
            .delete(eq(deleteSourceStringUrl), any(), eq(Void.class));

        assertThrows(RuntimeException.class, () -> client.deleteSourceString(stringId));

        verify(httpClientMock).delete(eq(deleteSourceStringUrl), any(), eq(Void.class));
        verifyNoMoreInteractions(httpClientMock);
    }
}
