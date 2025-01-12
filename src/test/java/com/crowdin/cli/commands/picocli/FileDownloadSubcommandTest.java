package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class FileDownloadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testFileDownload() {
        this.execute(CommandNames.FILE, CommandNames.FILE_DOWNLOAD, "file.txt");
        verify(actionsMock).fileDownload(any(), any(), false, any());
        this.check(true);
    }

    @Test
    public void testFileDownloadTranslations() {
        this.execute(CommandNames.FILE, CommandNames.FILE_DOWNLOAD, "file.txt", "--language", "uk");
        verify(actionsMock).fileDownloadTranslation(any(), any(), any(), false, any());
        this.check(true);
    }

    @Test
    public void testFileDownloadInvalidOptions() {
        this.executeInvalidParams(CommandNames.FILE, CommandNames.FILE_DOWNLOAD);
    }
}