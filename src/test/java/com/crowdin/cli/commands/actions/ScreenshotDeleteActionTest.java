package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

public class ScreenshotDeleteActionTest {

    private static final Long SCREENSHOT_ID = 12L;
    private NewAction<ProjectProperties, ClientScreenshot> action;

    @Test
    public void testScreenshotDelete() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);

        doNothing().when(client).deleteScreenshot(SCREENSHOT_ID);

        action = new ScreenshotDeleteAction(SCREENSHOT_ID);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).deleteScreenshot(SCREENSHOT_ID);
        verifyNoMoreInteractions(client);
    }

    @Test
    public void testScreenshotDelete_throwsNotFound() {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
                .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);

        when(client.listScreenshots(null))
                .thenReturn(new ArrayList<>());
        doThrow(new RuntimeException("Not found")).when(client).deleteScreenshot(SCREENSHOT_ID);

        action = new ScreenshotDeleteAction(SCREENSHOT_ID);

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).deleteScreenshot(SCREENSHOT_ID);
        verifyNoMoreInteractions(client);
    }
}