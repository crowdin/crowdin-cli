package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.NewBasePropertiesUtilBuilder;
import com.crowdin.cli.properties.NewProjectPropertiesUtilBuilder;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesBuilders;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class PicocliTestUtils {

    protected Actions actionsMock;
    protected NewAction actionMock;
    protected PropertiesBuilders propertiesBuildersMock;

    @BeforeEach
    public void beforeEach() {
        mockActions();
        mockBuilders();
    }

    public void execute(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, propertiesBuildersMock, args);
        assertEquals(0, exitCode);
    }

    public void executeInvalidParams(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, propertiesBuildersMock, args);
        assertNotEquals(0, exitCode);
        verifyNoMoreInteractions(actionsMock);
    }

    public void executeHelp(String... args) {
        int exitCode = PicocliRunner.getInstance().execute(actionsMock, propertiesBuildersMock, args);
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

        when(actionsMock.download(any(), anyBoolean(), any(), any(), anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.init(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listBranches(anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listFiles(anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listSources(anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.status(anyBoolean(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.stringAdd(anyBoolean(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.stringComment(anyBoolean(), any(), any(), any(), any(), any()))
                .thenReturn(actionMock);
        when(actionsMock.stringDelete(any()))
            .thenReturn(actionMock);
        when(actionsMock.stringEdit(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any(), any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.stringList(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any(), any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.uploadSources(any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.uploadTranslations(anyBoolean(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.glossaryList(anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.glossaryUpload(any(), any(), any(), any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.glossaryDownload(any(), any(), anyBoolean(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.tmDownload(any(), any(), any(), any(), anyBoolean(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.tmList(anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.taskList(anyBoolean(), anyBoolean(), any(), any()))
            .thenReturn(actionMock);
        when(actionsMock.taskAdd(anyBoolean(), any(), any(), any(), any(), any(), anyLong(), any(), anyBoolean(), anyBoolean(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.distributionList(anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.distributionAdd(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any()))
                .thenReturn(actionMock);
        when(actionsMock.distributionEdit(any(), anyBoolean(), anyBoolean(), any(), any(), any(), any(), any()))
                .thenReturn(actionMock);
        when(actionsMock.bundleList(anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.bundleAdd(any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.bundleDelete(any()))
                .thenReturn(actionMock);
        when(actionsMock.bundleClone(any(), any(), any(), any(), any(), any(), any(), anyBoolean(), any(), any(), any()))
                .thenReturn(actionMock);
        when(actionsMock.bundleBrowse(any()))
                .thenReturn(actionMock);
        when(actionsMock.preTranslate(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), any(), any(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.screenshotList(any(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.screenshotUpload(any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.screenshotDelete(any()))
                .thenReturn(actionMock);
        when(actionsMock.labelList(anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.labelAdd(any(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.labelDelete(any()))
                .thenReturn(actionMock);
        when(actionsMock.fileUpload(any(), any(), anyBoolean(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.fileUploadTranslation(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.fileDownload(any(), any(), anyBoolean(), any()))
                .thenReturn(actionMock);
        when(actionsMock.fileDownloadTranslation(any(), any(), any(), anyBoolean(), any()))
                .thenReturn(actionMock);
        when(actionsMock.fileDelete(any(), any()))
                .thenReturn(actionMock);
        when(actionsMock.resolve(any()))
                .thenReturn(actionMock);
        when(actionsMock.commentList(anyBoolean(), anyBoolean(),any(),any(),any(),any()))
                .thenReturn(actionMock);
        when(actionsMock.tmUpload(any(), any(), any(), any(), any(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.checkNewVersion())
            .thenReturn(actionMock);
        when(actionsMock.projectBrowse()).thenReturn(actionMock);
        when(actionsMock.projectList(anyBoolean())).thenReturn(actionMock);
        when(actionsMock.projectAdd(any(), anyBoolean(), any(), any(), anyBoolean(), anyBoolean())).thenReturn(actionMock);
        when(actionsMock.branchClone(any(), any(), anyBoolean(), anyBoolean()))
            .thenReturn(actionMock);
        when(actionsMock.branchMerge(any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.branchEdit(any(), any(), any(), any(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.listApps(anyBoolean())).thenReturn(actionMock);
        when(actionsMock.uninstallApp(anyString(), anyBoolean())).thenReturn(actionMock);
        when(actionsMock.installApp(anyString())).thenReturn(actionMock);
        when(actionsMock.contextDownload(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
        when(actionsMock.contextReset(any(), any(), any(), any(), any(), anyBoolean(), anyInt(), anyBoolean(), anyBoolean()))
                .thenReturn(actionMock);
    }

    private void mockBuilders() {
        propertiesBuildersMock = mock(PropertiesBuilders.class);
        when(propertiesBuildersMock.buildBaseProperties(any(), any(), any(), any()))
            .thenReturn(NewBasePropertiesUtilBuilder.minimalBuilt().build());
        when(propertiesBuildersMock.buildNoProperties())
            .thenReturn(new NoProperties());
        when(propertiesBuildersMock.buildPropertiesWithFiles(any(), any(), any(), any()))
            .thenReturn(NewPropertiesWithFilesUtilBuilder.minimalBuiltPropertiesBean().build());
        when(propertiesBuildersMock.buildProjectProperties(any(), any(), any(), any()))
            .thenReturn(NewProjectPropertiesUtilBuilder.minimalBuilt().build());
    }
}
