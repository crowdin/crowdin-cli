package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.DownloadLinkResponseObject;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.ExportGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import com.crowdin.client.glossaries.model.GlossaryExportStatusResponseObject;
import com.crowdin.client.glossaries.model.GlossaryImportStatus;
import com.crowdin.client.glossaries.model.GlossaryImportStatusResponseObject;
import com.crowdin.client.glossaries.model.GlossaryResponseList;
import com.crowdin.client.glossaries.model.GlossaryResponseObject;
import com.crowdin.client.glossaries.model.ImportGlossaryRequest;
import com.crowdin.client.glossaries.model.TermResponseList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class CrowdinClientGlossaryTest {

    private HttpClient httpClientMock;
    private ClientGlossary client;

    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";
    private static final String downloadUrlMalformed = "https";
    private static final long glossaryId = 92;
    private static final String exportGlossaryId = "9-2";

    private static final String listGlossariesUrl =
        String.format("%s/glossaries", url);
    private static final String getGlossaryUrl =
        String.format("%s/glossaries/%d", url, glossaryId);
    private static final String addGlossaryUrl =
        String.format("%s/glossaries", url);
    private static final String importGlossaryUrl =
        String.format("%s/glossaries/%d/imports", url, glossaryId);
    private static final String startExportingGlossaryUrl =
        String.format("%s/glossaries/%d/exports", url, glossaryId);
    private static final String checkExportingGlossaryUrl =
        String.format("%s/glossaries/%d/exports/%s", url, glossaryId, exportGlossaryId);
    private static final String downloadGlossaryUrl =
        String.format("%s/glossaries/%s/exports/%s/download", url, glossaryId, exportGlossaryId);
    private static final String listTermsUrl =
        String.format("%s/glossaries/%d/terms", url, glossaryId);

    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .httpClient(httpClientMock)
            .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientGlossary(internalClient);
    }

    @Test
    public void testListGlossaries() {
        GlossaryResponseList response = new GlossaryResponseList() {{
                setData(new ArrayList<>());
            }};
        when(httpClientMock.get(eq(listGlossariesUrl), any(), eq(GlossaryResponseList.class)))
            .thenReturn(response);

        client.listGlossaries();

        verify(httpClientMock).get(eq(listGlossariesUrl), any(), eq(GlossaryResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testGetGlossary() {
        GlossaryResponseObject response = new GlossaryResponseObject() {{
                setData(new Glossary());
            }};
        when(httpClientMock.get(eq(getGlossaryUrl), any(), eq(GlossaryResponseObject.class)))
            .thenReturn(response);

        client.getGlossary(glossaryId);

        verify(httpClientMock).get(eq(getGlossaryUrl), any(), eq(GlossaryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testGetGlossary_throws() {
        when(httpClientMock.get(eq(getGlossaryUrl), any(), eq(GlossaryResponseObject.class)))
            .thenThrow(new RuntimeException("any"));

        assertThrows(RuntimeException.class, () -> client.getGlossary(glossaryId));

        verify(httpClientMock).get(eq(getGlossaryUrl), any(), eq(GlossaryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddGlossary() {
        GlossaryResponseObject response = new GlossaryResponseObject() {{
                setData(new Glossary());
            }};
        when(httpClientMock.post(eq(addGlossaryUrl), any(), any(), eq(GlossaryResponseObject.class)))
            .thenReturn(response);
        AddGlossaryRequest request = new AddGlossaryRequest();

        client.addGlossary(request);

        verify(httpClientMock).post(eq(addGlossaryUrl), any(), any(), eq(GlossaryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testImportGlossary() {
        GlossaryImportStatusResponseObject response = new GlossaryImportStatusResponseObject() {{
                setData(new GlossaryImportStatus());
            }};
        when(httpClientMock.post(eq(importGlossaryUrl), any(), any(), eq(GlossaryImportStatusResponseObject.class)))
            .thenReturn(response);
        ImportGlossaryRequest request = new ImportGlossaryRequest();

        client.importGlossary(glossaryId, request);

        verify(httpClientMock).post(eq(importGlossaryUrl), any(), any(), eq(GlossaryImportStatusResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testStartExportingGlossary() {
        GlossaryExportStatusResponseObject response = new GlossaryExportStatusResponseObject() {{
                setData(new GlossaryExportStatus());
            }};
        when(httpClientMock.post(eq(startExportingGlossaryUrl), any(), any(), eq(GlossaryExportStatusResponseObject.class)))
            .thenReturn(response);
        ExportGlossaryRequest request = new ExportGlossaryRequest();

        client.startExportingGlossary(glossaryId, request);

        verify(httpClientMock).post(eq(startExportingGlossaryUrl), any(), any(), eq(GlossaryExportStatusResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testCheckExportingGlossary() {
        GlossaryExportStatusResponseObject response = new GlossaryExportStatusResponseObject() {{
                setData(new GlossaryExportStatus());
            }};
        when(httpClientMock.get(eq(checkExportingGlossaryUrl), any(), eq(GlossaryExportStatusResponseObject.class)))
            .thenReturn(response);

        client.checkExportingGlossary(glossaryId, exportGlossaryId);

        verify(httpClientMock).get(eq(checkExportingGlossaryUrl), any(), eq(GlossaryExportStatusResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadGlossary() {
        DownloadLinkResponseObject response = new DownloadLinkResponseObject() {{
                setData(new DownloadLink() {{
                            setUrl(url);
                        }}
                );
            }};
        when(httpClientMock.get(eq(downloadGlossaryUrl), any(), eq(DownloadLinkResponseObject.class)))
            .thenReturn(response);

        client.downloadGlossary(glossaryId, exportGlossaryId);

        verify(httpClientMock).get(eq(downloadGlossaryUrl), any(), eq(DownloadLinkResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadGlossary_throws() {
        DownloadLinkResponseObject response = new DownloadLinkResponseObject() {{
                setData(new DownloadLink() {{
                            setUrl(downloadUrlMalformed);
                        }}
                );
            }};
        when(httpClientMock.get(eq(downloadGlossaryUrl), any(), eq(DownloadLinkResponseObject.class)))
            .thenReturn(response);

        assertThrows(RuntimeException.class, () -> client.downloadGlossary(glossaryId, exportGlossaryId));

        verify(httpClientMock).get(eq(downloadGlossaryUrl), any(), eq(DownloadLinkResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testListTerms() {
        TermResponseList response = new TermResponseList() {{
                setData(new ArrayList<>());
            }};
        when(httpClientMock.get(eq(listTermsUrl), any(), eq(TermResponseList.class)))
            .thenReturn(response);

        client.listTerms(glossaryId);

        verify(httpClientMock).get(eq(listTermsUrl), any(), eq(TermResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

}
