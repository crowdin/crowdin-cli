package com.crowdin.cli.commands.actions;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.translations.model.PreTranslationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import com.crowdin.client.languages.model.Language;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class PreTranslateActionTest {

    @Mock
    private Outputter out;

    @Mock
    private PropertiesWithFiles properties;

    @Mock
    private ProjectClient client;

    @Mock
    private CrowdinProjectFull project;

    @Mock
    private PreTranslationStatus preTranslationStatus;

    @Mock
    private PreTranslateAction action;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.initMocks(this);
        Language enLanguage = new Language();
        enLanguage.setId("en");
        when(project.getProjectLanguages(false)).thenReturn(Collections.singletonList(enLanguage));
        action = new PreTranslateAction(
                Collections.singletonList("en"), null, 1L, "master", null, false, false, false, false, false, false, false, null
        );
        when(client.downloadFullProject(anyString())).thenReturn(project);
        when(client.startPreTranslation(any())).thenReturn(preTranslationStatus);
        when(preTranslationStatus.getStatus()).thenReturn("finished");

        when(project.getProjectLanguages(false)).thenReturn(Collections.<Language>emptyList());
        when(project.getDirectories()).thenReturn(new HashMap<Long, Directory>());
        when(project.getBranches()).thenReturn(new HashMap<Long, Branch>());
    }
    @Test
    void testAct_FailureWhenPreTranslationFails() {
        when(preTranslationStatus.getStatus()).thenReturn("processing", "failed");
        when(client.checkPreTranslation(anyString())).thenReturn(preTranslationStatus);
        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
    }

    @Test
    void testAct_WrongLanguageIds() {
        when(project.getProjectLanguages(false)).thenReturn(Collections.<Language>emptyList());
        action = new PreTranslateAction(
                Collections.singletonList("wrong-lang"), null, 1L, "master", null, false, false, false, false, false, false, false, null
        );
        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
    }

    @Test
    void testAct_NoFilesForPreTranslate() {
        when(project.getProjectLanguages(false)).thenReturn(Collections.<Language>emptyList());
        when(project.getDirectories()).thenReturn(new HashMap<Long, Directory>());
        when(project.getBranches()).thenReturn(new HashMap<Long, Branch>());
        when(project.getFileInfos()).thenReturn(Collections.emptyList());
        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
    }
    @Test
    void testPrepareLabelIds() {
        action = new PreTranslateAction(
                Collections.singletonList("en"), null, 1L, "master", null, false, false, false, false, false, false, false, Collections.singletonList("label1")
        );
        when(client.listLabels()).thenReturn(Collections.emptyList());

        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
        verify(out, times(1)).println(anyString());
    }
    @Test
    void testPrepareFileIds() {
        when(project.getFileInfos()).thenReturn(Collections.emptyList());
        assertThrows(RuntimeException.class, () -> action.act(out, properties, client));
    }
//    @Test
//    void testPrepareFileIds_AllSourcesExistInProjectPaths() {
//        Language english = new Language();
//        english.setId("en");
//        when(project.getProjectLanguages(false)).thenReturn(Collections.singletonList(english));
//        when(project.getDirectories()).thenReturn(new HashMap<>());
//        when(project.getBranches()).thenReturn(new HashMap<>());
//        when(project.getFileInfos()).thenReturn(Collections.emptyList());
//
//        action.act(out, properties, client);
//
//        verify(out, times(0)).println(anyString());
//    }
//
//    @Test
//    void testPrepareFileIds_SomeSourcesDoNotExistInProjectPaths() {
//        Language english = new Language();
//        english.setId("en");
//        when(project.getProjectLanguages(false)).thenReturn(Collections.singletonList(english));
//        when(project.getDirectories()).thenReturn(new HashMap<>());
//        when(project.getBranches()).thenReturn(new HashMap<>());
//        when(project.getFileInfos()).thenReturn(Collections.emptyList());
//
//        action.act(out, properties, client);
//
//        verify(out, times(1)).println(anyString());
//    }
//
//    @Test
//    void testPrepareFileIds_NoSourcesExistInProjectPaths() {
//        Language english = new Language();
//        english.setId("en");
//        when(project.getProjectLanguages(false)).thenReturn(Collections.singletonList(english));
//        when(project.getDirectories()).thenReturn(new HashMap<>());
//        when(project.getBranches()).thenReturn(new HashMap<>());
//        when(project.getFileInfos()).thenReturn(Collections.emptyList());
//
//        action.act(out, properties, client);
//
//        verify(out, times(1)).println(anyString());
//    }
}
