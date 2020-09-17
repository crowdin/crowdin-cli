package com.crowdin.cli.commands.picocli;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

public class GlossaryUploadSubcommandTest extends PicocliTestUtils {

    @Test
    public void testGlossaryUpload() {
        this.execute(CommandNames.GLOSSARY, CommandNames.GLOSSARY_UPLOAD, getClass().getClassLoader().getResource("file.csv").getFile());
        verify(actionsMock)
            .glossaryUpload(any(), any(), any(), any(), any());
        check(true);
    }

    @Test
    public void testGlossaryUpload_invalid_fileNotExists() {
        this.executeInvalidParams(CommandNames.GLOSSARY, CommandNames.GLOSSARY_UPLOAD, "file.not.exist");
    }

    @Test
    public void testGlossaryUpload_invalid_fileWrongExt() {
        this.executeInvalidParams(CommandNames.GLOSSARY, CommandNames.GLOSSARY_UPLOAD,
            getClass().getClassLoader().getResource("file.txt").getFile());
    }

    @Test
    public void testGlossaryUpload_invalid_tbxFileWithScheme() {
        this.executeInvalidParams(CommandNames.GLOSSARY, CommandNames.GLOSSARY_UPLOAD,
            getClass().getClassLoader().getResource("file.tbx").getFile(), "--scheme", "one=1");
    }

    @Test
    public void testGlossaryUpload_invalid_bothIdentifiers() {
        this.executeInvalidParams(CommandNames.GLOSSARY, CommandNames.GLOSSARY_UPLOAD,
            getClass().getClassLoader().getResource("file.txt").getFile(), "--id", "42", "--name", "forty-two");
    }
}
