package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ClientScreenshot;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.screenshots.model.Screenshot;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.Mockito.*;

public class ScreenshotDeleteActionTest {

    private static final Long SCREENSHOT_ID = 12L;
    private static final String SCREENSHOT_NAME = "screenshot.jpg";

    private NewAction<ProjectProperties, ClientScreenshot> action;

    @ParameterizedTest
    @MethodSource
    public void testScreenshotDelete(List<Screenshot> screenshots) {
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(Utils.PATH_SEPARATOR);
        PropertiesWithFiles pb = pbBuilder.build();

        ClientScreenshot client = mock(ClientScreenshot.class);

        when(client.listScreenshots(null))
            .thenReturn(screenshots);
        doNothing().when(client).deleteScreenshot(SCREENSHOT_ID);

        action = new ScreenshotDeleteAction(SCREENSHOT_NAME);
        action.act(Outputter.getDefault(), pb, client);

        verify(client).listScreenshots(null);
        verify(client).deleteScreenshot(SCREENSHOT_ID);
        verifyNoMoreInteractions(client);
    }

    public static Stream<Arguments> testScreenshotDelete() {
        return Stream.of(
            arguments(Arrays.asList(
                new Screenshot() {{
                    setName("screenshot1.gif");
                    setId(6L);
                }},
                new Screenshot() {{
                    setName(SCREENSHOT_NAME);
                    setId(SCREENSHOT_ID);
                }}
            ))
        );
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
        doNothing().when(client).deleteScreenshot(SCREENSHOT_ID);

        action = new ScreenshotDeleteAction("not_existing.png");

        assertThrows(RuntimeException.class, () -> action.act(Outputter.getDefault(), pb, client));

        verify(client).listScreenshots(null);
        verifyNoMoreInteractions(client);
    }
}