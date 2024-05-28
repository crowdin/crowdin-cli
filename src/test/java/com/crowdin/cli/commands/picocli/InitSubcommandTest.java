package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class InitSubcommandTest extends PicocliTestUtils {

    @Test
    public void testGenerate() {
        this.execute(CommandNames.INIT);
        verify(actionsMock)
            .generate(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
        this.check(false);
    }
}
