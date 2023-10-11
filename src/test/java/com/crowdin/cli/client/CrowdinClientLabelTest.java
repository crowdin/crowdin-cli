package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.labels.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CrowdinClientLabelTest {
    private HttpClient httpClientMock;
    private ClientLabel client;

    private static final long projectId = 42;
    private static final long labelId = 52;
    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final String listLabelUrl = String.format("%s/projects/%d/labels", url, projectId);
    private static final String deleteLabelUrl = String.format("%s/projects/%d/labels/%d", url, projectId, labelId);
    private static final String addLabelUrl = String.format("%s/projects/%d/labels", url, projectId);

    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
                .jsonTransformer(new JacksonJsonTransformer())
                .httpClient(httpClientMock)
                .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientLabel(internalClient, Long.toString(projectId));
    }

    @Test
    public void testListLabels() {
        LabelResponseList response = new LabelResponseList() {{
            setData(new ArrayList<>());
        }};
        when(httpClientMock.get(eq(listLabelUrl), any(), eq(LabelResponseList.class)))
                .thenReturn(response);

        client.listLabels();

        verify(httpClientMock).get(eq(listLabelUrl), any(), eq(LabelResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testDeleteLabel() {
        client.deleteLabel(labelId);

        verify(httpClientMock).delete(eq(deleteLabelUrl), any(), eq(Void.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddLabel() {
        LabelResponseObject response = new LabelResponseObject() {{
            setData(new Label());
        }};
        when(httpClientMock.post(eq(addLabelUrl), any(), any(), eq(LabelResponseObject.class)))
                .thenReturn(response);

        client.addLabel(new AddLabelRequest());

        verify(httpClientMock).post(eq(addLabelUrl), any(), any(), eq(LabelResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }
}
