package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class FileListSubcommandTest extends PicocliTestUtils {

    @Test
    public void testListProject() {
        this.execute(CommandNames.FILE, CommandNames.LIST);
        verify(actionsMock)
            .listFiles(anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
