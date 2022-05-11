package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.client.WaitResponseException;
import com.crowdin.cli.client.models.BranchBuilder;
import com.crowdin.cli.client.models.DirectoryBuilder;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyZeroInteractions;
import static org.mockito.Mockito.when;

public class ProjectUtilsTest {

    private static final Long PROJECT_ID = 42L;
    ProjectClient client;

    @Test
    public void testCreatePath_PathExists() {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
                put(Utils.normalizePath("folder/"), 101L);
                put(Utils.normalizePath("folder/folder2/"), 102L);
            }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Long branch = null;

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch, false);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verifyZeroInteractions(client);
    }

    @Test
    public void testCreatePath_PathNotExists() throws ResponseException {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Long branch = null;
        AddDirectoryRequest request1 = new AddDirectoryRequest() {{
                setName("folder");
            }};
        AddDirectoryRequest request2 = new AddDirectoryRequest() {{
                setName("folder2");
                setDirectoryId(101L);
            }};
        when(client.addDirectory(eq(request1)))
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder", 101L, null, null).build());
        when(client.addDirectory(eq(request2)))
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder2", 102L, 101L, null).build());

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch, false);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(eq(request1));
        verify(client).addDirectory(eq(request2));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_HalfPathNotExists() throws ResponseException {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
                put(Utils.normalizePath("folder/"), 101L);
            }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Long branch = null;
        AddDirectoryRequest request = new AddDirectoryRequest() {{
                setName("folder2");
                setDirectoryId(101L);
            }};
        when(client.addDirectory(eq(request)))
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder2", 102L, 101L, null).build());

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch, false);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_PathExists_WithBranch() {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
                put(Utils.normalizePath("folder/"), 101L);
                put(Utils.normalizePath("folder/folder2/"), 102L);
            }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch.getId(), false);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verifyZeroInteractions(client);
    }

    @Test
    public void testCreatePath_PathNotExists_WithBranch() throws ResponseException {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();
        AddDirectoryRequest request1 = new AddDirectoryRequest() {{
                setName("folder");
                setBranchId(branch.getId());
            }};
        AddDirectoryRequest request2 = new AddDirectoryRequest() {{
                setName("folder2");
                setDirectoryId(101L);
            }};
        when(client.addDirectory(eq(request1)))
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder", 101L, null, branch.getId()).build());
        when(client.addDirectory(eq(request2)))
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder2", 102L, 101L, branch.getId()).build());

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch.getId(), false);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(eq(request1));
        verify(client).addDirectory(eq(request2));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_HalfPathNotExists_WithBranch() throws ResponseException {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
                put(Utils.normalizePath("folder/"), 101L);
            }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();
        AddDirectoryRequest request = new AddDirectoryRequest() {{
                setName("folder2");
                setDirectoryId(101L);
            }};
        when(client.addDirectory(eq(request)))
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder2", 102L, 101L, branch.getId()).build());

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch.getId(), false);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_PathNotExists_ResponseException() throws ResponseException {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Long branch = null;
        when(client.addDirectory(any())).thenThrow(new RuntimeException("Error while creating directory"));

        assertThrows(RuntimeException.class,
            () -> ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch, false));

        verify(client).addDirectory(any());
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePathForWaitResponseException() throws ResponseException {
        client = mock(ProjectClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/file.txt");
        Long branch = null;
        AddDirectoryRequest request1 = new AddDirectoryRequest() {{
                setName("folder");
            }};
        when(client.addDirectory(eq(request1)))
            .thenThrow(new WaitResponseException())
            .thenReturn(DirectoryBuilder.standard().setProjectId(PROJECT_ID)
                .setIdentifiers("folder", 101L, null, null).build());

        long resultDirectoryId = ProjectUtils.createPath(Outputter.getDefault(), client, directoriesIdMap, filePath, branch, false);

        assertEquals(101L, resultDirectoryId, "Directory id is not correct");
        verify(client, times(2)).addDirectory(eq(request1));
        verifyNoMoreInteractions(client);
    }
}
