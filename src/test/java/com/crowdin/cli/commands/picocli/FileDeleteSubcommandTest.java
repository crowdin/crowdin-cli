package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class FileDeleteSubcommandTest extends PicocliTestUtils {

    @Test
    public void testFileDelete() {
        this.execute(CommandNames.FILE, CommandNames.FILE_DELETE, "file.txt");
        verify(actionsMock).fileDelete(any());
        this.check(true);
    }

    @Test
    public void testFileDeleteInvalidOptions() {
        this.executeInvalidParams(CommandNames.FILE, CommandNames.FILE_DELETE);
    }
}