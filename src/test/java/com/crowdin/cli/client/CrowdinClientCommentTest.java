package com.crowdin.cli.client;

import com.crowdin.client.core.http.HttpClient;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.core.model.ClientConfig;
import com.crowdin.client.core.model.Credentials;
import com.crowdin.client.stringcomments.model.StringComment;
import com.crowdin.client.stringcomments.model.StringCommentResponseList;
import com.crowdin.client.stringcomments.model.StringCommentResponseObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class CrowdinClientCommentTest {

    private HttpClient httpClientMock;
    private ClientComment client;

    private static final long projectId = 42;
    private static final long commentId = 1l;
    private static final String preUrl = "https://testme.crowdin.com";
    private static final String url = "https://testme.crowdin.com/api/v2";

    private static final String listCommentUrl = String.format("%s/projects/%s/comments", url, projectId);
    private static final String resolveCommentUrl = String.format("%s/projects/%s/comments/%s", url, projectId, commentId);


    @BeforeEach
    public void init() {
        Credentials creds = new Credentials("VeryBigToken", "TestingCompany", preUrl);
        httpClientMock = mock(HttpClient.class);
        ClientConfig clientConfig = ClientConfig.builder()
                .jsonTransformer(new JacksonJsonTransformer())
                .httpClient(httpClientMock)
                .build();
        com.crowdin.client.Client internalClient = new com.crowdin.client.Client(creds, clientConfig);
        client = new CrowdinClientComment(internalClient, Long.toString(projectId));
    }

    @Test
    public void testListComment() {
        StringCommentResponseList response = new StringCommentResponseList() {{
            setData(new ArrayList<>());
        }};
        when(httpClientMock.get(eq(listCommentUrl), any(), eq(StringCommentResponseList.class)))
                .thenReturn(response);

        client.listComment(null, null, null, null);

        verify(httpClientMock).get(eq(listCommentUrl), any(), eq(StringCommentResponseList.class));
        verifyNoMoreInteractions(httpClientMock);
    }

    @Test
    public void testResolveComment() {
        StringCommentResponseObject response = new StringCommentResponseObject() {{
            setData(new StringComment() {{
                setId(commentId);
                setText("My comment");
            }});
        }};
        when(httpClientMock.patch(eq(resolveCommentUrl), any(), any(), eq(StringCommentResponseObject.class)))
                .thenReturn(response);

        client.resolve(commentId);

        verify(httpClientMock).patch(eq(resolveCommentUrl), any(), any(), eq(StringCommentResponseObject.class));
        verifyNoMoreInteractions(httpClientMock);
    }

}
