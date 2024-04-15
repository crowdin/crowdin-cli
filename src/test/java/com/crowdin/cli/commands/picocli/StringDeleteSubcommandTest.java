package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class StringDeleteSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStringDelete() {
        this.execute(CommandNames.STRING, CommandNames.STRING_DELETE, "42");
        verify(actionsMock)
            .stringDelete(any());
        this.check(true);
    }

    @Test
    public void testStringDeleteInvalidOptions() {
        this.executeInvalidParams(CommandNames.STRING, CommandNames.STRING_DELETE);
    }
}
