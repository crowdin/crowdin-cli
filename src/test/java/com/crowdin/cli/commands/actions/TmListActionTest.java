package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.cli.properties.NewBasePropertiesUtilBuilder;
import com.crowdin.client.translationmemory.model.TranslationMemory;
import org.junit.jupiter.api.Test;

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
    BaseProperties pb = NewBasePropertiesUtilBuilder
        .minimalBuilt()
        .build();
    ClientTm clientMock = mock(ClientTm.class);
    NewAction<BaseProperties, ClientTm> action;

    @Test
    public void test_standard() {
        when(clientMock.listTms())
            .thenReturn(standardList);

        action = new TmListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listTms())
            .thenReturn(standardList);

        action = new TmListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listTms())
            .thenReturn(emptyList);

        action = new TmListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listTms())
            .thenReturn(emptyList);

        action = new TmListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listTms();
        verifyNoMoreInteractions(clientMock);
    }
}
