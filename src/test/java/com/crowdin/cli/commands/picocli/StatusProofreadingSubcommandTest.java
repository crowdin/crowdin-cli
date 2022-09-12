package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

public class StatusProofreadingSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStatusProofreading() {
        this.execute(CommandNames.STATUS, CommandNames.STATUS_PROOFREADING);
        verify(actionsMock)
            .status(anyBoolean(), any(), any(), anyBoolean(), eq(false), eq(true), eq(false));
        this.check(true);
    }
}
