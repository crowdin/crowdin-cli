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
import org.mockito.ArgumentCaptor;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

public class InitActionTest {

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

    public static class TestInitAction extends InitAction {

        public TestInitAction(FilesInterface files, String token, String baseUrl, String basePath, String projectId, String source, String translation, Boolean preserveHierarchy, Path destinationPath, boolean quiet) {
            super(files, token, baseUrl, basePath, projectId, source, translation, preserveHierarchy, destinationPath, quiet);
        }

        @Override
        protected List<String> getSharedFileLines() {
            return null;
        }

        @Override
        protected void verifyAuth(Map<String, String> values) {
        }
    }

    @Test
    public void simpleTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        InputStream responsesIS = setResponses(false, false, "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new TestInitAction(files,  null, null, null, null, null, null, null, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void userInputTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);

        action = new TestInitAction(files,  "token", "", ".", "42", "file.json", "translation.json", true, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class));

        verify(files).writeToFile(anyString(), any());
        verifyNoMoreInteractions(files);
    }

    @Test
    public void userInputAllTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);

        action = new TestInitAction(files, "token", "https://api.crowdin.com", ".", "42", "file.json", "translation.json", true, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
        action.act(Outputter.getDefault(), new NoProperties(), mock(NoClient.class));

        ArgumentCaptor<InputStream> contentCaptor = ArgumentCaptor.forClass(InputStream.class);
        verify(files).writeToFile(anyString(), contentCaptor.capture());
        verifyNoMoreInteractions(files);

        List<String> actualLines = new BufferedReader(new InputStreamReader(contentCaptor.getValue(), UTF_8))
            .lines()
            .collect(Collectors.toList());

        assertTrue(actualLines.contains("\"project_id\": \"42\""));
        assertTrue(actualLines.contains("\"api_token\": \"token\""));
        assertTrue(actualLines.contains("\"base_path\": \".\""));
        assertTrue(actualLines.contains("\"base_url\": \"https://api.crowdin.com\""));
        assertTrue(actualLines.contains("\"preserve_hierarchy\": true"));
        assertTrue(actualLines.contains("    \"source\": \"file.json\","));
        assertTrue(actualLines.contains("    \"translation\": \"translation.json\","));
    }

    @Test
    public void writeToFileThrowsTest() throws IOException {
        FilesInterface files = mock(FilesInterface.class);
        doThrow(new IOException()).when(files).writeToFile(anyString(), any());
        InputStream responsesIS = setResponses(false, false, "apiToken", "42", ".");
        System.setIn(responsesIS);

        action = new TestInitAction(files, null, null, null, null, null, null, null, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
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

        action = new TestInitAction(files, null, null, null, null, null, null, null, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
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

        action = new TestInitAction(files, null, null, null, null, null, null, null, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
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

        action = new TestInitAction(files, null, null, null, null, null, null, null, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
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

        action = new TestInitAction(files, null, null, null, null, null, null, null, Paths.get(project.getBasePath() + "/crowdin.yml"), false);
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
        return new ByteArrayInputStream(responsesString.getBytes(UTF_8));
    }
}
