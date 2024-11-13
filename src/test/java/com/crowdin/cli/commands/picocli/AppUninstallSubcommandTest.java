package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class AppUninstallSubcommandTest extends PicocliTestUtils {

    @Test
    public void testAppUninstall() {
        var appId = "test-app";
        this.execute(CommandNames.APP, CommandNames.UNINSTALL, appId);
        verify(actionsMock).uninstallApp(appId, false);
        this.check(true);
    }

    @Test
    public void testAppUninstallForce() {
        var appId = "test-app";
        this.execute(CommandNames.APP, CommandNames.UNINSTALL, appId, "--force");
        verify(actionsMock).uninstallApp(appId, true);
        this.check(true);
    }
}
