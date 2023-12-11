package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.screenshots.model.Screenshot;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;

public class ScreenshotListActionTest {
    List<Screenshot> standardList = Arrays.asList(new Screenshot(), new Screenshot());
    List<Screenshot> emptyList = Collections.emptyList();

    Outputter out = Outputter.getDefault();
    PropertiesWithFiles pb;

    ClientScreenshot clientMock = mock(ClientScreenshot.class);
    NewAction<ProjectProperties, ClientScreenshot> action;

    @Test
    public void test_standard() {
        when(clientMock.listScreenshots(any())).thenReturn(standardList);

        action = new ScreenshotListAction(null, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listScreenshots(null);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_stringId() {
        when(clientMock.listScreenshots(12L)).thenReturn(standardList);

        action = new ScreenshotListAction(12L, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listScreenshots(12L);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_plainView() {
        when(clientMock.listScreenshots(null))
            .thenReturn(standardList);

        action = new ScreenshotListAction(null, true);
        action.act(out, pb, clientMock);

        verify(clientMock).listScreenshots(null);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList() {
        when(clientMock.listScreenshots(null))
            .thenReturn(emptyList);

        action = new ScreenshotListAction(null, false);
        action.act(out, pb, clientMock);

        verify(clientMock).listScreenshots(null);
        verifyNoMoreInteractions(clientMock);
    }

    @Test
    public void test_emptyList_plainView() {
        when(clientMock.listScreenshots(null))
            .thenReturn(emptyList);

        action = new ScreenshotListAction(null, true);
        action.act(out, pb, clientMock);

        verify(clientMock).listScreenshots(null);
        verifyNoMoreInteractions(clientMock);
    }
}