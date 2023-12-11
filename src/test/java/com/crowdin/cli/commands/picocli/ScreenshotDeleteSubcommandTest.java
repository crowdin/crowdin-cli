package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

public class ScreenshotDeleteSubcommandTest extends PicocliTestUtils {

    @Test
    public void testScreenshotDelete() {
        this.execute(CommandNames.SCREENSHOT, CommandNames.SCREENSHOT_DELETE, "screenshot.png");
        verify(actionsMock).screenshotDelete(any());
        this.check(true);
    }

    @Test
    public void testScreenshotDeleteInvalidOptions() {
        this.executeInvalidParams(CommandNames.SCREENSHOT, CommandNames.SCREENSHOT_DELETE);
    }
}
