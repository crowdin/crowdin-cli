package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.screenshots.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class CrowdinClientScreenshotTest {

    private HttpClient httpClientMock;
    private ClientScreenshot client;

    private static final long projectId = 42;
    private static final long screenshotId = 52;
    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final String listScreenshotUrl = String.format("%s/projects/%d/screenshots", url, projectId);
    private static final String deleteScreenshotUrl = String.format("%s/projects/%d/screenshots/%d", url, projectId, screenshotId);
    private static final String uploadScreenshotUrl = String.format("%s/projects/%d/screenshots", url, projectId);
    private static final String updateScreenshotUrl = String.format("%s/projects/%d/screenshots/%d", url, projectId, screenshotId);

    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
            .jsonTransformer(new JacksonJsonTransformer())
            .httpClient(httpClientMock)
            .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientScreenshot(internalClient, Long.toString(projectId));
    }

    @Test
    public void testListScreenshots() {
        ScreenshotResponseList response = new ScreenshotResponseList() {{
            setData(new ArrayList<>());
        }};
        when(httpClientMock.get(eq(listScreenshotUrl), any(), eq(ScreenshotResponseList.class)))
            .thenReturn(response);

        client.listScreenshots(null);

        verify(httpClientMock).get(eq(listScreenshotUrl), any(), eq(ScreenshotResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDeleteScreenshot() {
        client.deleteScreenshot(screenshotId);

        verify(httpClientMock).delete(eq(deleteScreenshotUrl), any(), eq(Void.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testUploadScreenshot() throws ResponseException {
        ScreenshotResponseObject response = new ScreenshotResponseObject() {{
            setData(new Screenshot());
        }};
        when(httpClientMock.post(eq(uploadScreenshotUrl), any(), any(), eq(ScreenshotResponseObject.class)))
            .thenReturn(response);

        client.uploadScreenshot(new AddScreenshotRequest());

        verify(httpClientMock).post(eq(uploadScreenshotUrl), any(), any(), eq(ScreenshotResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testUpdateScreenshot() {
        ScreenshotResponseObject response = new ScreenshotResponseObject() {{
            setData(new Screenshot());
        }};
        when(httpClientMock.put(eq(updateScreenshotUrl), any(), any(), eq(ScreenshotResponseObject.class)))
            .thenReturn(response);

        client.updateScreenshot(screenshotId, new UpdateScreenshotRequest());

        verify(httpClientMock).put(eq(updateScreenshotUrl), any(), any(), eq(ScreenshotResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }
}