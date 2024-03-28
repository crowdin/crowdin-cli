package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.DownloadLinkResponseObject;
import com.crowdin.client.translationmemory.model.AddTranslationMemoryRequest;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatusResponseObject;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportStatus;
import com.crowdin.client.translationmemory.model.TranslationMemoryImportStatusResponseObject;
import com.crowdin.client.translationmemory.model.TranslationMemoryResponseList;
import com.crowdin.client.translationmemory.model.TranslationMemoryResponseObject;
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

public class CrowdinClientTmTest {

    private HttpClient httpClientMock;
    private ClientTm client;

    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final long tmId = 102;
    private static final String exportTmId = "1-0-2";
    private static final String downloadUrl = "https://downloadme.crowdin.com";
    private static final String downloadUrlMalformed = "https";

    private static final String listTmsUrl =
        String.format("%s/tms", url);
    private static final String getTmUrl =
        String.format("%s/tms/%d", url, tmId);
    private static final String addTmUrl =
        String.format("%s/tms", url);
    private static final String importTmUrl =
        String.format("%s/tms/%s/imports", url, tmId);
    private static final String startExportingTmUrl =
        String.format("%s/tms/%d/exports", url, tmId);
    private static final String checkExportingTmUrl =
        String.format("%s/tms/%d/exports/%s", url, tmId, exportTmId);
    private static final String downloadTmUrl =
        String.format("%s/tms/%d/exports/%s/download", url, tmId, exportTmId);

    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .httpClient(httpClientMock)
            .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientTm(internalClient);
    }

    @Test
    public void testListTms() {
        TranslationMemoryResponseList response = new TranslationMemoryResponseList() {{
                setData(new ArrayList<>());
            }};
        when(httpClientMock.get(eq(listTmsUrl), any(), eq(TranslationMemoryResponseList.class)))
            .thenReturn(response);

        client.listTms();

        verify(httpClientMock).get(eq(listTmsUrl), any(), eq(TranslationMemoryResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testGetTm() {
        TranslationMemoryResponseObject response = new TranslationMemoryResponseObject() {{
                setData(new TranslationMemory());
            }};
        when(httpClientMock.get(eq(getTmUrl), any(), eq(TranslationMemoryResponseObject.class)))
            .thenReturn(response);

        client.getTm(tmId);

        verify(httpClientMock).get(eq(getTmUrl), any(), eq(TranslationMemoryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testGetTm_notFound() {
        when(httpClientMock.get(eq(getTmUrl), any(), eq(TranslationMemoryResponseObject.class)))
            .thenThrow(new RuntimeException("any"));

        assertThrows(RuntimeException.class, () -> client.getTm(tmId));

        verify(httpClientMock).get(eq(getTmUrl), any(), eq(TranslationMemoryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddTm() {
        TranslationMemoryResponseObject response = new TranslationMemoryResponseObject() {{
                setData(new TranslationMemory());
            }};
        when(httpClientMock.post(eq(addTmUrl), any(), any(), eq(TranslationMemoryResponseObject.class)))
            .thenReturn(response);

        client.addTm(new AddTranslationMemoryRequest());

        verify(httpClientMock).post(eq(addTmUrl), any(), any(), eq(TranslationMemoryResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testImportTm() {
        TranslationMemoryImportStatusResponseObject response = new TranslationMemoryImportStatusResponseObject() {{
                setData(new TranslationMemoryImportStatus());
            }};
        when(httpClientMock.post(eq(importTmUrl), any(), any(), eq(TranslationMemoryImportStatusResponseObject.class)))
            .thenReturn(response);

        client.importTm(tmId, new TranslationMemoryImportRequest());

        verify(httpClientMock).post(eq(importTmUrl), any(), any(), eq(TranslationMemoryImportStatusResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testStartExportingTm() {
        TranslationMemoryExportStatusResponseObject response = new TranslationMemoryExportStatusResponseObject() {{
                setData(new TranslationMemoryExportStatus());
            }};
        when(httpClientMock.post(eq(startExportingTmUrl), any(), any(), eq(TranslationMemoryExportStatusResponseObject.class)))
            .thenReturn(response);

        client.startExportingTm(tmId, new TranslationMemoryExportRequest());

        verify(httpClientMock).post(eq(startExportingTmUrl), any(), any(), eq(TranslationMemoryExportStatusResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testCheckExportingTm() {
        TranslationMemoryExportStatusResponseObject response = new TranslationMemoryExportStatusResponseObject() {{
                setData(new TranslationMemoryExportStatus());
            }};
        when(httpClientMock.get(eq(checkExportingTmUrl), any(), eq(TranslationMemoryExportStatusResponseObject.class)))
            .thenReturn(response);

        client.checkExportingTm(tmId, exportTmId);

        verify(httpClientMock).get(eq(checkExportingTmUrl), any(), eq(TranslationMemoryExportStatusResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadTm() {
        DownloadLinkResponseObject response = new DownloadLinkResponseObject() {{
                setData(new DownloadLink() {{
                            setUrl(downloadUrl);
                        }}
                );
            }};
        when(httpClientMock.get(eq(downloadTmUrl), any(), eq(DownloadLinkResponseObject.class)))
            .thenReturn(response);

        client.downloadTm(tmId, exportTmId);

        verify(httpClientMock).get(eq(downloadTmUrl), any(), eq(DownloadLinkResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDownloadTm_throwsMalformedUrl() {
        DownloadLinkResponseObject response = new DownloadLinkResponseObject() {{
                setData(new DownloadLink() {{
                            setUrl(downloadUrlMalformed);
                        }}
                );
            }};
        when(httpClientMock.get(eq(downloadTmUrl), any(), eq(DownloadLinkResponseObject.class)))
            .thenReturn(response);

        assertThrows(RuntimeException.class, () -> client.downloadTm(tmId, exportTmId));

        verify(httpClientMock).get(eq(downloadTmUrl), any(), eq(DownloadLinkResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

}
