package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.stringcomments.model.StringComment;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class CommentResolveActionTest {

    NewAction<ProjectProperties, ClientComment> action;

    @Test
    public void testCommentResolve() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalPropertiesBeanWithoutFileBean();
        PropertiesWithFiles pb = pbBuilder.build();

        Long id = 13l;
        ClientComment client = mock(ClientComment.class);
        when(client.resolve(id))
                .thenReturn(new StringComment() {{
                    setId(id);
                }});
        action = new CommentResolveAction(id);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).resolve(id);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testResolveCommentThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalPropertiesBeanWithoutFileBean();
        PropertiesWithFiles pb = pbBuilder.build();
        ClientComment client = mock(ClientComment.class);
        Long id = 13l;

        when(client.resolve(id))
                .thenThrow(new RuntimeException("Whoops"));

        action = new CommentResolveAction(id);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).resolve(id);
        verifyNoMoreInteractions(client);
    }

}
