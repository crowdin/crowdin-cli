package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.*;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.branches.model.BranchCloneStatus;
import com.crowdin.client.branches.model.CloneBranchRequest;
import com.crowdin.client.branches.model.ClonedBranch;
import com.crowdin.client.projectsgroups.model.Type;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BranchCloneActionTest {

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
    public void testBranchClone() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addBranches(14L, "main").build();
        build.setType(Type.STRINGS_BASED);

        CloneBranchRequest cloned = new CloneBranchRequest() {{
            setName("cloned");
        }};
        BranchCloneStatus initStatus = new BranchCloneStatus(){{
            setIdentifier("50fb3506-4127-4ba8-8296-f97dc7e3e0c3");
            setStatus("created");
            setProgress(0);
        }};
        BranchCloneStatus status = new BranchCloneStatus(){{
            setIdentifier("50fb3506-4127-4ba8-8296-f97dc7e3e0c3");
            setStatus("finished");
            setProgress(100);
        }};
        ClonedBranch clonedBranch = new ClonedBranch(){{
            setId(20L);
        }};

        when(client.downloadFullProject()).thenReturn(build);
        when(client.cloneBranch(eq(14L), eq(cloned))).thenReturn(initStatus);
        when(client.checkCloneBranchStatus(eq(14L),  eq("50fb3506-4127-4ba8-8296-f97dc7e3e0c3")))
            .thenReturn(status);
        when(client.getClonedBranch(eq(14L),  eq("50fb3506-4127-4ba8-8296-f97dc7e3e0c3")))
            .thenReturn(clonedBranch);

        CloneBranchRequest request = new CloneBranchRequest();
        request.setName("cloned");
        BranchCloneAction action = new BranchCloneAction("main", "cloned", false);
        action.act(Outputter.getDefault(), pb, client);
        verify(client).downloadFullProject();
        verify(client).cloneBranch(eq(14L), eq(request));
        verify(client).checkCloneBranchStatus(eq(14L), eq("50fb3506-4127-4ba8-8296-f97dc7e3e0c3"));
        verify(client).getClonedBranch(eq(14L), eq("50fb3506-4127-4ba8-8296-f97dc7e3e0c3"));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testBranchClone_BranchExistsThrows() throws ResponseException {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addBranches(14L, "main").build();
        build.setType(Type.STRINGS_BASED);

        when(client.downloadFullProject()).thenReturn(build);

        when(client.cloneBranch(eq(14L), eq(new CloneBranchRequest() {{
            setName("cloned");
        }}))).thenThrow(new ExistsResponseException());

        CloneBranchRequest request = new CloneBranchRequest();
        request.setName("cloned");
        BranchCloneAction action = new BranchCloneAction("main", "cloned", false);

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).cloneBranch(eq(14L), eq(request));
        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testBranchClone_FileBasedThrows() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectClient client = mock(ProjectClient.class);
        CrowdinProjectFull build = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addBranches(14L, "main").build();
        build.setType(Type.FILES_BASED);
        BranchCloneAction action = new BranchCloneAction("main", "cloned", false);

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).downloadFullProject();
        verifyNoMoreInteractions(client);
    }
}