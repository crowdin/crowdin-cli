package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.verify;

public class AppInstallSubcommandTest extends PicocliTestUtils {

    @Test
    public void testAppInstall() {
        var appId = "test-app";
        this.execute(CommandNames.APP, CommandNames.INSTALL, appId);
        verify(actionsMock).installApp(appId);
        this.check(true);
    }
}
