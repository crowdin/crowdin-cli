package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.models.BranchBuilder;
import com.crowdin.cli.client.models.DirectoryBuilder;
import com.crowdin.cli.client.request.DirectoryPayloadWrapper;
import com.crowdin.cli.utils.Utils;
import com.crowdin.common.models.Branch;
import com.crowdin.common.request.BranchPayload;
import com.crowdin.common.request.DirectoryPayload;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatcher;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ProjectUtilsTest {

    private static final int PROJECT_ID = 42;

    @Test
    public void testGetOrCreateBranch_branchExists() {
        BranchClient branchClient = mock(BranchClient.class);
        ProjectProxy projectProxy = mock(ProjectProxy.class);
        Branch expected = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch42", 101L).build();
        when(projectProxy.getBranchByName(expected.getName())).thenReturn(Optional.of(expected));

        Branch result = ProjectUtils.getOrCreateBranch(branchClient, projectProxy, expected.getName());

        assertEquals(expected.getId(), result.getId(), "Identifiers are not equal");
        assertEquals(expected.getName(), result.getName(), "Names are not equal");
        assertEquals(expected.getProjectId(), result.getProjectId(), "Project ids are not equal");
        verifyZeroInteractions(branchClient);
    }

    @Test
    public void testGetOrCreateBranch_branchNotExists() throws ResponseException {
        BranchClient branchClient = mock(BranchClient.class);
        ProjectProxy projectProxy = mock(ProjectProxy.class);
        Branch expected = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch42", 101L).build();
        when(projectProxy.getBranchByName(expected.getName())).thenReturn(Optional.empty());
        when(branchClient.createBranch(argThat(new BranchPayloadMatcher(new BranchPayload(expected.getName()))))).thenReturn(expected);

        Branch result = ProjectUtils.getOrCreateBranch(branchClient, projectProxy, expected.getName());

        assertNotNull(result);
        assertEquals(expected.getId(), result.getId(), "Identifiers are not equal");
        assertEquals(expected.getName(), result.getName(), "Names are not equal");
        assertEquals(expected.getProjectId(), result.getProjectId(), "Project ids are not equal");
        verify(projectProxy).getBranchByName(expected.getName());
        verify(projectProxy).addBranchToList(any());
        verifyNoMoreInteractions(projectProxy);
        verify(branchClient).createBranch(argThat(new BranchPayloadMatcher(new BranchPayload(expected.getName()))));
        verifyNoMoreInteractions(branchClient);
    }

    @Test
    public void testGetOrCreateBranch_branchNotExists_ResponseException() throws ResponseException {
        BranchClient branchClient = mock(BranchClient.class);
        ProjectProxy projectProxy = mock(ProjectProxy.class);
        String branchName = "branch1";
        when(projectProxy.getBranchByName(branchName)).thenReturn(Optional.empty());
        when(branchClient.createBranch(any())).thenThrow(new ResponseException("Error while creating branch"));

        assertThrows(RuntimeException.class, () -> ProjectUtils.getOrCreateBranch(branchClient, projectProxy, "branch1"));

        verify(projectProxy).getBranchByName(branchName);
        verifyNoMoreInteractions(projectProxy);
        verify(branchClient).createBranch(any());
        verifyNoMoreInteractions(branchClient);
    }

    @Test
    public void testCreatePath_PathExists() {
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("folder/"), 101L);
            put(Utils.normalizePath("folder/folder2/"), 102L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Optional<Branch> branchOpt = Optional.empty();

        long resultDirectoryId = ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, branchOpt);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verifyZeroInteractions(directoriesClient);
    }

    @Test
    public void testCreatePath_PathNotExists() throws ResponseException{
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Optional<Branch> branchOpt = Optional.empty();
        DirectoryPayload dirPayload1 = new DirectoryPayloadWrapper("folder", null, null);
        DirectoryPayload dirPayload2 = new DirectoryPayloadWrapper("folder2", 101L, null);
        when(directoriesClient.createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload1))))
            .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder", 101L, null, null).build());
        when(directoriesClient.createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload2))))
            .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, null).build());

        long resultDirectoryId = ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, branchOpt);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(directoriesClient).createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload1)));
        verify(directoriesClient).createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload2)));
        verifyNoMoreInteractions(directoriesClient);
    }

    @Test
    public void testCreatePath_HalfPathNotExists() throws ResponseException{
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("folder/"), 101L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Optional<Branch> branchOpt = Optional.empty();
        DirectoryPayload dirPayload = new DirectoryPayloadWrapper("folder2", 101L, null);
        when(directoriesClient.createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, null).build());

        long resultDirectoryId = ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, branchOpt);

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(directoriesClient).createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload)));
        verifyNoMoreInteractions(directoriesClient);
    }

    @Test
    public void testCreatePath_PathExists_WithBranch() {
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("branch/folder/"), 101L);
            put(Utils.normalizePath("branch/folder/folder2/"), 102L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();

        long resultDirectoryId = ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, Optional.of(branch));

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verifyZeroInteractions(directoriesClient);
    }

    @Test
    public void testCreatePath_PathNotExists_WithBranch() throws ResponseException{
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();
        DirectoryPayload dirPayload1 = new DirectoryPayloadWrapper("folder", null, branch.getId());
        DirectoryPayload dirPayload2 = new DirectoryPayloadWrapper("folder2", 101L, null);
        when(directoriesClient.createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload1))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder", 101L, null, branch.getId()).build());
        when(directoriesClient.createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload2))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, branch.getId()).build());

        long resultDirectoryId = ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, Optional.of(branch));

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(directoriesClient).createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload1)));
        verify(directoriesClient).createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload2)));
        verifyNoMoreInteractions(directoriesClient);
    }

    @Test
    public void testCreatePath_HalfPathNotExists_WithBranch() throws ResponseException{
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>() {{
            put(Utils.normalizePath("branch/folder/"), 101L);
        }};
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Branch branch = BranchBuilder.standard().setProjectId(PROJECT_ID).setIdentifiers("branch", 301L).build();
        DirectoryPayload dirPayload = new DirectoryPayloadWrapper("folder2", 101L, null);
        when(directoriesClient.createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload))))
                .thenReturn(DirectoryBuilder.standard().setProjectId((long) PROJECT_ID).setIdentifiers("folder2", 102L, 101L, branch.getId()).build());

        long resultDirectoryId = ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, Optional.of(branch));

        assertEquals(102L, resultDirectoryId, "Directory id is not correct");
        verify(directoriesClient).createDirectory(argThat(new DirectoryPayloadMatcher(dirPayload)));
        verifyNoMoreInteractions(directoriesClient);
    }

    @Test
    public void testCreatePath_PathNotExists_ResponseException() throws ResponseException{
        DirectoriesClient directoriesClient = mock(DirectoriesClient.class);
        Map<String, Long> directoriesIdMap = new HashMap<String, Long>();
        String filePath = Utils.normalizePath("folder/folder2/file.txt");
        Optional<Branch> branchOpt = Optional.empty();
        when(directoriesClient.createDirectory(any())).thenThrow(new ResponseException("Error while creating directory"));

        assertThrows(RuntimeException.class, () -> ProjectUtils.createPath(directoriesClient, directoriesIdMap, filePath, branchOpt));

        verify(directoriesClient).createDirectory(any());
        verifyNoMoreInteractions(directoriesClient);
    }

    class BranchPayloadMatcher implements ArgumentMatcher<BranchPayload> {

        private BranchPayload left;

        public BranchPayloadMatcher(BranchPayload left) {
            this.left = left;
        }

        @Override
        public boolean matches(BranchPayload right) {
            if (left == right) {
                return true;
            } else if (left == null || right == null) {
                return false;
            }
            return StringUtils.equals(left.getName(), right.getName());
        }
    }

    class DirectoryPayloadMatcher implements ArgumentMatcher<DirectoryPayload> {

        private DirectoryPayload left;

        public DirectoryPayloadMatcher(DirectoryPayload left) {
            this.left = left;
        }

        @Override
        public boolean matches(DirectoryPayload right) {
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
