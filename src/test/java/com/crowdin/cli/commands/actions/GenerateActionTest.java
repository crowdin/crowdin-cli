package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

public class GenerateActionTest {

    TempProject project;

    private NewAction<NoProperties, NoClient> action;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void simpleTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        InputStream responsesIS = setResponses(false, false, "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new GenerateAction(files, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void writeToFileThrowsTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        doThrow(new IOException()).when(files).writeToFile(anyString(), any());
        InputStream responsesIS = setResponses(false, false, "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new GenerateAction(files, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class)));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void enterprisetest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        doThrow(new IOException()).when(files).writeToFile(anyString(), any());
        InputStream responsesIS = setResponses(false, true, "undefined", "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new GenerateAction(files, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class)));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void enterpriseUrlTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        doThrow(new IOException()).when(files).writeToFile(anyString(), any());
        InputStream responsesIS = setResponses(false, true, "https://undefined.crowdin.com", "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new GenerateAction(files, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class)));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void enterpriseNoNametest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        doThrow(new IOException()).when(files).writeToFile(anyString(), any());
        InputStream responsesIS = setResponses(false, true, "", "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new GenerateAction(files, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class)));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void fileExists() throws IOException {
        project.addFile("crowdin.yml");
        FilesInterface files = mock(FilesInterface.class);
        doThrow(new IOException()).when(files).writeToFile(anyString(), any());
        InputStream responsesIS = setResponses(false, true, "https://undefined.crowdin.com", "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new GenerateAction(files, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class));

        verifyNoMoreInteractions(files);
    }

    private static InputStream setResponses(boolean authViaBrowser, boolean isEnterprise, String apiToken, String projectId, String basePath) {
        return setResponses(authViaBrowser, isEnterprise, null, apiToken, projectId, basePath);
    }

    private static InputStream setResponses(
        boolean authViaBrowser, boolean isEnterprise, String organizationName, String apiToken, String projectId, String basePath
    ) {
        String responsesString =
            (authViaBrowser ? "yes" : "no") + "\n"
            + (isEnterprise ? "yes" + "\n" + organizationName : "no") + "\n"
            + apiToken + "\n"
            + projectId + "\n"
            + basePath + "\n";
        return new ByteArrayInputStream(responsesString.getBytes(StandardCharsets.UTF_8));
    }
}
