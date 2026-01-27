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
import com.crowdin.client.labels.model.Label;
import com.crowdin.client.machinetranslationengines.model.MachineTranslation;
import com.crowdin.client.projectsgroups.model.Type;
import com.crowdin.client.translations.model.ApplyPreTranslationRequest;
import com.crowdin.client.translations.model.ApplyPreTranslationStringsBasedRequest;
import com.crowdin.client.translations.model.Method;
import com.crowdin.client.translations.model.PreTranslationStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.HashSet;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PreTranslateActionTest {

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
    public void testPreTranslate() {
        String fileName = "first.po";
        String labelName = "label_1";
        String branchName = "main";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile(fileName, "gettext", 101L, null, 81L)
            .addBranches(81L, branchName);
        CrowdinProjectFull crowdinProjectFull = projectBuilder.build();
        crowdinProjectFull.setType(Type.FILES_BASED);

        Label label1 = new Label() {{
            setId(91L);
            setTitle(labelName);
        }};
        List<Label> labels = List.of(label1);

        ApplyPreTranslationRequest request = new ApplyPreTranslationRequest() {{
            setLabelIds(List.of(91L));
            setFileIds(List.of(101L));
            setLanguageIds(List.of("ua"));
        }};
        PreTranslationStatus preTransInProgress = new PreTranslationStatus() {{
            setStatus("progress");
            setProgress(10);
            setIdentifier("121");
        }};
        PreTranslationStatus preTransFinished = new PreTranslationStatus() {{
            setStatus("finished");
            setIdentifier("121");
        }};

        ProjectClient client = mock(ProjectClient.class);

        when(client.downloadFullProject(eq(branchName))).thenReturn(crowdinProjectFull);
        when(client.startPreTranslation(eq(request))).thenReturn(preTransInProgress);
        when(client.checkPreTranslation("121")).thenReturn(preTransFinished);
        when(client.listLabels()).thenReturn(labels);

        PreTranslateAction action = new PreTranslateAction(List.of("ua"), null, List.of(fileName), null, null, branchName, null,
            null, null, null, null, false, false, List.of(labelName), null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(eq(branchName));
        verify(client).listLabels();
        verify(client).startPreTranslation(eq(request));
        verify(client).checkPreTranslation(eq("121"));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testPreTranslate_Directory() {
        String fileName = "first.po";
        String directoryName = "src";
        String branchName = "main";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addDirectory(directoryName, 61L, null, 81L)
            .addFile(fileName, "gettext", 101L, 61L, 81L)
            .addBranches(81L, branchName);
        CrowdinProjectFull crowdinProjectFull = projectBuilder.build();
        crowdinProjectFull.setType(Type.FILES_BASED);

        ApplyPreTranslationRequest request = new ApplyPreTranslationRequest() {{
            setFileIds(List.of(101L));
            setLanguageIds(List.of("ua"));
        }};
        PreTranslationStatus preTranslationStatus = new PreTranslationStatus() {{
            setStatus("finished");
            setProgress(10);
            setIdentifier("121");
        }};

        ProjectClient client = mock(ProjectClient.class);

        when(client.downloadFullProject(eq(branchName))).thenReturn(crowdinProjectFull);
        when(client.startPreTranslation(any())).thenReturn(preTranslationStatus);

        PreTranslateAction action = new PreTranslateAction(List.of("ua"), null, null, null, null, branchName, directoryName,
            null, null, null, null, true, true, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(eq(branchName));
        ArgumentCaptor<ApplyPreTranslationRequest> requestCaptor = ArgumentCaptor.forClass(ApplyPreTranslationRequest.class);
        verify(client).startPreTranslation(requestCaptor.capture());
        ApplyPreTranslationRequest actual = requestCaptor.getValue();
        assertEquals(request.getFileIds(), actual.getFileIds());
        assertEquals(new HashSet<>(request.getLanguageIds()), new HashSet<>(actual.getLanguageIds()));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testPreTranslate_StringsBased() {
        String branchName = "main";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addBranches(81L, branchName);
        CrowdinProjectFull crowdinProjectFull = projectBuilder.build();
        crowdinProjectFull.setType(Type.STRINGS_BASED);

        ApplyPreTranslationStringsBasedRequest request = new ApplyPreTranslationStringsBasedRequest() {{
            setLanguageIds(List.of("ua"));
            setBranchIds(List.of(81L));
        }};
        PreTranslationStatus preTranslationStatus = new PreTranslationStatus() {{
            setStatus("finished");
            setProgress(10);
            setIdentifier("121");
        }};

        ProjectClient client = mock(ProjectClient.class);

        when(client.downloadFullProject(eq(branchName))).thenReturn(crowdinProjectFull);
        when(client.startPreTranslationStringsBased(eq(request))).thenReturn(preTranslationStatus);

        PreTranslateAction action = new PreTranslateAction(List.of("ua"), null, null, null, null, branchName, null,
            null, null, null, null, false, false, null, null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(eq(branchName));
        verify(client).startPreTranslationStringsBased(eq(request));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testPreTranslate_MtMethodNoLanguages() throws ResponseException {
        String fileName = "first.po";
        String labelName = "label_1";
        String branchName = "main";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile(fileName, "gettext", 101L, null, 81L)
            .addBranches(81L, branchName);
        CrowdinProjectFull crowdinProjectFull = projectBuilder.build();
        crowdinProjectFull.setType(Type.FILES_BASED);

        Label label1 = new Label() {{
            setId(91L);
            setTitle(labelName);
        }};
        List<Label> labels = List.of(label1);

        ApplyPreTranslationRequest request = new ApplyPreTranslationRequest() {{
            setLabelIds(List.of(91L));
            setMethod(Method.MT);
            setEngineId(1L);
            setFileIds(List.of(101L));
            setLanguageIds(List.of("ua"));
        }};
        PreTranslationStatus preTransInProgress = new PreTranslationStatus() {{
            setStatus("progress");
            setProgress(10);
            setIdentifier("121");
        }};
        PreTranslationStatus preTransFinished = new PreTranslationStatus() {{
            setStatus("finished");
            setIdentifier("121");
        }};

        ProjectClient client = mock(ProjectClient.class);
        MachineTranslation mt = new MachineTranslation() {{
            setSupportedLanguageIds(List.of("ua", "fr"));
        }};

        when(client.downloadFullProject(eq(branchName))).thenReturn(crowdinProjectFull);
        when(client.getMt(1L)).thenReturn(mt);
        when(client.startPreTranslation(eq(request))).thenReturn(preTransInProgress);
        when(client.checkPreTranslation("121")).thenReturn(preTransFinished);
        when(client.listLabels()).thenReturn(labels);

        PreTranslateAction action = new PreTranslateAction(null, null, List.of(fileName), Method.MT, 1L, branchName, null,
            null, null, null, null, false, false, List.of(labelName), null, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(eq(branchName));
        verify(client).listLabels();
        verify(client).getMt(eq(1L));
        verify(client).startPreTranslation(eq(request));
        verify(client).checkPreTranslation(eq("121"));
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testPreTranslate_ExcludeLanguages() {
        String fileName = "first.po";
        String branchName = "main";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        ProjectBuilder projectBuilder = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
            .addFile(fileName, "gettext", 101L, null, 81L)
            .addBranches(81L, branchName);
        CrowdinProjectFull crowdinProjectFull = projectBuilder.build();
        crowdinProjectFull.setType(Type.FILES_BASED);

        ApplyPreTranslationRequest request = new ApplyPreTranslationRequest() {{
            setFileIds(List.of(101L));
            setLanguageIds(List.of("ua", "en"));
        }};
        PreTranslationStatus preTranslationStatus = new PreTranslationStatus() {{
            setStatus("finished");
            setProgress(10);
            setIdentifier("121");
        }};

        ProjectClient client = mock(ProjectClient.class);

        when(client.downloadFullProject(eq(branchName))).thenReturn(crowdinProjectFull);
        when(client.startPreTranslation(any())).thenReturn(preTranslationStatus);

        PreTranslateAction action = new PreTranslateAction(
            null,
            List.of("ru", "de"),
            List.of(fileName),
            null,
            null,
            branchName,
            null,
            null,
            null,
            null,
            null,
            true,
            true,
            null,
            null,
            false
        );
        action.act(Outputter.getDefault(), pb, client);

        verify(client).downloadFullProject(eq(branchName));
        ArgumentCaptor<ApplyPreTranslationRequest> requestCaptor = ArgumentCaptor.forClass(ApplyPreTranslationRequest.class);
        verify(client).startPreTranslation(requestCaptor.capture());
        ApplyPreTranslationRequest actual = requestCaptor.getValue();
        assertEquals(request.getFileIds(), actual.getFileIds());
        assertEquals(new HashSet<>(request.getLanguageIds()), new HashSet<>(actual.getLanguageIds()));
        verifyNoMoreInteractions(client);
    }
}
