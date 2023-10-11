package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.labels.model.AddLabelRequest;
import com.crowdin.client.labels.model.Label;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;

import static org.mockito.Mockito.*;

class LabelAddActionTest {

    private static final Long LABEL_ID = 12L;
    private static final String LABEL_TITLE = "label";

    private PropertiesWithFiles pb;
    private ClientLabel client = mock(ClientLabel.class);
    private NewAction<ProjectProperties, ClientLabel> action;

    @Test
    public void testLabelAdd() {
        Label label = new Label();
        label.setTitle(LABEL_TITLE);
        label.setId(LABEL_ID);
        AddLabelRequest request = new AddLabelRequest();
        request.setTitle(LABEL_TITLE);

        when(client.listLabels()).thenReturn(new ArrayList<>());
        when(client.addLabel(request)).thenReturn(label);

        action = new LabelAddAction(LABEL_TITLE, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).listLabels();
        verify(client).addLabel(request);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testAddLabel_alreadyExisting() {
        Label label = new Label();
        label.setTitle(LABEL_TITLE);
        label.setId(LABEL_ID);
        AddLabelRequest request = new AddLabelRequest();
        request.setTitle(LABEL_TITLE);

        when(client.listLabels()).thenReturn(Arrays.asList(label));

        action = new LabelAddAction(LABEL_TITLE, false);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).listLabels();
        verifyNoMoreInteractions(client);
    }
}
