package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ScreenshotListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testScreenshotList() {
        this.execute(CommandNames.SCREENSHOT, CommandNames.LIST);
        verify(actionsMock).screenshotList(any(), anyBoolean());
        this.check(true);
    }
}
