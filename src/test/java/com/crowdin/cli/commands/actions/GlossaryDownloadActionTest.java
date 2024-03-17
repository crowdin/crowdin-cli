package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class GlossaryDownloadActionTest {

    private static final Long glossaryId = 42L;
    private static final String glossaryName = "FirstName";
    private static final String exportId = "52";
    private final BaseProperties pb = NewPropertiesWithFilesUtilBuilder
        .minimalBuiltPropertiesBean()
        .setBasePath(".")
        .build();
    Outputter outputter = Outputter.getDefault();

    @Test
    public void test_findById() throws IOException {
        FilesInterface filesMock = mock(FilesInterface.class);
        ClientGlossary clientMock = mock(ClientGlossary.class);
        File to = new File("nowhere.tbx");
        GlossariesFormat format = GlossariesFormat.TBX;

        Optional<Glossary> targetGlossary = Optional.of(new Glossary() {{
                setId(glossaryId);
                setName(glossaryName);
            }}
        );
        GlossaryExportStatus buildingGlossary1 = new GlossaryExportStatus() {{
                setIdentifier(exportId);
                setStatus("Is building");
            }};
        GlossaryExportStatus buildingGlossary2 = new GlossaryExportStatus() {{
                setIdentifier(exportId);
                setStatus("Finished");
            }};

        when(clientMock.getGlossary(eq(glossaryId)))
            .thenReturn(targetGlossary);
        when(clientMock.startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format))))
            .thenReturn(buildingGlossary1);
        when(clientMock.checkExportingGlossary(eq(glossaryId), eq(exportId)))
            .thenReturn(buildingGlossary2);
        when(clientMock.downloadGlossary(eq(glossaryId), eq(exportId)))
            .thenReturn(MockitoUtils.getMockUrl(getClass()));

        NewAction<BaseProperties, ClientGlossary> action = new GlossaryDownloadAction(glossaryId, format, true, to, filesMock);
        action.act(outputter, pb, clientMock);

        verify(filesMock).writeToFile(eq("nowhere.tbx"), any());
        verifyNoMoreInteractions(filesMock);
        verify(clientMock).getGlossary(eq(glossaryId));
        verify(clientMock).startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format)));
        verify(clientMock).startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format)));
        verify(clientMock).checkExportingGlossary(eq(glossaryId), eq(exportId));
        verify(clientMock).downloadGlossary(eq(glossaryId), eq(exportId));
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_throwsNoIdentifiers() {
        FilesInterface filesMock = mock(FilesInterface.class);
        ClientGlossary clientMock = mock(ClientGlossary.class);

        NewAction<BaseProperties, ClientGlossary> action = new GlossaryDownloadAction(null, null, true, null, filesMock);
        assertThrows(RuntimeException.class, () -> action.act(outputter, pb, clientMock));

        verify(clientMock).getGlossary(any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_throwsWhenWriteToFile() throws IOException {
        FilesInterface filesMock = mock(FilesInterface.class);
        ClientGlossary clientMock = mock(ClientGlossary.class);
        File to = new File("nowhere.tbx");
        GlossariesFormat format = GlossariesFormat.TBX;

        Optional<Glossary> targetGlossary = Optional.of(new Glossary() {{
                setId(glossaryId);
                setName(glossaryName);
            }}
        );
        GlossaryExportStatus buildingGlossary1 = new GlossaryExportStatus() {{
                setIdentifier(exportId);
                setStatus("Is building");
            }};
        GlossaryExportStatus buildingGlossary2 = new GlossaryExportStatus() {{
                setIdentifier(exportId);
                setStatus("Finished");
            }};

        doThrow(IOException.class)
            .when(filesMock)
            .writeToFile(any(), any());

        when(clientMock.getGlossary(eq(glossaryId)))
            .thenReturn(targetGlossary);
        when(clientMock.startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format))))
            .thenReturn(buildingGlossary1);
        when(clientMock.checkExportingGlossary(eq(glossaryId), eq(exportId)))
            .thenReturn(buildingGlossary2);
        when(clientMock.downloadGlossary(eq(glossaryId), eq(exportId)))
            .thenReturn(MockitoUtils.getMockUrl(getClass()));

        NewAction<BaseProperties, ClientGlossary> action = new GlossaryDownloadAction(glossaryId, format, true, to, filesMock);
        assertThrows(RuntimeException.class, () -> action.act(outputter, pb, clientMock));

        verify(filesMock).writeToFile(eq("nowhere.tbx"), any());
        verifyNoMoreInteractions(filesMock);
        verify(clientMock).getGlossary(eq(glossaryId));
        verify(clientMock).startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format)));
        verify(clientMock).startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format)));
        verify(clientMock).checkExportingGlossary(eq(glossaryId), eq(exportId));
        verify(clientMock).downloadGlossary(eq(glossaryId), eq(exportId));
        verifyNoMoreInteractions(clientMock);
    }
}
