package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

public class StatusSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStatus() {
        this.execute(CommandNames.STATUS);
        verify(actionsMock)
            .status(anyBoolean(), any(), any(), anyBoolean(), eq(true), eq(true), anyBoolean());
        this.check(true);
    }
}
