package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class StringAddSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStringAdd() {
        this.execute(CommandNames.STRING, CommandNames.STRING_ADD, "\"Text\"", "--debug");
        verify(actionsMock)
            .stringAdd(anyBoolean(), any(), any(), any(), any(), any(), any());
        this.check(true);
    }

    @Test
    public void testStringAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.STRING, CommandNames.STRING_ADD, "\"Text\"", "--max-length", "-100");
    }

    @Test
    public void testStringAdd2() {
        this.execute(CommandNames.STRING, CommandNames.STRING_ADD, "\"Text\"", "--file", "path/to/file.txt");
        verify(actionsMock)
            .stringAdd(anyBoolean(), any(), any(), any(), any(), any(), any());
        this.check(true);
    }
}
