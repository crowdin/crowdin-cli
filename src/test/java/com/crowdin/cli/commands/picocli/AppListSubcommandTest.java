package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class AppListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testAppList() {
        this.execute(CommandNames.APP, CommandNames.LIST);
        verify(actionsMock).listApps(anyBoolean());
        this.check(true);
    }
}
