package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class TmListActionTest {

    List<TranslationMemory> standardList = Arrays.asList(
        new TranslationMemory() {{
                setId(42L);
                setName("42");
            }},
        new TranslationMemory() {{
                setId(43L);
                setName("43");
            }}
    );
    List<TranslationMemory> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesBean pb = PropertiesBeanBuilder
        .minimalBuiltPropertiesBean()
        .build();
    Client clientMock = mock(Client.class);

    @Test
    public void test_standard() {
        when(clientMock.listTms())
            .thenReturn(standardList);

        ClientAction action = new TmListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listTms())
            .thenReturn(standardList);

        ClientAction action = new TmListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listTms())
            .thenReturn(emptyList);

        ClientAction action = new TmListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listTms())
            .thenReturn(emptyList);

        ClientAction action = new TmListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }
}
