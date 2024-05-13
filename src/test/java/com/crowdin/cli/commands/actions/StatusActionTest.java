package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.FileInfo;
import com.crowdin.client.translationstatus.model.LanguageProgress;
import com.crowdin.client.translationstatus.model.Progress;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

class StatusActionTest {

    private StatusAction statusAction;

    @Test
    public void testStatus(){
        boolean noProgress = true;
        String branchName = "TestBranch";
        String languageId = "ua";
        boolean isVerbose = true;
        boolean showTranslated = true;
        boolean showApproved = true;
        boolean failIfIncomplete = true;
        ProjectClient projectClient = mock(ProjectClient.class);
        ProjectProperties projectProperties = mock(ProjectProperties.class);
        LanguageProgress languageProgress = mock(LanguageProgress.class);
        Branch branch = mock(Branch.class);
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));

        when(projectClient.downloadFullProject("TestBranch"))
                .thenReturn(projectBuilder.build());
        statusAction = new StatusAction(noProgress, branchName, languageId, null, null, isVerbose, showTranslated, showApproved, failIfIncomplete, false);
        when(languageProgress.getApprovalProgress()).thenReturn(99);
        when(languageProgress.getLanguageId()).thenReturn("ua");
        when(branch.getId()).thenReturn(123L);
        when(branch.getName()).thenReturn("TestBranch");
        when(projectClient.getBranchProgress(123L))
                .thenReturn(Collections.singletonList(languageProgress));
        when(projectClient.listBranches()).
                thenReturn(Collections.singletonList(branch));
        when(languageProgress.getWords()).thenReturn(getWords());
        when(languageProgress.getPhrases()).thenReturn(getWords());

        statusAction.act(Outputter.getDefault(), projectProperties, projectClient);

        verify(projectClient).downloadFullProject("TestBranch");
        verify(projectClient).listBranches();
        verify(projectClient).getBranchProgress(123L);
        verifyNoMoreInteractions(projectClient);
    }

    private Progress.Words getWords(){
        Progress.Words words = new Progress.Words();
        words.setApproved(1);
        words.setTotal(2);
        words.setTranslated(1);
        return words;
    }

    @ParameterizedTest
    @MethodSource
    public void testStatusIfIncomplete(boolean noProgress, String branchName, String languageId, boolean isVerbose, boolean showTranslated, boolean showApproved, boolean failIfIncomplete) {
        ProjectClient projectClient = mock(ProjectClient.class);
        ProjectProperties projectProperties = mock(ProjectProperties.class);
        LanguageProgress languageProgress = mock(LanguageProgress.class);
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));

        when(projectClient.downloadFullProject(branchName))
                .thenReturn(projectBuilder.build());
        statusAction = new StatusAction(noProgress, branchName, languageId, null, null, isVerbose, showTranslated, showApproved, failIfIncomplete, false);
        when(languageProgress.getApprovalProgress()).thenReturn(99);
        when(projectClient.getProjectProgress(null))
                .thenReturn(Collections.singletonList(languageProgress));
        assertThrows(
                RuntimeException.class,
                () -> statusAction.act(Outputter.getDefault(), projectProperties, projectClient));
        verify(projectClient).downloadFullProject(branchName);
        verify(projectClient).listBranches();
        verify(projectClient).getProjectProgress(null);
        verifyNoMoreInteractions(projectClient);
    }

    public static Stream<Arguments> testStatusIfIncomplete() {
        return Stream.of(
                arguments(true, null, null, false, true, false, true),
                arguments(true, null, null, false, false, true, true),
                arguments(true, null, null, false, true, true, true),
                arguments(true, null, null, true, true, true, true)
        );
    }

    @Test
    void statusActionWhenBranchIsNotFoundThenThrowException() {
        boolean noProgress = true;
        String branchName = "TestBranch";
        boolean isVerbose = false;
        boolean showTranslated = false;
        boolean showApproved = false;
        boolean failIfIncomplete = true;
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(branchName))
                .thenReturn(projectBuilder.build());
        statusAction = new StatusAction(noProgress, branchName, null, null, null, isVerbose, showTranslated, showApproved, failIfIncomplete, false);
        when(client.listBranches()).thenReturn(Collections.emptyList());

        assertThrows(
                RuntimeException.class, () -> statusAction.act(Outputter.getDefault(), null, client));
        verify(client).downloadFullProject(branchName);
        verify(client).listBranches();
        verifyNoMoreInteractions(client);
    }

    @Test
    void statusActionWhenLanguageIdIsNotFoundThenThrowException() {
        boolean noProgress = true;
        String languageId = "EN";
        boolean isVerbose = false;
        boolean showTranslated = false;
        boolean showApproved = false;
        boolean failIfIncomplete = true;
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()));

        ProjectClient client = mock(ProjectClient.class);
        when(client.downloadFullProject(null))
                .thenReturn(projectBuilder.build());
        statusAction = new StatusAction(noProgress, null, languageId, null, null, isVerbose, showTranslated, showApproved, failIfIncomplete, false);
        when(client.listBranches()).thenReturn(Collections.emptyList());

        assertThrows(
                RuntimeException.class, () -> statusAction.act(Outputter.getDefault(), null, client));
        verify(client).downloadFullProject(null);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testStatusWithFile(){
        String file = "file.json";
        ProjectClient projectClient = mock(ProjectClient.class);
        ProjectProperties projectProperties = mock(ProjectProperties.class);
        LanguageProgress languageProgress = mock(LanguageProgress.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        Branch branch = mock(Branch.class);
        FileInfo fileInfo = mock(FileInfo.class);

        when(projectClient.downloadFullProject(null)).thenReturn(projectFull);
        when(fileInfo.getId()).thenReturn(12L);
        when(fileInfo.getPath()).thenReturn("/file.json");
        when(languageProgress.getApprovalProgress()).thenReturn(99);
        when(languageProgress.getLanguageId()).thenReturn("ua");
        when(projectFull.getFileInfos()).thenReturn(Arrays.asList(fileInfo));
        when(projectClient.getFileProgress(123L))
                .thenReturn(Collections.singletonList(languageProgress));
        when(projectClient.listBranches()).
                thenReturn(Collections.singletonList(branch));
        when(languageProgress.getWords()).thenReturn(getWords());
        when(languageProgress.getPhrases()).thenReturn(getWords());

        statusAction = new StatusAction(true, null, null, file, null, true, true, true, true, true);
        statusAction.act(Outputter.getDefault(), projectProperties, projectClient);

        verify(projectClient).downloadFullProject(null);
        verify(projectClient).listBranches();
        verify(projectClient).getFileProgress(12L);
        verifyNoMoreInteractions(projectClient);
    }

    @Test
    public void testStatusWithDirectory(){
        String directoryPath = "directory";
        ProjectClient projectClient = mock(ProjectClient.class);
        ProjectProperties projectProperties = mock(ProjectProperties.class);
        LanguageProgress languageProgress = mock(LanguageProgress.class);
        CrowdinProjectFull projectFull = mock(CrowdinProjectFull.class);
        Branch branch = mock(Branch.class);
        Directory directory = mock(Directory.class);

        when(projectClient.downloadFullProject(null)).thenReturn(projectFull);
        when(directory.getId()).thenReturn(12L);
        when(directory.getPath()).thenReturn("/directory");
        when(languageProgress.getApprovalProgress()).thenReturn(99);
        when(languageProgress.getLanguageId()).thenReturn("ua");
        when(projectFull.getDirectories()).thenReturn(Collections.singletonMap(12L, directory));
        when(projectClient.getFileProgress(123L))
                .thenReturn(Collections.singletonList(languageProgress));
        when(projectClient.listBranches()).
                thenReturn(Collections.singletonList(branch));
        when(languageProgress.getWords()).thenReturn(getWords());
        when(languageProgress.getPhrases()).thenReturn(getWords());

        statusAction = new StatusAction(true, null, null, null, directoryPath, true, true, true, true, true);
        statusAction.act(Outputter.getDefault(), projectProperties, projectClient);

        verify(projectClient).downloadFullProject(null);
        verify(projectClient).listBranches();
        verify(projectClient).getDirectoryProgress(12L);
        verifyNoMoreInteractions(projectClient);
    }
}
