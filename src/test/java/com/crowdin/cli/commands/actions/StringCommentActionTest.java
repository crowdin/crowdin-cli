package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class StringCommentActionTest {

    NewAction<ProjectProperties, ProjectClient> action;

    @ParameterizedTest
    @MethodSource
    public void testStringComment(String text, String type, String languageId, String issueType, String stringId) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        AddStringCommentRequest request = RequestBuilder.addComment(text, type, languageId, issueType, stringId);

        ProjectClient client = mock(ProjectClient.class);
        when(client.commentString(request))
                .thenReturn(new StringComment() {{
                    setType(request.getType());
                    setText(request.getText());
                    setLanguageId(request.getTargetLanguageId());
                    setIssueType(request.getIssueType());
                    setStringId(request.getStringId());
                }});
        action = new StringCommentAction(true, true, text, stringId, languageId, type, issueType);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).commentString(request);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testStringComment() {
        return Stream.of(
                arguments("My comment", "comment", "es", null, "1234"),
                arguments("My comment", "issue", "es", null, "3456"));
    }

    @Test
    public void testStringCommentThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);

        AddStringCommentRequest request = RequestBuilder.addComment(null, "comment", null, null, null);

        when(client.commentString(request))
                .thenThrow(new RuntimeException("Whoops"));

        action = new StringCommentAction(true, true, null, null, null, "comment", null);

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).commentString(request);
        verifyNoMoreInteractions(client);
    }

}
