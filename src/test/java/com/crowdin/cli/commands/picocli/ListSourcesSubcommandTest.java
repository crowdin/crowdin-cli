package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ListSourcesSubcommandTest extends PicocliTestUtils {


    @Test
    public void testListSources() {
        this.execute(CommandNames.LIST, CommandNames.LIST_SOURCES);
        verify(actionsMock)
            .listSources(anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
