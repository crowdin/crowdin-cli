package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class UploadSourcesCommandTest extends PicocliTestUtils {

    @Test
    public void testUploadSources() {
        this.execute(CommandNames.UPLOAD);
        verify(actionsMock)
            .uploadSources(any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testUploadSourcesDryrun() {
        this.execute(CommandNames.UPLOAD, "--dryrun");
        verify(actionsMock)
            .listSources(anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}