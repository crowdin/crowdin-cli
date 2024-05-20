package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.client.ResponseException;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.branches.model.BranchMergeStatus;
import com.crowdin.client.branches.model.BranchMergeSummary;
import com.crowdin.client.branches.model.MergeBranchRequest;
import com.crowdin.client.projectsgroups.model.Type;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class BranchMergeActionTest {

    private TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testBranchMerge() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        long mainBranch = 14L;
        long devBranch = 15L;
        String mergeId = "50fb3506-4127-4ba8-8296-f97dc7e3e0c3";
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addBranches(mainBranch, "main", "dev")
                .build();
        build.setType(Type.STRINGS_BASED);

        MergeBranchRequest merged = new MergeBranchRequest() {{
            setSourceBranchId(devBranch);
            setDryRun(true);
            setDeleteAfterMerge(false);
        }};
        BranchMergeStatus initStatus = new BranchMergeStatus() {{
            setIdentifier(mergeId);
            setStatus("created");
            setProgress(0);
        }};
        BranchMergeStatus status = new BranchMergeStatus() {{
            setIdentifier(mergeId);
            setStatus("finished");
            setProgress(100);
        }};
        BranchMergeSummary summary = new BranchMergeSummary() {{
            setSourceBranchId(devBranch);
            setDetails(Map.of("added", 1L, "deleted", 0L, "updated", 0L, "conflicted", 0L));
        }};

        when(client.downloadFullProject()).thenReturn(build);
        when(client.mergeBranch(eq(mainBranch), eq(merged))).thenReturn(initStatus);
        when(client.checkMergeBranchStatus(eq(mainBranch), eq(mergeId)))
                .thenReturn(status);
        when(client.getBranchMergeSummary(eq(mainBranch), eq(mergeId)))
                .thenReturn(summary);

        BranchMergeAction action = new BranchMergeAction("dev", "main", false, false, true, false);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).downloadFullProject();
        verify(client).mergeBranch(eq(mainBranch), eq(merged));
        verify(client).checkMergeBranchStatus(eq(mainBranch), eq(mergeId));
        verify(client).getBranchMergeSummary(eq(mainBranch), eq(mergeId));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testBranchMerge_FileBasedThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addBranches(14L, "main").build();
        build.setType(Type.FILES_BASED);
        BranchMergeAction action = new BranchMergeAction("main", "cloned", false, false, true, false);

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}