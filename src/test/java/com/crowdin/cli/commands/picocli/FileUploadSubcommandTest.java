package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class FileUploadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testFileUpload() {
        this.execute(CommandNames.FILE, CommandNames.FILE_UPLOAD, "file.txt");
        verify(actionsMock).fileUpload(any(), any(), anyBoolean(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testFileUploadTranslations() {
        this.execute(CommandNames.FILE, CommandNames.FILE_UPLOAD, "file.txt", "--language", "uk");
        verify(actionsMock).fileUploadTranslation(any(), any(), any(), any(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testFileUploadInvalidOptions() {
        this.executeInvalidParams(CommandNames.FILE, CommandNames.FILE_UPLOAD);
    }
}