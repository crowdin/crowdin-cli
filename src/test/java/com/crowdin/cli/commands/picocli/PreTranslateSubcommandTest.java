package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class PreTranslateSubcommandTest extends PicocliTestUtils {

    @Test
    public void testPreTranslate() {
        this.execute(CommandNames.PRE_TRANSLATE, "--method", "TM");
        verify(actionsMock)
            .preTranslate(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), any(), any(), anyBoolean());
        this.check(true);
    }
}
