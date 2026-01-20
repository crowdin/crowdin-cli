package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import java.net.URISyntaxException;
import java.nio.file.Path;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

class FileUploadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testFileUpload() throws URISyntaxException {
        var file = Path.of(this.getClass().getClassLoader().getResource("file.txt").toURI()).toFile();
        this.execute(CommandNames.FILE, CommandNames.FILE_UPLOAD, file.getAbsolutePath());
        verify(actionsMock).fileUpload(any(), any(), anyBoolean(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testFileUploadTranslations() throws URISyntaxException {
        var file = Path.of(this.getClass().getClassLoader().getResource("file.txt").toURI()).toFile();
        this.execute(CommandNames.FILE, CommandNames.FILE_UPLOAD, file.getAbsolutePath(), "--language", "uk");
        verify(actionsMock).fileUploadTranslation(any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testFileUploadInvalidOptions() {
        this.executeInvalidParams(CommandNames.FILE, CommandNames.FILE_UPLOAD);
    }
}