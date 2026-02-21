package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;

public class ContextResetSubcommandTest extends PicocliTestUtils {

    @Test
    public void testContextReset() {
        this.execute(CommandNames.CONTEXT, CommandNames.CONTEXT_RESET, "--all");
        verify(actionsMock).contextReset(any(), any(), any(), any(), any(), anyBoolean(), anyInt(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testContextResetInvalid() {
        this.executeInvalidParams(CommandNames.CONTEXT, CommandNames.CONTEXT_RESET);
    }
}
