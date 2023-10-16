package com.crowdin.cli.commands.actions;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.translations.model.PreTranslationStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.HashMap;

import static org.mockito.Mockito.*;

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

        Assertions.assertThrows(RuntimeException.class, () -> {
            action.act(out, properties, client);
        });
    }

    @Test
    void testAct_WrongLanguageIds() {
        when(project.getProjectLanguages(false)).thenReturn(Collections.<Language>emptyList());
        action = new PreTranslateAction(
                Collections.singletonList("wrong-lang"), null, 1L, "master", null, false, false, false, false, false, false, false, null
        );

        Assertions.assertThrows(RuntimeException.class, () -> {
            action.act(out, properties, client);
        });
    }

    @Test
    void testAct_NoFilesForPreTranslate() {
        when(project.getProjectLanguages(false)).thenReturn(Collections.<Language>emptyList());
        when(project.getDirectories()).thenReturn(new HashMap<Long, Directory>());
        when(project.getBranches()).thenReturn(new HashMap<Long, Branch>());
        when(project.getFileInfos()).thenReturn(Collections.emptyList());

        Assertions.assertThrows(RuntimeException.class, () -> {
            action.act(out, properties, client);
        });
    }

    @Test
    void testPrepareLabelIds_MissingLabel() {
        action = new PreTranslateAction(
                Collections.singletonList("en"), null, 1L, "master", null, false, false, false, false, false, false, false, Collections.singletonList("label1")
        );
        when(client.listLabels()).thenReturn(Collections.emptyList());

        Assertions.assertThrows(RuntimeException.class, () -> {
            action.act(out, properties, client);
        });
    }

    @Test
    void testAct_AllLanguages() {
        Language enLanguage = new Language();
        enLanguage.setId("en");
        when(project.getProjectLanguages(false)).thenReturn(Collections.singletonList(enLanguage));
        action = new PreTranslateAction(
                Collections.singletonList("all"), null, 1L, "master", null, false, false, false, false, false, false, false, null
        );

        Assertions.assertThrows(NullPointerException.class, () -> {
            action.act(out, properties, client);
        });
    }

    @Test
    void testAct_MissingLabels() {
        action = new PreTranslateAction(
                Collections.singletonList("en"), null, 1L, "master", null, false, false, false, false, false, false, false, Collections.singletonList("missingLabel")
        );
        when(client.listLabels()).thenReturn(Collections.emptyList());

        Assertions.assertThrows(RuntimeException.class, () -> {
            action.act(out, properties, client);
        });
    }

    @Test
    void testAct_ApplyPreTranslation() {
        when(preTranslationStatus.getStatus()).thenReturn("processing", "finished");
        when(client.checkPreTranslation(anyString())).thenReturn(preTranslationStatus);

        Assertions.assertThrows(RuntimeException.class, () -> {
            action.act(out, properties, client);
        });
    }
}