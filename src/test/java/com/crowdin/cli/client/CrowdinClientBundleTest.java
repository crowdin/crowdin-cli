package com.crowdin.cli.client;

import com.crowdin.client.bundles.model.Bundle;
import com.crowdin.client.bundles.model.BundleResponseList;
import com.crowdin.client.bundles.model.BundleResponseObject;
import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class CrowdinClientBundleTest {

    private HttpClient httpClientMock;
    private ClientBundle client;

    private static final long projectId = 42;
    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final String listBundleUrl = String.format("%s/projects/%s/bundles", url, projectId);
    private static final String addBundleUrl = String.format("%s/projects/%s/bundles", url, projectId);


    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
                .jsonTransformer(new JacksonJsonTransformer())
                .httpClient(httpClientMock)
                .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientBundle(internalClient, Long.toString(projectId));
    }

    @Test
    public void testListBundle() {
        BundleResponseList response = new BundleResponseList() {{
            setData(new ArrayList<>());
        }};
        when(httpClientMock.get(eq(listBundleUrl), any(), eq(BundleResponseList.class)))
                .thenReturn(response);

        client.listBundle();

        verify(httpClientMock).get(eq(listBundleUrl), any(), eq(BundleResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddBundle() {
        BundleResponseObject response = new BundleResponseObject() {{
            setData(new Bundle());
        }};
        when(httpClientMock.post(eq(addBundleUrl), any(), any(), eq(BundleResponseObject.class)))
                .thenReturn(response);

        client.addBundle(new Bundle());

        verify(httpClientMock).post(eq(addBundleUrl), any(), any(), eq(BundleResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

}
