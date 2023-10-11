package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientLabel;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.labels.model.Label;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class LabelDeleteActionTest {

    private static final Long LABEL_ID = 12L;
    private static final String LABEL_TITLE = "label";

    private PropertiesWithFiles pb;
    private final ClientLabel client = mock(ClientLabel.class);
    private NewAction<ProjectProperties, ClientLabel> action;

    @Test
    public void testLabelDelete() {
        List<Label> labels = Arrays.asList(new Label() {{ setId(LABEL_ID); setTitle(LABEL_TITLE); }});

        when(client.listLabels()).thenReturn(labels);
        doNothing().when(client).deleteLabel(LABEL_ID);

        action = new LabelDeleteAction(LABEL_TITLE);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).listLabels();
        verify(client).deleteLabel(LABEL_ID);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testLabelDelete_throwsNotFound() {
        List<Label> labels = Arrays.asList(new Label() {{ setId(LABEL_ID); setTitle(LABEL_TITLE); }});

        when(client.listLabels()).thenReturn(labels);
        action = new LabelDeleteAction("not-existing-label");
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).listLabels();
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testLabelDelete_throwsNotFoundInEmptyList() {
        List<Label> labels = new ArrayList<>();

        when(client.listLabels()).thenReturn(labels);
        action = new LabelDeleteAction("not-existing-label");
        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).listLabels();
        verifyNoMoreInteractions(client);
    }
}
