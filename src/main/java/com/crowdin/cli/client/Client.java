package com.crowdin.cli.client;

import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.core.model.PatchRequest;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import com.crowdin.client.glossaries.model.GlossaryImportStatus;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.glossaries.model.Term;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.AddFileRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.UpdateFileRequest;
import com.crowdin.client.sourcestrings.model.AddSourceStringRequest;
import com.crowdin.client.sourcestrings.model.SourceString;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportStatus;
import com.crowdin.client.translations.model.BuildProjectTranslationRequest;
import com.crowdin.client.translations.model.ProjectBuild;
import com.crowdin.client.translations.model.UploadTranslationsRequest;
import com.crowdin.client.translationstatus.model.LanguageProgress;

import java.io.InputStream;
import java.net.Authenticator;
import java.net.PasswordAuthentication;
import java.net.URL;
import java.util.List;
import java.util.Optional;

public interface Client {

    CrowdinProjectFull downloadFullProject();

    CrowdinProject downloadProjectWithLanguages();

    CrowdinProjectInfo downloadProjectInfo();

    Branch addBranch(AddBranchRequest request);

    Long uploadStorage(String fileName, InputStream content);

    Directory addDirectory(AddDirectoryRequest request) throws ResponseException;

    void updateSource(Long sourceId, UpdateFileRequest request);

    void addSource(AddFileRequest request);

    void uploadTranslations(String languageId, UploadTranslationsRequest request);

    ProjectBuild startBuildingTranslation(BuildProjectTranslationRequest request);

    ProjectBuild checkBuildingTranslation(Long buildId);

    URL downloadBuild(Long buildId);

    List<LanguageProgress> getProjectProgress(String languageId);

    SourceString addSourceString(AddSourceStringRequest request);

    List<SourceString> listSourceString(Long fileId, String filter);

    void deleteSourceString(Long id);

    SourceString editSourceString(Long sourceId, List<PatchRequest> requests);

    List<Glossary> listGlossaries();

    Optional<Glossary> getGlossary(Long glossaryId);

    Glossary addGlossary(AddGlossaryRequest request);

    GlossaryImportStatus importGlossary(Long glossaryId, ImportGlossaryRequest request);

    List<Term> listTerms(Long glossaryId);

    GlossaryExportStatus startExportingGlossary(Long glossaryId, ExportGlossaryRequest request);

    GlossaryExportStatus checkExportingGlossary(Long glossaryId, String exportId);

    URL downloadGlossary(Long glossaryId, String exportId);

    List<TranslationMemory> listTms();

    Optional<TranslationMemory> getTm(Long tmId);

    TranslationMemory addTm(AddTranslationMemoryRequest request);

    TranslationMemoryImportStatus importTm(Long tmId, TranslationMemoryImportRequest request);

    TranslationMemoryExportStatus startExportingTm(Long tmId, TranslationMemoryExportRequest request);

    TranslationMemoryExportStatus checkExportingTm(Long tmId, String exportId);

    URL downloadTm(Long tmId, String exportId);

    static Client getDefault(String apiToken, String baseUrl, long projectId) {
        boolean isTesting = PropertiesBeanUtils.isUrlForTesting(baseUrl);
        String organization = PropertiesBeanUtils.getOrganization(baseUrl);
        Credentials credentials = (isTesting)
            ? new Credentials(apiToken, organization, baseUrl)
            : new Credentials(apiToken, organization);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .userAgent(Utils.buildUserAgent())
            .build();
        Utils.proxyHost()
            .map(pair -> new ClientConfig.Host(pair.getKey(), pair.getValue()))
            .ifPresent(proxy -> {
                clientConfig.setProxy(proxy);

                System.setProperty("https.proxyHost", proxy.getHost());
                System.setProperty("https.proxyPort", String.valueOf(proxy.getPort()));
            });
        Utils.proxyCredentials()
            .map(pair -> new ClientConfig.UsernamePasswordCredentials(pair.getKey(), pair.getValue()))
            .ifPresent(proxyCreds -> {
                clientConfig.setProxyCreds(proxyCreds);

                System.setProperty("https.proxyUser", proxyCreds.getUsername());
                System.setProperty("https.proxyPassword", proxyCreds.getPassword());
            });
        com.crowdin.client.Client client = new com.crowdin.client.Client(credentials, clientConfig);
        return new CrowdinClient(client, projectId);
    }
}
