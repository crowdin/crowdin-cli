package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class DownloadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testDownload() {
        this.execute(CommandNames.DOWNLOAD, "--debug");
        verify(actionsMock)
            .download(any(), anyBoolean(), any(), anyBoolean(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testDownloadDryrun() {
        this.execute(CommandNames.DOWNLOAD, "--dryrun");
        verify(actionsMock)
            .listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}
