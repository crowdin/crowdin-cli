package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.tasks.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class CrowdinClientTaskTest {

    private HttpClient httpClientMock;
    private ClientTask client;

    private static final long projectId = 42;
    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final String listTaskUrl = String.format("%s/projects/%s/tasks", url, projectId);
    private static final String addTmUrl = String.format("%s/projects/%s/tasks", url, projectId);


    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
                .jsonTransformer(new JacksonJsonTransformer())
                .httpClient(httpClientMock)
                .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientTask(internalClient, Long.toString(projectId));
    }

    @Test
    public void testListTask() {
        TaskResponseList response = new TaskResponseList() {{
            setData(new ArrayList<>());
        }};
        when(httpClientMock.get(eq(listTaskUrl), any(), eq(TaskResponseList.class)))
                .thenReturn(response);

        client.listTask(Status.TODO);

        verify(httpClientMock).get(eq(listTaskUrl), any(), eq(TaskResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testAddTask() {
        TaskResponseObject response = new TaskResponseObject() {{
            setData(new Task());
        }};
        when(httpClientMock.post(eq(addTmUrl), any(), any(), eq(TaskResponseObject.class)))
                .thenReturn(response);

        client.addTask(new AddTaskRequest());

        verify(httpClientMock).post(eq(addTmUrl), any(), any(), eq(TaskResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

}
