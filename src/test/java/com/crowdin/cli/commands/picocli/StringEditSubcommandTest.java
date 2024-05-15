package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class StringEditSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStringEdit() {
        this.execute(CommandNames.STRING, CommandNames.STRING_EDIT, "42", "--text", "NeW tExT");
        verify(actionsMock)
            .stringEdit(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testStringEditInvalidOptions() {
        this.executeInvalidParams(CommandNames.STRING, CommandNames.STRING_EDIT);
    }

    @Test
    public void testStringEditInvalidOptions2() {
        this.executeInvalidParams(CommandNames.STRING, CommandNames.STRING_EDIT, "--id", "42", "--identifier", "4242");
    }
}