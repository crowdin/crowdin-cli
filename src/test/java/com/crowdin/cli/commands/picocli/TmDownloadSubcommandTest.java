package com.crowdin.cli.commands.picocli;

import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

public class TmDownloadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testGlossaryDownload() {
        this.execute(CommandNames.TM, CommandNames.TM_DOWNLOAD, "--id", "42", "--debug");
        verify(actionsMock)
            .tmDownload(eq(42L), isNull(), isNull(), isNull(), isNull(), eq(false), isNull(), any());
        this.check(true);
    }

    @Test
    public void testGlossaryDownload_withExt() {
        this.execute(CommandNames.TM, CommandNames.TM_DOWNLOAD, "--id", "42", "--debug", "--to", "file.tmx");
        verify(actionsMock)
            .tmDownload(eq(42L), isNull(), eq(TranslationMemoryFormat.TMX), isNull(), isNull(), eq(false), any(), any());
        this.check(true);
    }

    @Test
    public void testGlossaryDownload_withExt_throwsWrongExt() {
        this.executeInvalidParams(CommandNames.TM, CommandNames.TM_DOWNLOAD, "--id", "42", "--debug", "--to", "file.tbx");
    }

    @Test
    public void testGlossaryDownload_throwsBothIdentifiers() {
        this.executeInvalidParams(CommandNames.TM, CommandNames.TM_DOWNLOAD, "--id", "42", "--debug", "--name", "naaame");
    }

    @Test
    public void testGlossaryDownload_throwsNoIdentifiers() {
        this.executeInvalidParams(CommandNames.TM, CommandNames.TM_DOWNLOAD, "--debug");
    }
}
