package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;

import com.crowdin.client.bundles.model.Bundle;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

public class BundleListActionTest {

    List<Bundle> standardList = Arrays.asList(new Bundle(), new Bundle());
    List<Bundle> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientBundle clientMock = mock(ClientBundle.class);
    NewAction<ProjectProperties, ClientBundle> action;

    @Test
    public void test_standard() {
        when(clientMock.listBundle())
            .thenReturn(standardList);

        action = new BundleListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listBundle();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listBundle())
            .thenReturn(standardList);

        action = new BundleListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listBundle();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listBundle())
            .thenReturn(emptyList);

        action = new BundleListAction(false);
        action.act(out, pb, clientMock);

        verify(clientMock).listBundle();
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listBundle())
            .thenReturn(emptyList);

        action = new BundleListAction(true);
        action.act(out, pb, clientMock);

        verify(clientMock).listBundle();
        verifyNoMoreInteractions(clientMock);
    }
}
