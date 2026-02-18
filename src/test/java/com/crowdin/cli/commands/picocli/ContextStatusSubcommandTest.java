package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ContextStatusSubcommandTest extends PicocliTestUtils {

    @Test
    public void testContextStatus() {
        this.execute(CommandNames.CONTEXT, CommandNames.CONTEXT_STATUS);
        verify(actionsMock).contextStatus(any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
