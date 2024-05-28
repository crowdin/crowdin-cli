package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

public class ConfigLintSubcommandTest extends PicocliTestUtils {

    @Test
    public void testLint() {
        this.execute(CommandNames.CONFIG, CommandNames.LINT);
        verifyNoMoreInteractions(actionsMock);
    }
}
