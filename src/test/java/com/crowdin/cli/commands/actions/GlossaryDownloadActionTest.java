package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import com.crowdin.client.glossaries.model.Glossary;
import com.crowdin.client.glossaries.model.GlossaryExportStatus;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
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
    private static final Long glossaryId2 = 43L;
    private static final String glossaryName = "FirstName";
    private static final String glossaryName2 = "SecondName";
    private static final String exportId = "52";
    private final PropertiesBean pb = PropertiesBeanBuilder
        .minimalBuiltPropertiesBean()
        .setBasePath(".")
        .build();
    Outputter outputter = Outputter.getDefault();

    @Test
    public void test_findById() throws IOException {
        FilesInterface filesMock = mock(FilesInterface.class);
        Client clientMock = mock(Client.class);
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

        ClientAction action = new GlossaryDownloadAction(glossaryId, null, format, true, to, filesMock);
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
    public void test_findByName() throws IOException {
        FilesInterface filesMock = mock(FilesInterface.class);
        Client clientMock = mock(Client.class);
        GlossariesFormat format = GlossariesFormat.TBX;

        List<Glossary> glossaries = Arrays.asList(
            new Glossary() {{
                    setId(glossaryId);
                    setName(glossaryName);
                }},
            new Glossary() {{
                    setId(glossaryId2);
                    setName(glossaryName2);
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

        when(clientMock.listGlossaries())
            .thenReturn(glossaries);
        when(clientMock.startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format))))
            .thenReturn(buildingGlossary1);
        when(clientMock.checkExportingGlossary(eq(glossaryId), eq(exportId)))
            .thenReturn(buildingGlossary2);
        when(clientMock.downloadGlossary(eq(glossaryId), eq(exportId)))
            .thenReturn(MockitoUtils.getMockUrl(getClass()));

        ClientAction action = new GlossaryDownloadAction(null, glossaryName, format, true, null, filesMock);
        action.act(outputter, pb, clientMock);

        verify(filesMock).writeToFile(eq(glossaryName + ".tbx"), any());
        verifyNoMoreInteractions(filesMock);
        verify(clientMock).listGlossaries();
        verify(clientMock).startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format)));
        verify(clientMock).startExportingGlossary(eq(glossaryId), eq(RequestBuilder.exportGlossary(format)));
        verify(clientMock).checkExportingGlossary(eq(glossaryId), eq(exportId));
        verify(clientMock).downloadGlossary(eq(glossaryId), eq(exportId));
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_findByName_throwsNoGlossaries() {
        FilesInterface filesMock = mock(FilesInterface.class);
        Client clientMock = mock(Client.class);

        List<Glossary> glossaries = Arrays.asList(
            new Glossary() {{
                    setId(glossaryId);
                    setName(glossaryName2);
                }},
            new Glossary() {{
                    setId(glossaryId2);
                    setName(glossaryName2);
                }}
        );

        when(clientMock.listGlossaries())
            .thenReturn(glossaries);

        ClientAction action = new GlossaryDownloadAction(null, glossaryName, null, true, null, filesMock);
        assertThrows(RuntimeException.class, () -> action.act(outputter, pb, clientMock));

        verify(clientMock).listGlossaries();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_findByName_throwsTooManyGlossaries() {
        FilesInterface filesMock = mock(FilesInterface.class);
        Client clientMock = mock(Client.class);

        List<Glossary> glossaries = Arrays.asList(
            new Glossary() {{
                    setId(glossaryId);
                    setName(glossaryName);
                }},
            new Glossary() {{
                    setId(glossaryId2);
                    setName(glossaryName);
                }}
        );

        when(clientMock.listGlossaries())
            .thenReturn(glossaries);

        ClientAction action = new GlossaryDownloadAction(null, glossaryName, null, true, null, filesMock);
        assertThrows(RuntimeException.class, () -> action.act(outputter, pb, clientMock));

        verify(clientMock).listGlossaries();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_throwsNoIdentifiers() {
        FilesInterface filesMock = mock(FilesInterface.class);
        Client clientMock = mock(Client.class);

        ClientAction action = new GlossaryDownloadAction(null, null, null, true, null, filesMock);
        assertThrows(RuntimeException.class, () -> action.act(outputter, pb, clientMock));

        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_throwsWhenWriteToFile() throws IOException {
        FilesInterface filesMock = mock(FilesInterface.class);
        Client clientMock = mock(Client.class);
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

        ClientAction action = new GlossaryDownloadAction(glossaryId, null, format, true, to, filesMock);
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
