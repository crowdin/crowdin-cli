package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class ProjectAddSubcommandTest extends PicocliTestUtils {

    @Test
    public void testProjectAddInvalidOptions() {
        this.executeInvalidParams(CommandNames.PROJECT, CommandNames.ADD);
    }

    @Test
    public void testProjectAdd() {
        this.execute(CommandNames.PROJECT, CommandNames.ADD, "name", "--language", "uk");
        verify(actionsMock).projectAdd(any(), anyBoolean(), any(), any(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
