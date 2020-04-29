package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.models.BranchBuilder;
import com.crowdin.cli.client.models.DirectoryBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.AddBranchRequest;
import com.crowdin.client.sourcefiles.model.AddDirectoryRequest;
import com.crowdin.client.sourcefiles.model.Branch;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatcher;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class ProjectUtilsTest {

    private static final Long PROJECT_ID = 42L;

    @Test
    public void testCreatePath_PathExists() {
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("folder/"), 101L);
            put(Utils.normalizePath("folder/folder2/"), 102L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = null;

        long resultDirectoryId = ProjectUtils.createPath(client, directoriesIdMap, filePath, branch);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verifyZeroInteractions(client);
    }

    @Test
    public void testCreatePath_PathNotExists() throws ResponseException {
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = null;
        AddDirectoryRequest request1 = new AddDirectoryRequest();
        request1.setName("folder");
        AddDirectoryRequest request2 = new AddDirectoryRequest();
        request2.setName("folder2");
        request2.setDirectoryId(101L);
        when(client.addDirectory(argThat(new DirectoryPayloadMatcher(request1))))
            .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder", 101L, null, null).build());
        when(client.addDirectory(argThat(new DirectoryPayloadMatcher(request2))))
            .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, null).build());

        long resultDirectoryId = ProjectUtils.createPath(client, directoriesIdMap, filePath, branch);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(argThat(new DirectoryPayloadMatcher(request1)));
        verify(client).addDirectory(argThat(new DirectoryPayloadMatcher(request2)));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_HalfPathNotExists() throws ResponseException {
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("folder/"), 101L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = null;
        AddDirectoryRequest request = new AddDirectoryRequest();
        request.setName("folder2");
        request.setDirectoryId(101L);
        when(client.addDirectory(argThat(new DirectoryPayloadMatcher(request))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, null).build());

        long resultDirectoryId = ProjectUtils.createPath(client, directoriesIdMap, filePath, branch);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(argThat(new DirectoryPayloadMatcher(request)));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_PathExists_WithBranch() {
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("branch/folder/"), 101L);
            put(Utils.normalizePath("branch/folder/folder2/"), 102L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();

        long resultDirectoryId = ProjectUtils.createPath(client, directoriesIdMap, filePath, branch);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verifyZeroInteractions(client);
    }

    @Test
    public void testCreatePath_PathNotExists_WithBranch() throws ResponseException{
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();
        AddDirectoryRequest request1 = new AddDirectoryRequest();
        request1.setName("folder");
        request1.setBranchId(branch.getId());
        AddDirectoryRequest request2 = new AddDirectoryRequest();
        request2.setName("folder2");
        request2.setDirectoryId(101L);
        when(client.addDirectory(argThat(new DirectoryPayloadMatcher(request1))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder", 101L, null, branch.getId()).build());
        when(client.addDirectory(argThat(new DirectoryPayloadMatcher(request2))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, branch.getId()).build());

        long resultDirectoryId = ProjectUtils.createPath(client, directoriesIdMap, filePath, branch);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(argThat(new DirectoryPayloadMatcher(request1)));
        verify(client).addDirectory(argThat(new DirectoryPayloadMatcher(request2)));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_HalfPathNotExists_WithBranch() throws ResponseException{
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("branch/folder/"), 101L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();
        AddDirectoryRequest request = new AddDirectoryRequest();
        request.setName("folder2");
        request.setDirectoryId(101L);
        when(client.addDirectory(argThat(new DirectoryPayloadMatcher(request))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, branch.getId()).build());

        long resultDirectoryId = ProjectUtils.createPath(client, directoriesIdMap, filePath, branch);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(client).addDirectory(argThat(new DirectoryPayloadMatcher(request)));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testCreatePath_PathNotExists_ResponseException() throws ResponseException{
        Client client = mock(Client.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = null;
        when(client.addDirectory(any())).thenThrow(new ResponseException("Error while creating directory"));

        assertThrows(RuntimeException.class, () -> ProjectUtils.createPath(client, directoriesIdMap, filePath, branch));

        verify(client).addDirectory(any());
        verifyNoMoreInteractions(client);
    }

    class BranchPayloadMatcher implements ArgumentMatcher<AddBranchRequest> {

        private AddBranchRequest left;

        public BranchPayloadMatcher(AddBranchRequest left) {
            this.left = left;
        }

        @Override
        public boolean matches(AddBranchRequest right) {
            if (left == right) {
                return true;
            } else if (left == null || right == null) {
                return false;
            }
            return StringUtils.equals(left.getName(), right.getName());
        }
    }

    class DirectoryPayloadMatcher implements ArgumentMatcher<AddDirectoryRequest> {

        private AddDirectoryRequest left;

        public DirectoryPayloadMatcher(AddDirectoryRequest left) {
            this.left = left;
        }

        @Override
        public boolean matches(AddDirectoryRequest right) {
            if (left == right) {
                return true;
            } else if (left == null || right == null) {
                return false;
            }
            return StringUtils.equals(left.getName(), right.getName())
                && Objects.equals(left.getDirectoryId(), right.getDirectoryId())
                && Objects.equals(left.getBranchId(), right.getBranchId());
        }
    }
}
