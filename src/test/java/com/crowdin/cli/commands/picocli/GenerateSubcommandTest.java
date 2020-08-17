package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class GenerateSubcommandTest extends PicocliTestUtils {

    @Test
    public void testGenerate() {
        this.execute(CommandNames.GENERATE);
        verify(actionsMock)
            .generate(any(), any(), anyBoolean());
        this.check(false);
    }
}
