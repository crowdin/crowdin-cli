package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.verify;

public class CheckNewVersionSubcommandTest extends PicocliTestUtils {

    @Test
    public void testCheckNewVersion() {
        this.execute(CommandNames.CHECK_NEW_VERSION);
        verify(actionsMock).checkNewVersion();
        this.check(false);
    }
}
