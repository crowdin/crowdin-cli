package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.labels.model.Label;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

class LabelListActionTest {

    List<Label> standardList = Arrays.asList(new Label(), new Label());
    List<Label> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientLabel clientMock = mock(ClientLabel.class);
    NewAction<ProjectProperties, ClientLabel> action;

    @Test
    public void test_standard() {
        when(clientMock.listLabels())
                .thenReturn(standardList);

        action = new LabelListAction(false, true);
        action.act(out, pb, clientMock);

        verify(clientMock).listLabels();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_notVerbose() {
        when(clientMock.listLabels())
                .thenReturn(standardList);

        action = new LabelListAction(false, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listLabels();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listLabels())
                .thenReturn(emptyList);

        action = new LabelListAction(false, true);
        action.act(out, pb, clientMock);

        verify(clientMock).listLabels();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_notVerbose() {
        when(clientMock.listLabels())
                .thenReturn(emptyList);

        action = new LabelListAction(false, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listLabels();
        verifyNoMoreInteractions(clientMock);
    }
}
