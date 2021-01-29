package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import javax.annotation.CheckReturnValue;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;

public class UploadTranslationsSubcommandTest extends PicocliTestUtils {

    @Test
    public void testUploadTranslations() {
        this.execute(CommandNames.UPLOAD, CommandNames.UPLOAD_TRANSLATIONS);
        verify(actionsMock)
            .uploadTranslations(anyBoolean(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testUploadTranslationsDryrun() {
        this.execute(CommandNames.UPLOAD, CommandNames.UPLOAD_TRANSLATIONS, "--dryrun");
        verify(actionsMock)
            .listTranslations(anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean(), anyBoolean());
        this.check(true);
    }
}