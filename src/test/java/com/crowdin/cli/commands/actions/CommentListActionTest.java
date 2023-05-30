package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.StringComment;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

public class CommentListActionTest {

    StringComment comment =   new StringComment() {{
        setId(1l);
        setText("comment 1");
        setType(com.crowdin.client.stringcomments.model.Type.COMMENT);
    }};

    StringComment issue =   new StringComment() {{
        setId(2l);
        setText("comment 2");
        setType(com.crowdin.client.stringcomments.model.Type.ISSUE);
        setIssueType(com.crowdin.client.issues.model.Type.CONTEXT_REQUEST.toString());
        setIssueStatus(IssueStatus.UNRESOLVED);
    }};
    List<StringComment> standardList = Arrays.asList(comment, issue);
    List<StringComment> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientComment clientMock = mock(ClientComment.class);
    NewAction<ProjectProperties, ClientComment> action;

    @Test
    public void test_standard() {
        when(clientMock.listComment(null, null, null, null))
                .thenReturn(standardList);

        action = new CommentListAction(false, false, null, null, null,
                                       null);
        action.act(out, pb, clientMock);

        verify(clientMock).listComment(null, null, null, null);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listComment(null, null, null, null))
                .thenReturn(standardList);

        action = new CommentListAction(true, false, null, null, null,
                                       null);
        action.act(out, pb, clientMock);

        verify(clientMock).listComment(null, null, null, null);

        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listComment(null, com.crowdin.client.stringcomments.model.Type.ISSUE,
                                    com.crowdin.client.issues.model.Type.CONTEXT_REQUEST, IssueStatus.RESOLVED))
                .thenReturn(emptyList);

        action = new CommentListAction(false, false, null,
                                       com.crowdin.client.stringcomments.model.Type.ISSUE,
                                       com.crowdin.client.issues.model.Type.CONTEXT_REQUEST, IssueStatus.RESOLVED);
        action.act(out, pb, clientMock);

        verify(clientMock).listComment(null, com.crowdin.client.stringcomments.model.Type.ISSUE,
                                       com.crowdin.client.issues.model.Type.CONTEXT_REQUEST, IssueStatus.RESOLVED);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listComment(null, com.crowdin.client.stringcomments.model.Type.ISSUE,
                                    com.crowdin.client.issues.model.Type.CONTEXT_REQUEST, IssueStatus.RESOLVED))
                .thenReturn(emptyList);

        action = new CommentListAction(true, false, null,
                                       com.crowdin.client.stringcomments.model.Type.ISSUE,
                                       com.crowdin.client.issues.model.Type.CONTEXT_REQUEST, IssueStatus.RESOLVED);
        action.act(out, pb, clientMock);

        verify(clientMock).listComment(null, com.crowdin.client.stringcomments.model.Type.ISSUE,
                                       com.crowdin.client.issues.model.Type.CONTEXT_REQUEST, IssueStatus.RESOLVED);
        verifyNoMoreInteractions(clientMock);
    }
}
