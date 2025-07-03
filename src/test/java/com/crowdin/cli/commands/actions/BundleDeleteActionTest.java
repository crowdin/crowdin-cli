package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.bundles.model.Bundle;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.*;

class BundleDeleteActionTest {

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientBundle clientMock = mock(ClientBundle.class);
    NewAction<ProjectProperties, ClientBundle> action;

    @Test
    public void test_deleteBundle() {
        when(clientMock.getBundle(1L)).thenReturn(new Bundle());
        action = new BundleDeleteAction(1L);
        action.act(out, pb, clientMock);

        verify(clientMock).deleteBundle(1L);
        verify(clientMock).getBundle(1L);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_deleteBundle_notFound() {
        when(clientMock.getBundle(1L))
            .thenReturn(null);

        action = new BundleDeleteAction(1L);
        action.act(out, pb, clientMock);

        verify(clientMock).getBundle(1L);
        verifyNoMoreInteractions(clientMock);
    }
}