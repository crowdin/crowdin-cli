package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ListProjectSubcommandTest extends PicocliTestUtils {

    @Test
    public void testListProject() {
        this.execute(CommandNames.LIST, CommandNames.LIST_PROJECT);
        verify(actionsMock)
            .listProject(anyBoolean(), any(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
