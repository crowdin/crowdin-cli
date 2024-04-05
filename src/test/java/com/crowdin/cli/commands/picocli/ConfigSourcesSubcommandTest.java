package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class ConfigSourcesSubcommandTest extends PicocliTestUtils {


    @Test
    public void testListSources() {
        this.execute(CommandNames.CONFIG, CommandNames.SOURCES);
        verify(actionsMock)
            .listSources(anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
