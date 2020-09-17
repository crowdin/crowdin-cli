package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.client.glossaries.model.AddGlossaryRequest;
import com.crowdin.client.glossaries.model.Glossary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class GlossaryUploadActionTest {

    private static final Long glossaryId = 42L;
    private static final Long glossaryIdNotExist = 41L;
    private static final Long storageId = 52L;
    private static final String glossaryNameUnique = "uniqueGlossary";
    private static final String glossaryNameRepeated = "twoGlossariesWithSameName";
    private static final String glossaryNameNotExist = "notExistentGlossary";
    PropertiesBean pb = PropertiesBeanBuilder
        .minimalBuiltPropertiesBean()
        .setBasePath(".")
        .build();
    File file = new File(getClass().getClassLoader().getResource("file.txt").getFile());
    File fileNotExist = new File("nowhere.txt");

    private Client clientMock;

    @BeforeEach
    public void beforeEach() {
        clientMock = mock(Client.class);

        List<Glossary> glossaries = Arrays.asList(
            new Glossary() {{
                    setId(glossaryId);
                    setName(glossaryNameUnique);
                }},
            new Glossary() {{
                    setId(glossaryId + 1);
                    setName(glossaryNameRepeated);
                }},
            new Glossary() {{
                    setId(glossaryId + 2);
                    setName(glossaryNameRepeated);
                }}
        );
        Glossary glossary = new Glossary() {{
                setId(glossaryId);
                setName("New glossary");
            }};
        when(clientMock.getGlossary(eq(glossaryIdNotExist)))
            .thenReturn(Optional.empty());
        when(clientMock.getGlossary(eq(glossaryId)))
            .thenReturn(Optional.of(glossary));
        when(clientMock.listGlossaries())
            .thenReturn(glossaries);
        when(clientMock.uploadStorage(any(), any()))
            .thenReturn(storageId);
        when(clientMock.addGlossary(any()))
            .thenAnswer((invocationOnMock) -> {
                glossary.setName(((AddGlossaryRequest) invocationOnMock.getArgument(0)).getName());
                return glossary;
            });
    }

    @Test
    public void test_withId() {
        ClientAction action = new GlossaryUploadAction(file, glossaryId, null, null, null);
        action.act(Outputter.getDefault(), pb, clientMock);

        verify(clientMock).getGlossary(eq(glossaryId));
        verify(clientMock).uploadStorage(any(), any());
        verify(clientMock).importGlossary(eq(glossaryId), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_withName() {
        ClientAction action = new GlossaryUploadAction(file, null, glossaryNameUnique, null, null);
        action.act(Outputter.getDefault(), pb, clientMock);

        verify(clientMock).listGlossaries();
        verify(clientMock).uploadStorage(any(), any());
        verify(clientMock).importGlossary(eq(glossaryId), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_noIdentifiers_createNew() {
        ClientAction action = new GlossaryUploadAction(file, null, null, null, null);
        action.act(Outputter.getDefault(), pb, clientMock);

        verify(clientMock).addGlossary(any());
        verify(clientMock).uploadStorage(any(), any());
        verify(clientMock).importGlossary(eq(glossaryId), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_withName_notFound_createNew() {
        ClientAction action = new GlossaryUploadAction(file, null, glossaryNameNotExist, null, null);
        action.act(Outputter.getDefault(), pb, clientMock);

        verify(clientMock).listGlossaries();
        verify(clientMock).addGlossary(any());
        verify(clientMock).uploadStorage(any(), any());
        verify(clientMock).importGlossary(eq(glossaryId), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_withId_throwsNotFound() {
        ClientAction action = new GlossaryUploadAction(file, glossaryIdNotExist, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, clientMock));

        verify(clientMock).getGlossary(eq(glossaryIdNotExist));
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_withName_throwsTooManyWithTargetName() {
        ClientAction action = new GlossaryUploadAction(file, null, glossaryNameRepeated, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, clientMock));

        verify(clientMock).listGlossaries();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_standard_throwsFileNotFound() {
        ClientAction action = new GlossaryUploadAction(fileNotExist, glossaryId, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, clientMock));

        verify(clientMock).getGlossary(eq(glossaryId));
        verifyNoMoreInteractions(clientMock);
    }
}
