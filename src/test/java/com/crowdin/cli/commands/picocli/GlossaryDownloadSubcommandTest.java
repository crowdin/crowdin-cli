package com.crowdin.cli.commands.picocli;

import com.crowdin.client.glossaries.model.GlossariesFormat;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

public class GlossaryDownloadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testGlossaryDownload() {
        this.execute(CommandNames.GLOSSARY, CommandNames.GLOSSARY_DOWNLOAD, "42", "--debug");
        verify(actionsMock)
            .glossaryDownload(eq(42L), isNull(), anyBoolean(), isNull(), any());
        this.check(true);
    }

    @Test
    public void testGlossaryDownload_fileWithExt() {
        this.execute(CommandNames.GLOSSARY, CommandNames.GLOSSARY_DOWNLOAD, "42", "--debug", "--to", "file.tbx");
        verify(actionsMock)
            .glossaryDownload(eq(42L), eq(GlossariesFormat.TBX), anyBoolean(), any(), any());
        this.check(true);
    }

    @Test
    public void testGlossaryDownload_invalid_fileWithWrongExt() {
        this.executeInvalidParams(CommandNames.GLOSSARY, CommandNames.GLOSSARY_DOWNLOAD, "42", "--debug", "--to", "file.txt");
    }

    @Test
    public void testGlossaryDownload_invalid_noIdentifiers() {
        this.executeInvalidParams(CommandNames.GLOSSARY, CommandNames.GLOSSARY_DOWNLOAD, "--debug");
    }
}
