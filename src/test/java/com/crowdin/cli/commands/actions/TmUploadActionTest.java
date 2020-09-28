package com.crowdin.cli.commands.actions;

import com.crowdin.cli.MockitoUtils;
import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class TmUploadActionTest {

    private final Long tmIdExists = 42L;
    private final Long tmIdNotExists = 43L;
    private final Long tmIdRepeats = 44L;
    private final String tmNameExists = "42";
    private final String tmNameNotExists = "43";
    private final String tmNameRepeats = "44";
    private final Long storageId = 52L;

    private final Outputter out = Outputter.getDefault();
    private final PropertiesBean pb = PropertiesBeanBuilder
        .minimalBuiltPropertiesBean()
        .build();
    private final Client clientMock = mock(Client.class);
    private final File file = MockitoUtils.getResourceFile("file.tmx", this.getClass());

    @BeforeEach
    public void beforeEach() {
        TranslationMemory tmExists = new TranslationMemory() {{
                setId(tmIdExists);
                setName(tmNameExists);
            }};
        TranslationMemory tmRepeats = new TranslationMemory() {{
                setId(tmIdRepeats);
                setName(tmNameRepeats);
            }};
        TranslationMemory tmNew = new TranslationMemory() {{
                setId(tmIdNotExists);
                setName(tmNameNotExists);
            }};
//        client.getTm()
        when(clientMock.getTm(eq(tmIdExists)))
            .thenReturn(Optional.of(tmExists));
        when(clientMock.getTm(eq(tmIdNotExists)))
            .thenReturn(Optional.empty());
//        client.listTms()
        when(clientMock.listTms())
            .thenReturn(Arrays.asList(tmExists, tmRepeats, tmRepeats));
//        client.addTm()
        when(clientMock.addTm(any()))
            .thenReturn(tmNew);
//        client.uploadStorage()
        when(clientMock.uploadStorage(anyString(), any()))
            .thenReturn(storageId);
    }

    @Test
    public void test_findById() {
        ClientAction action = new TmUploadAction(file, tmIdExists, null, null, null);
        action.act(out, pb, clientMock);

        verify(clientMock).getTm(eq(tmIdExists));
        verify(clientMock).uploadStorage(anyString(), any());
        verify(clientMock).importTm(eq(tmIdExists), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_findById_throwsNotExists() {
        ClientAction action = new TmUploadAction(file, tmIdNotExists, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(out, pb, clientMock));

        verify(clientMock).getTm(eq(tmIdNotExists));
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_findByName() {
        ClientAction action = new TmUploadAction(file, null, tmNameExists, null, null);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verify(clientMock).uploadStorage(anyString(), any());
        verify(clientMock).importTm(eq(tmIdExists), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_findByName_notExists() {
        ClientAction action = new TmUploadAction(file, null, tmNameNotExists, null, null);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verify(clientMock).addTm(any());
        verify(clientMock).uploadStorage(anyString(), any());
        verify(clientMock).importTm(eq(tmIdNotExists), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_findByName_throwsToManyTms() {
        ClientAction action = new TmUploadAction(file, null, tmNameRepeats, null, null);
        assertThrows(RuntimeException.class, () -> action.act(out, pb, clientMock));

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_noIdentifiers() {
        ClientAction action = new TmUploadAction(file, null, null, null, null);
        action.act(out, pb, clientMock);

        verify(clientMock).addTm(any());
        verify(clientMock).uploadStorage(anyString(), any());
        verify(clientMock).importTm(eq(tmIdNotExists), any());
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_throwsUploadStorage() {
        when(clientMock.uploadStorage(anyString(), any()))
            .thenThrow(new RuntimeException());
        ClientAction action = new TmUploadAction(file, tmIdExists, null, null, null);
        assertThrows(RuntimeException.class, () -> action.act(out, pb, clientMock));

        verify(clientMock).getTm(eq(tmIdExists));
        verify(clientMock).uploadStorage(anyString(), any());
        verifyNoMoreInteractions(clientMock);
    }

}
