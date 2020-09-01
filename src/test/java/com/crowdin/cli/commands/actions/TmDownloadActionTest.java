package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportRequest;
import com.crowdin.client.translationmemory.model.TranslationMemoryExportStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class TmDownloadActionTest {

    private final Long tmIdValid = 42L;
    private final Long tmIdRepeats = 43L;
    private final Long tmIdNotExist = 45L;
    private final String tmNameValid = "42";
    private final String tmNameRepeats = "43";
    private final String tmNameNotExist = "45";
    private final String exportIdentifier = "exportIdentifier";
    private final File to = new File("somewhere.tmx");

    private final Outputter out = Outputter.getDefault();
    private final PropertiesBean pb = PropertiesBeanBuilder
        .minimalBuiltPropertiesBean()
        .build();
    private final Client clientMock = mock(Client.class);
    private final FilesInterface filesMock = mock(FilesInterface.class);

    @BeforeEach
    public void beforeEach() {
        TranslationMemory tmValid = new TranslationMemory() {{
                setId(tmIdValid);
                setName(tmNameValid);
            }};
        TranslationMemory tmRepeats = new TranslationMemory() {{
                setId(tmIdRepeats);
                setName(tmNameRepeats);
            }};
//        client.getTm
        when(clientMock.getTm(eq(tmIdValid)))
            .thenReturn(Optional.of(tmValid));
        when(clientMock.getTm(eq(tmIdRepeats)))
            .thenReturn(Optional.of(tmRepeats));
        when(clientMock.getTm(eq(tmIdNotExist)))
            .thenReturn(Optional.empty());
//        client.listTms
        when(clientMock.listTms())
            .thenReturn(Arrays.asList(tmValid, tmRepeats, tmRepeats));
//        client building tm
        TranslationMemoryExportStatus statusBuilding = new TranslationMemoryExportStatus() {{
                setIdentifier(exportIdentifier);
                setProgress(50);
                setStatus("is building");
            }};
        TranslationMemoryExportStatus statusFinished = new TranslationMemoryExportStatus() {{
                setIdentifier(exportIdentifier);
                setStatus("finished");
            }};
        when(clientMock.startExportingTm(eq(tmIdValid), any()))
            .thenReturn(statusFinished);
        when(clientMock.startExportingTm(eq(tmIdRepeats), any()))
            .thenReturn(statusBuilding);
        when(clientMock.checkExportingTm(eq(tmIdRepeats), eq(exportIdentifier)))
            .thenReturn(statusFinished);
//        client downloading
        when(clientMock.downloadTm(anyLong(), eq(exportIdentifier)))
            .thenReturn(MockitoUtils.getMockUrl(TmDownloadActionTest.class));
    }

    @Test
    public void test_findById() throws IOException {
        ClientAction clientAction = new TmDownloadAction(tmIdValid, null, null, null, null, false, this.to, filesMock);
        clientAction.act(out, pb, clientMock);

        verify(clientMock).getTm(eq(tmIdValid));
        verify(clientMock).startExportingTm(eq(tmIdValid), any());
        verify(clientMock).downloadTm(eq(tmIdValid), eq(exportIdentifier));
        verifyNoMoreInteractions(clientMock);
        verify(filesMock).writeToFile(anyString(), any());
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_findById_throwsNotFound() {
        ClientAction clientAction = new TmDownloadAction(tmIdNotExist, null, null, null, null, false, this.to, filesMock);
        assertThrows(RuntimeException.class, () -> clientAction.act(out, pb, clientMock));

        verify(clientMock).getTm(eq(tmIdNotExist));
        verifyNoMoreInteractions(clientMock);
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_findByName() throws IOException {
        ClientAction clientAction = new TmDownloadAction(null, tmNameValid, null, null, null, false, this.to, filesMock);
        clientAction.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verify(clientMock).startExportingTm(eq(tmIdValid), any());
        verify(clientMock).downloadTm(eq(tmIdValid), eq(exportIdentifier));
        verifyNoMoreInteractions(clientMock);
        verify(filesMock).writeToFile(anyString(), any());
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_findByName_throwsNoTms() {
        ClientAction clientAction = new TmDownloadAction(null, tmNameNotExist, null, null, null, false, this.to, filesMock);
        assertThrows(RuntimeException.class, () -> clientAction.act(out, pb, clientMock));

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_findByName_throwsTooManyTms() {
        ClientAction clientAction = new TmDownloadAction(null, tmNameRepeats, null, null, null, false, this.to, filesMock);
        assertThrows(RuntimeException.class, () -> clientAction.act(out, pb, clientMock));

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_throwsNoIdentifiers() {
        ClientAction clientAction = new TmDownloadAction(null, null, null, null, null, false, this.to, filesMock);
        assertThrows(RuntimeException.class, () -> clientAction.act(out, pb, clientMock));

        verifyNoMoreInteractions(clientMock);
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_longBuild() throws IOException {
        ClientAction clientAction = new TmDownloadAction(tmIdRepeats, null, null, null, null, false, this.to, filesMock);
        clientAction.act(out, pb, clientMock);

        verify(clientMock).getTm(eq(tmIdRepeats));
        verify(clientMock).startExportingTm(eq(tmIdRepeats), any());
        verify(clientMock).checkExportingTm(eq(tmIdRepeats), eq(exportIdentifier));
        verify(clientMock).downloadTm(eq(tmIdRepeats), eq(exportIdentifier));
        verifyNoMoreInteractions(clientMock);
        verify(filesMock).writeToFile(anyString(), any());
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_throwsFailedToWriteAFile() throws IOException {
        doThrow(IOException.class)
            .when(filesMock)
            .writeToFile(anyString(), any());

        ClientAction clientAction = new TmDownloadAction(tmIdValid, null, null, null, null, false, this.to, filesMock);
        assertThrows(RuntimeException.class, () -> clientAction.act(out, pb, clientMock));

        verify(clientMock).getTm(eq(tmIdValid));
        verify(clientMock).startExportingTm(eq(tmIdValid), any());
        verify(clientMock).downloadTm(eq(tmIdValid), eq(exportIdentifier));
        verifyNoMoreInteractions(clientMock);
        verify(filesMock).writeToFile(anyString(), any());
        verifyNoMoreInteractions(filesMock);
    }

    @Test
    public void test_toIsNull() throws IOException {
        ClientAction clientAction = new TmDownloadAction(tmIdValid, null, null, null, null, false, null, filesMock);
        clientAction.act(out, pb, clientMock);

        verify(clientMock).getTm(eq(tmIdValid));
        verify(clientMock).startExportingTm(eq(tmIdValid), any());
        verify(clientMock).downloadTm(eq(tmIdValid), eq(exportIdentifier));
        verifyNoMoreInteractions(clientMock);
        verify(filesMock).writeToFile(anyString(), any());
        verifyNoMoreInteractions(filesMock);
    }

}
