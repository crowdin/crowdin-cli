package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.NewBasePropertiesUtilBuilder;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.NewPropertiesWithTargetsUtilBuilder;
import com.crowdin.cli.properties.PropertiesBuilders;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class PicocliTestUtils {

    protected Actions actionsMock;
    protected NewAction actionMock;
    protected PropertiesBuilders properitesBuildersMock;

    @BeforeEach
    public void beforeEach() {
        mockActions();
        mockBuilders();
    }

    public void execute(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, properitesBuildersMock, args);
        assertEquals(0, exitCode);
    }

    public void executeInvalidParams(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, properitesBuildersMock, args);
        assertNotEquals(0, exitCode);
        verifyNoMoreInteractions(actionsMock);
    }

    public void executeHelp(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, properitesBuildersMock, args);
        assertEquals(0, exitCode);
        verifyNoMoreInteractions(actionsMock);
    }

    public void check(boolean isClient) {
        verify(actionMock).act(any(), any(), any());
        verifyNoMoreInteractions(actionsMock);
        verifyNoMoreInteractions(actionMock);
//        verifyNoMoreInteractions(clientActionMock);
    }

    void mockActions() {
        actionsMock = mock(Actions.class);
        actionMock = mock(NewAction.class);

        when(actionsMock.download(any(), anyBoolean(), any(), anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.generate(any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listBranches(anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listProject(anyBoolean(), any(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listSources(anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.status(anyBoolean(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.stringAdd(anyBoolean(), any(), any(), any(), any(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.stringDelete(anyBoolean(), any(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.stringEdit(anyBoolean(), any(), any(), any(), any(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.stringList(anyBoolean(), anyBoolean(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.uploadSources(any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.uploadTranslations(anyBoolean(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.glossaryList(anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.glossaryUpload(any(), any(), any(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.glossaryDownload(any(), any(), any(), anyBoolean(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.tmDownload(any(), any(), any(), any(), any(), anyBoolean(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.tmList(anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.tmUpload(any(), any(), any(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.checkNewVersion())
            .thenReturn(actionMock);
    }

    private void mockBuilders() {
        properitesBuildersMock = mock(PropertiesBuilders.class);
        when(properitesBuildersMock.buildBaseProperties(any(), any(), any(), any()))
            .thenReturn(NewBasePropertiesUtilBuilder.minimalBuilt().build());
        when(properitesBuildersMock.buildNoProperties())
            .thenReturn(new NoProperties());
        when(properitesBuildersMock.buildPropertiesWithFiles(any(), any(), any(), any()))
            .thenReturn(NewPropertiesWithFilesUtilBuilder.minimalBuiltPropertiesBean().build());
        when(properitesBuildersMock.buildPropertiesWithTargets(any(), any(), any(), any()))
            .thenReturn(NewPropertiesWithTargetsUtilBuilder.minimalBuilt().build());
    }
}
