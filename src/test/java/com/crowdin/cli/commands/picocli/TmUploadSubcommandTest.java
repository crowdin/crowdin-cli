package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;

public class TmUploadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testTmUpload() {
        this.execute(CommandNames.TM, CommandNames.TM_UPLOAD, "file.tmx", "--id", "42", "--debug");
        verify(actionsMock)
            .tmUpload(any(), eq(42L), isNull(), isNull(), isNull(), anyBoolean());
        this.check(true);
    }

    @Test
    public void testTmUpload_throwsNoSchemeForCsv() {
        this.executeInvalidParams(CommandNames.TM, CommandNames.TM_UPLOAD, "file.csv", "--id", "42", "--debug");
    }

    @Test
    public void testTmUpload_throwsFileHasWrongFormat() {
        this.executeInvalidParams(CommandNames.TM, CommandNames.TM_UPLOAD, "file.tbx", "--id", "42", "--debug");
    }
}
