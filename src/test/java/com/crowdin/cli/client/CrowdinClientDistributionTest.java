package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.distributions.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class CrowdinClientDistributionTest {

    private HttpClient httpClientMock;
    private ClientDistribution client;

    private static final long projectId = 42;
    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";
    private static final String hash = "hash";

    private static final String listDistributionUrl = String.format("%s/projects/%s/distributions", url, projectId);
    private static final String addDistributionUrl = String.format("%s/projects/%s/distributions", url, projectId);
    private static final String editDistributionUrl = String.format("%s/projects/%s/distributions/%s", url, projectId, hash);

    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
                .jsonTransformer(new JacksonJsonTransformer())
                .httpClient(httpClientMock)
                .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientDistribution(internalClient, Long.toString(projectId));
    }

    @Test
    public void testListDistribution() {
        DistributionResponseList response = new DistributionResponseList() {{
            setData(new ArrayList<>());
        }};
        when(httpClientMock.get(eq(listDistributionUrl), any(), eq(DistributionResponseList.class)))
                .thenReturn(response);

        client.listDistribution();

        verify(httpClientMock).get(eq(listDistributionUrl), any(), eq(DistributionResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddDistribution() {
        DistributionResponseObject response = new DistributionResponseObject() {{
            setData(new Distribution());
        }};
        when(httpClientMock.post(eq(addDistributionUrl), any(), any(), eq(DistributionResponseObject.class)))
                .thenReturn(response);

        client.addDistribution(new AddDistributionRequest());

        verify(httpClientMock).post(eq(addDistributionUrl), any(), any(), eq(DistributionResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testEditDistribution() {
        DistributionResponseObject response = new DistributionResponseObject() {{
            setData(new Distribution());
        }};
        when(httpClientMock.patch(eq(editDistributionUrl), any(), any(), eq(DistributionResponseObject.class)))
                .thenReturn(response);

        client.editDistribution(hash, new ArrayList<>());

        verify(httpClientMock).patch(eq(editDistributionUrl), any(), any(), eq(DistributionResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }
}
