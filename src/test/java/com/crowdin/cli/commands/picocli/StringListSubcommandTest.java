package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class StringListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testStringList() {
        this.execute(CommandNames.STRING, CommandNames.LIST);
        verify(actionsMock)
            .stringList(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testStringList2() {
        this.execute(CommandNames.STRING, CommandNames.LIST, "--file", "some/path/to/file.txt");
        verify(actionsMock)
            .stringList(anyBoolean(), anyBoolean(), any(), any(), any(), any(), any(), any(), any(), anyBoolean());
        this.check(true);
    }
}
