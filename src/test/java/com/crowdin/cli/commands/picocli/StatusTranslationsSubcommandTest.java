package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

public class StatusTranslationsSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStatusTranslations() {
        this.execute(CommandNames.STATUS, CommandNames.STATUS_TRANSLATION);
        verify(actionsMock)
            .status(anyBoolean(), any(), any(), anyBoolean(), eq(true), eq(false), eq(false));
        this.check(true);
    }
}
